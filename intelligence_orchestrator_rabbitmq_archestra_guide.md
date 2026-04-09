# Intelligence Orchestrator + RabbitMQ Pipeline + Archestra MCP Gateway

## 1. Mục tiêu tài liệu

Tài liệu này chốt kiến trúc triển khai cho luồng:

```text
Request
→ workflow_runs
→ planner tạo workflow_tasks
→ publish RabbitMQ
→ agent consume
→ agent gọi Archestra tools
→ ghi tool_call_logs + source_records + observations/assertions/signals
→ orchestrator aggregate
→ scoring
```

Mục tiêu:

- Xây **Intelligence Orchestrator** theo kiểu **deterministic, workflow-first, state-machine based, DB-driven**.
- Dùng **RabbitMQ** như lớp **agent queue pipeline** với **retry + DLQ + envelope chuẩn hóa**.
- Xây **Agent Workers** theo hướng **bounded-task agents**, không để agent quá tự do.
- Dùng **Archestra** làm **MCP Gateway** để Agent gọi tools/resources/prompts một cách chuẩn hóa.
- Áp **Guardrails** rõ ràng: auth/workspace boundary, tool policy, timeout/budget, confidence threshold, visibility constraint, idempotency.
- Giữ **DB lõi** là source of truth; mọi kết quả AI đều phải persist về DB lõi.

---

## 2. Triết lý thiết kế

### 2.1 Intelligence Orchestrator phải là gì?

Orchestrator trong hệ này **không phải agent tự do**. Nó là **bộ máy điều phối workflow deterministic**.

Nó phải:

- nhận request từ API hoặc system event
- tạo `workflow_runs`
- chạy planner theo rules cố định
- sinh `workflow_tasks`
- publish task sang RabbitMQ
- chờ kết quả / retry / timeout
- aggregate output
- scoring / confidence check
- kết luận workflow run thành công, thất bại, hoặc cần manual review

### 2.2 RabbitMQ phải là gì?

RabbitMQ là **execution backbone** cho tasks bất đồng bộ.

Nó phải:

- nhận task đã chuẩn hóa
- route task đến đúng agent queue
- retry rõ ràng
- DLQ rõ ràng
- đảm bảo idempotent processing
- không chứa business state; business state nằm ở DB

### 2.3 Agent Workers phải là gì?

Agent worker **không phải agent kiểu muốn làm gì thì làm**.

Agent worker phải:

- nhận task rõ scope
- gọi đúng loại tool được phép
- xử lý đúng một bounded task
- ghi output về DB
- trả execution result chuẩn hóa

Ví dụ đúng:

- `spend-analysis-agent`
- `budget-forecast-agent`
- `recommendation-agent`
- `crm-payment-behavior-agent`

Ví dụ chưa nên làm:

- `super-agent` biết làm mọi thứ

### 2.4 Archestra đóng vai trò gì?

Archestra là **MCP Gateway / Registry / Control Plane**, không phải broker, không phải DB, không phải orchestrator chính.

Trong kiến trúc này, Archestra dùng để:

- quản lý MCP servers
- cung cấp unified access point cho agents
- quản lý credentials / policy / observability
- chuẩn hóa tools/resources/prompts

Agent gọi tool **thông qua Archestra** thay vì gọi lung tung trực tiếp.

---

## 3. Kiến trúc tổng thể

```text
Frontend / API Request / Scheduled Trigger
   ↓
NestJS Core Backend
   ↓
Intelligence Orchestrator
   ├── workflow_runs
   ├── workflow_tasks
   ├── planner
   ├── dispatcher
   ├── aggregator
   └── scorer
   ↓
RabbitMQ
   ├── agent.finance.analysis.queue
   ├── agent.finance.forecast.queue
   ├── agent.finance.recommendation.queue
   ├── agent.crm.payment_behavior.queue
   ├── retry queues
   └── DLQ queues
   ↓
Python Agent Workers
   ├── bounded-task handler
   ├── Archestra MCP client
   ├── guardrails executor
   └── result writer
   ↓
Archestra MCP Gateway
   ├── Finance MCP Server
   ├── CRM MCP Server
   ├── Knowledge MCP Server
   └── Reporting MCP Server
   ↓
DB lõi PostgreSQL
   ├── workflow_runs
   ├── workflow_tasks
   ├── tool_call_logs
   ├── source_records
   ├── observations
   ├── assertions
   ├── signals
   ├── ai_analysis_results
   └── core business tables
```

---

## 4. Use case gốc cho Finance

### 4.1 Ví dụ request

User mở dashboard hoặc trigger API:

```text
Analyze finance health for workspace X in month 2026-04
```

### 4.2 Luồng xử lý đúng

```text
1. API nhận request
2. Orchestrator tạo workflow_run
3. Planner sinh workflow_tasks
   - load budget snapshot
   - analyze spending
   - forecast budget
   - generate recommendation
4. Dispatcher publish từng task lên RabbitMQ
5. Agent worker consume task
6. Agent gọi tools qua Archestra
7. Agent ghi tool_call_logs / source_records / observations / assertions / signals
8. Agent hoàn tất task, update workflow_tasks
9. Orchestrator aggregate kết quả
10. Scorer tính confidence
11. Nếu pass threshold -> save ai_analysis_results
12. Nếu không pass -> manual review / partial result
```

---

## 5. Intelligence Orchestrator thiết kế chi tiết

## 5.1 Nguyên tắc bắt buộc

Orchestrator phải:

- **deterministic**: input giống nhau + state giống nhau → ra task graph giống nhau
- **workflow-first**: không cho agent tự dựng luồng xử lý chính
- **state-machine based**: mọi run/task đều có state rõ ràng
- **DB-driven**: state nằm trong DB, không nằm trong RAM của process

## 5.2 Tại sao phải DB-driven?

Vì nếu để state trong process:

- restart app là mất trạng thái
- khó retry
- khó audit
- khó replay
- khó manual recovery

DB-driven giúp:

- có lịch sử rõ
- resume được
- retry được
- audit được
- debug tốt

## 5.3 Bảng lõi của orchestrator

### A. `workflow_runs`

Lưu một lần chạy workflow.

Gợi ý cột:

- `id`
- `workflow_type` (FINANCE_HEALTH_CHECK / BUDGET_REVIEW / GOAL_PROGRESS / CRM_COLLECTION_REVIEW)
- `scope_type` (PERSONAL / ORG)
- `workspace_id`
- `org_id`
- `requested_by_user_id`
- `trigger_type` (API / EVENT / SCHEDULED)
- `trigger_ref`
- `input_payload jsonb`
- `status` (PENDING / PLANNED / RUNNING / WAITING / COMPLETED / FAILED / PARTIAL / MANUAL_REVIEW)
- `current_step`
- `started_at`
- `finished_at`
- `error_message`
- `idempotency_key`
- `created_at`
- `updated_at`

### B. `workflow_tasks`

Lưu từng task con của workflow.

Gợi ý cột:

- `id`
- `workflow_run_id`
- `task_key` (load_budget_snapshot / spend_analysis / budget_forecast / recommendation)
- `task_type`
- `agent_name`
- `queue_name`
- `status` (PENDING / READY / DISPATCHED / RUNNING / SUCCEEDED / FAILED / RETRYING / DEAD_LETTERED / SKIPPED)
- `depends_on_task_ids jsonb`
- `input_payload jsonb`
- `output_payload jsonb`
- `attempt_count`
- `max_attempts`
- `priority`
- `scheduled_at`
- `started_at`
- `finished_at`
- `last_error`
- `timeout_seconds`
- `budget_limit`
- `confidence_score`
- `created_at`
- `updated_at`

### C. `workflow_task_events`

Audit state transition của task.

- `id`
- `workflow_task_id`
- `from_status`
- `to_status`
- `reason`
- `metadata jsonb`
- `created_at`

### D. `workflow_run_events`

Audit state transition của run.

### E. `workflow_artifacts`

Lưu output file/report/summary/generated payload nếu cần.

## 5.4 State machine cho workflow_run

```text
PENDING
  → PLANNED
  → RUNNING
  → WAITING (nếu còn task async chờ)
  → COMPLETED

PENDING/PLANNED/RUNNING/WAITING
  → FAILED
  → PARTIAL
  → MANUAL_REVIEW
```

## 5.5 State machine cho workflow_task

```text
PENDING
  → READY
  → DISPATCHED
  → RUNNING
  → SUCCEEDED

RUNNING/FAILED
  → RETRYING
  → DISPATCHED

FAILED
  → DEAD_LETTERED

READY
  → SKIPPED
```

## 5.6 Planner phải làm gì?

Planner là deterministic function nhận:

- `workflow_type`
- `input_payload`
- `workspace/org scope`
- rules system

và sinh task graph.

Ví dụ cho `FINANCE_HEALTH_CHECK`:

```text
Task 1: load_budget_snapshot
Task 2: load_goal_snapshot
Task 3: spend_analysis     depends on Task 1
Task 4: budget_forecast    depends on Task 1 + Task 3
Task 5: recommendation     depends on Task 2 + Task 3 + Task 4
Task 6: aggregate_result   depends on Task 3 + Task 4 + Task 5
```

**Planner không dùng LLM để quyết định graph** trong giai đoạn đầu.

## 5.7 Dispatcher phải làm gì?

Dispatcher:

- lấy các task `READY`
- build message envelope chuẩn
- publish lên exchange đúng
- update task → `DISPATCHED`

## 5.8 Aggregator phải làm gì?

Aggregator:

- đọc output của các task con
- merge output
- tính score/confidence tổng
- áp business rules
- ghi kết quả cuối

## 5.9 Scorer phải làm gì?

Scorer tính:

- confidence tổng
- completeness
- contradiction check
- threshold pass/fail

Ví dụ:

- nếu `forecast.confidence < 0.65` → không auto publish recommendation mạnh
- nếu sources quá ít → mark `PARTIAL`
- nếu outputs conflict → `MANUAL_REVIEW`

---

## 6. RabbitMQ Pipeline thiết kế chi tiết

## 6.1 RabbitMQ phải queue-based cho agent

Mỗi bounded-task agent nên có queue riêng hoặc nhóm queue rõ ràng.

### Exchanges đề xuất

- `workflow.tasks.exchange` (topic)
- `workflow.retry.exchange` (direct/topic)
- `workflow.dlq.exchange` (direct)

### Routing keys đề xuất

- `finance.analysis`
- `finance.forecast`
- `finance.recommendation`
- `crm.payment_behavior`
- `system.aggregate`

### Queue đề xuất

- `agent.finance.analysis.queue`
- `agent.finance.forecast.queue`
- `agent.finance.recommendation.queue`
- `agent.crm.payment_behavior.queue`
- `agent.aggregate.queue`

### Retry queues

- `agent.finance.analysis.retry.1m`
- `agent.finance.forecast.retry.1m`
- `agent.finance.recommendation.retry.1m`

### DLQ

- `agent.finance.analysis.dlq`
- `agent.finance.forecast.dlq`
- `agent.finance.recommendation.dlq`

## 6.2 Message envelope chuẩn hóa

Mọi message phải có envelope thống nhất.

```json
{
  "message_id": "uuid",
  "correlation_id": "workflow_run_id",
  "causation_id": "workflow_task_id",
  "event_name": "workflow.task.dispatched",
  "task_type": "budget_forecast",
  "workflow_run_id": "uuid",
  "workflow_task_id": "uuid",
  "workspace_id": "uuid",
  "org_id": null,
  "requested_by_user_id": "uuid",
  "agent_name": "budget-forecast-agent",
  "attempt": 1,
  "max_attempts": 3,
  "priority": 5,
  "timeout_seconds": 60,
  "budget_limit": {
    "max_tool_calls": 5,
    "max_tokens": 12000,
    "max_cost_usd": 0.1
  },
  "guardrails": {
    "workspace_boundary": true,
    "tool_policy_profile": "finance-readonly",
    "visibility_constraint": "workspace_only",
    "confidence_threshold": 0.7
  },
  "payload": {
    "period": "2026-04",
    "budget_id": "uuid",
    "goal_ids": ["uuid-1", "uuid-2"]
  },
  "published_at": "2026-04-08T10:00:00Z"
}
```

## 6.3 Retry policy

- mỗi task có `max_attempts`
- lỗi tạm thời → requeue vào retry queue có delay
- lỗi vĩnh viễn → đi thẳng DLQ

### Lỗi retryable

- MCP gateway timeout
- transient network error
- DB deadlock tạm thời
- rate limit từ LLM/tool

### Lỗi non-retryable

- invalid workspace scope
- unauthorized tool usage
- malformed task payload
- task dependency missing do logic bug

## 6.4 DLQ policy

Khi task vào DLQ:

- update `workflow_tasks.status = DEAD_LETTERED`
- ghi `last_error`
- tạo workflow event
- nếu task critical → mark workflow `FAILED` hoặc `MANUAL_REVIEW`

## 6.5 Idempotency trong RabbitMQ pipeline

Phải chống xử lý lặp:

- `message_id` unique
- `workflow_task_id` unique cho 1 logical execution
- worker kiểm tra task đã `SUCCEEDED` chưa trước khi chạy
- tool call có `idempotency_key`

---

## 7. Agent Workers thiết kế chi tiết

## 7.1 Bounded-task agents nghĩa là gì?

Mỗi agent chỉ làm một nhóm nhiệm vụ rõ ràng.

### Ví dụ tốt

#### `spend-analysis-agent`
Chỉ làm:
- lấy transaction summary
- gọi tools phân tích chi tiêu
- sinh observations/assertions/signals về spending

#### `budget-forecast-agent`
Chỉ làm:
- lấy budget + burn rate
- tính forecast
- ghi kết quả forecast

#### `recommendation-agent`
Chỉ làm:
- lấy outputs đã có
- tạo khuyến nghị ngắn
- không tự ý chạy lại full graph

## 7.2 Agent worker không được làm gì?

- tự tạo task mới lung tung ngoài policy
- tự đọc dữ liệu tenant khác
- tự chọn tool không được phép
- tự ghi thẳng vào business tables ngoài output contract
- tự loop vô hạn để "nghĩ thêm"

## 7.3 Luồng chuẩn của worker

```text
1. nhận envelope
2. validate envelope + scope + task status
3. lock/update workflow_task → RUNNING
4. dựng execution context
5. gọi tool qua Archestra
6. ghi logs + source + observations/assertions/signals
7. build output chuẩn
8. update workflow_task → SUCCEEDED / FAILED
9. ack message
```

## 7.4 Agent output contract

Mọi agent output nên có cấu trúc chuẩn.

```json
{
  "status": "SUCCEEDED",
  "task_type": "spend_analysis",
  "summary": "Marketing spend increased significantly",
  "confidence_score": 0.84,
  "observations": [
    {
      "type": "metric",
      "name": "top_spending_category",
      "value": "Marketing"
    }
  ],
  "assertions": [
    {
      "statement": "Marketing spend grew 18.2% compared to previous period",
      "confidence": 0.88,
      "evidence_refs": ["source-1", "source-2"]
    }
  ],
  "signals": [
    {
      "signal_type": "budget_risk",
      "severity": "high",
      "score": 0.81
    }
  ],
  "sources": [
    {
      "source_ref": "transaction-summary-2026-04",
      "source_type": "db_query"
    }
  ],
  "tool_calls": [
    {
      "tool_name": "get_spending_anomalies",
      "latency_ms": 450
    }
  ],
  "metadata": {
    "model_name": "gpt-5.x",
    "prompt_version": "finance_spend_v1"
  }
}
```

---

## 8. Dùng Archestra để gọi Agent tools

## 8.1 Vai trò của Archestra trong flow này

Archestra đóng vai trò:

- MCP gateway
- registry cho MCP servers
- policy enforcement point cho tool access
- audit / observability lớp tool call

## 8.2 Agent gọi tools qua Archestra như thế nào?

Agent worker không gọi DB/tool trực tiếp tràn lan.

Thay vào đó:

```text
Agent Worker
   ↓
Archestra Gateway
   ↓
Finance MCP Server / CRM MCP Server / Knowledge MCP Server
```

## 8.3 Tools nên đi qua MCP

Ví dụ cho Finance:

- `get_budget_snapshot`
- `get_goal_progress`
- `search_transactions`
- `get_spending_anomalies`
- `get_recurring_rules`
- `search_finance_knowledge`

Ví dụ cho CRM:

- `get_customer_payment_behavior`
- `get_overdue_invoice_summary`
- `get_collection_history`

## 8.4 Lợi ích của gọi qua Archestra

- policy rõ ràng
- credentials tập trung
- observability tập trung
- thay backend tool mà agent không cần đổi nhiều
- dễ thêm MCP servers khác sau này

## 8.5 Tool policy profile

Mỗi agent nên có policy profile:

### `finance-readonly`
Cho phép:
- read budget
- read goal
- read transactions
- read reports

Không cho:
- update transaction
- delete anything

### `finance-analysis-writeback`
Cho phép thêm:
- write ai result tables
- write observations/assertions/signals

Không cho:
- mutate core transactions/budgets/goals

---

## 9. Guardrails bắt buộc

## 9.1 Auth / workspace boundary

Mọi task phải gắn:

- `workspace_id` hoặc `org_id`
- user/request context

Mọi tool call phải carry scope đó.

Không được có tool call không scope.

## 9.2 Tool policy

Mỗi agent chỉ được dùng một whitelist tool nhất định.

Ví dụ:

- `spend-analysis-agent` không được gọi `crm_customer_write_note`
- `recommendation-agent` không được gọi tool mutation budget

## 9.3 Timeout / budget

Mỗi task phải có:

- `timeout_seconds`
- `max_tool_calls`
- `max_tokens`
- `max_cost_usd`

Hết budget thì dừng và mark partial/fail.

## 9.4 Confidence threshold

Mỗi task có threshold.

Ví dụ:

- `budget_forecast >= 0.70`
- `recommendation >= 0.65`

Nếu thấp hơn thì:
- giảm severity
- không auto publish insight mạnh
- hoặc mark `MANUAL_REVIEW`

## 9.5 Visibility constraint

Kết quả AI phải bị ràng buộc theo visibility.

Ví dụ:

- `workspace_only`
- `org_only`
- `owner_only`
- `admin_only`

## 9.6 Idempotency

Bắt buộc ở 3 chỗ:

- workflow creation
- task dispatch
- worker processing / tool writeback

---

## 10. Bảng log và evidence cần có

## 10.1 `tool_call_logs`

Lưu mọi tool call.

Gợi ý cột:

- `id`
- `workflow_run_id`
- `workflow_task_id`
- `agent_name`
- `tool_name`
- `request_payload jsonb`
- `response_payload jsonb`
- `status`
- `latency_ms`
- `cost_estimate`
- `called_at`

## 10.2 `source_records`

Lưu evidence/source mà agent dùng.

- `id`
- `workflow_run_id`
- `workflow_task_id`
- `source_type` (DB_QUERY / MCP_RESOURCE / RAG_CHUNK / TOOL_OUTPUT / REPORT)
- `source_ref`
- `source_uri`
- `content_hash`
- `metadata jsonb`
- `created_at`

## 10.3 `observations`

Observation là dữ kiện mô tả, chưa phải kết luận mạnh.

- `id`
- `workflow_run_id`
- `workflow_task_id`
- `observation_type`
- `key`
- `value jsonb`
- `confidence_score`
- `source_record_ids jsonb`
- `created_at`

## 10.4 `assertions`

Assertion là phát biểu có tính kết luận hơn.

- `id`
- `workflow_run_id`
- `workflow_task_id`
- `statement`
- `confidence_score`
- `source_record_ids jsonb`
- `status` (ACTIVE / REJECTED / SUPERSEDED)
- `created_at`

## 10.5 `signals`

Signal là đầu ra có thể dùng downstream.

- `id`
- `workflow_run_id`
- `workflow_task_id`
- `signal_type` (BUDGET_RISK / SPEND_GROWTH / GOAL_DELAY / COLLECTION_RISK)
- `severity`
- `score`
- `payload jsonb`
- `created_at`

## 10.6 Vì sao phải tách ra như vậy?

Vì nếu chỉ lưu 1 blob kết quả AI thì:

- khó audit
- khó explainability
- khó re-score
- khó reuse cho CRM / reports

Tách observation / assertion / signal giúp bạn xây lớp intelligence sạch hơn.

---

## 11. Sequence chuẩn end-to-end

```text
1. API / Schedule trigger request
2. Orchestrator create workflow_run(status=PENDING)
3. Planner create workflow_tasks(status=READY)
4. Dispatcher publish message to RabbitMQ
5. RabbitMQ route to proper agent queue
6. Agent consume message
7. Agent validate guardrails
8. Agent call tools via Archestra
9. MCP servers trả data/tool outputs
10. Agent persist tool_call_logs + source_records + observations/assertions/signals
11. Agent mark task SUCCEEDED
12. Orchestrator detect dependencies satisfied
13. Dispatcher publish next tasks
14. Khi all done, Aggregator merge results
15. Scorer compute confidence / completeness
16. Write final ai_analysis_results
17. workflow_run -> COMPLETED/PARTIAL/MANUAL_REVIEW/FAILED
```

---

## 12. Triển khai vào code hiện tại

## 12.1 Trong NestJS Core

Tạo module:

```text
src/modules/intelligence/
  orchestrator/
  planner/
  dispatcher/
  aggregator/
  scorer/
  repositories/
  dto/
  entities/

src/modules/integrations/rabbitmq/
  publisher/
  consumer/
```

### Service cần có

- `WorkflowRunService`
- `WorkflowTaskService`
- `WorkflowPlannerService`
- `WorkflowDispatcherService`
- `WorkflowAggregatorService`
- `WorkflowScorerService`
- `WorkflowGuardrailService`

## 12.2 Trong Python AI Service

Tạo structure:

```text
ai_service/
  consumers/
    finance_analysis_consumer.py
    budget_forecast_consumer.py
    recommendation_consumer.py
  agents/
    spend_analysis_agent.py
    budget_forecast_agent.py
    recommendation_agent.py
  mcp/
    archestra_client.py
  guardrails/
    policy.py
    timeout.py
    budget.py
    confidence.py
  persistence/
    db_writer.py
  schemas/
    envelope.py
    outputs.py
```

## 12.3 Trình tự rollout

### Phase 1

- thêm `workflow_runs`, `workflow_tasks`
- thêm dispatcher cơ bản
- thêm 1 queue `agent.finance.analysis.queue`
- thêm 1 agent `spend-analysis-agent`

### Phase 2

- thêm retry/DLQ
- thêm `tool_call_logs`, `source_records`, `observations`, `assertions`, `signals`
- thêm aggregator + scorer

### Phase 3

- thêm `budget-forecast-agent`
- thêm `recommendation-agent`
- thêm guardrails đầy đủ

### Phase 4

- thêm CRM agents
- thêm multi-agent coordination nâng cao
- cân nhắc A2A cho remote agents nếu thật sự cần

---

## 13. Có nên dùng A2A ngay không?

Trong thiết kế này:

- **Orchestrator + RabbitMQ pipeline** là backbone chính
- bounded-task agents là đúng hướng
- **chưa cần full Agent-to-Agent tự do ngay**

Nếu cần agentic hơn, nên làm:

- Orchestrator deterministic ở ngoài
- agent bounded-task ở trong
- A2A chỉ dùng khi có nhiều remote agents độc lập thật sự

Đây là hướng an toàn và phù hợp nhất cho dự án Finance CRM hiện tại.

---

## 14. Checklist triển khai nhanh

### DB
- [ ] workflow_runs
- [ ] workflow_tasks
- [ ] workflow_task_events
- [ ] workflow_run_events
- [ ] tool_call_logs
- [ ] source_records
- [ ] observations
- [ ] assertions
- [ ] signals

### RabbitMQ
- [ ] workflow.tasks.exchange
- [ ] workflow.retry.exchange
- [ ] workflow.dlq.exchange
- [ ] agent queues
- [ ] retry queues
- [ ] DLQ queues
- [ ] message envelope schema

### NestJS
- [ ] planner
- [ ] dispatcher
- [ ] aggregator
- [ ] scorer
- [ ] guardrail service
- [ ] run/task state transition handlers

### Python AI
- [ ] agent consumers
- [ ] bounded-task agents
- [ ] Archestra MCP client
- [ ] DB writeback
- [ ] timeout/budget/conﬁdence guards

### Archestra
- [ ] finance MCP server registered
- [ ] tool policy profiles
- [ ] gateway credentials
- [ ] observability enabled

---

## 15. Kết luận chốt ngắn gọn dễ nhớ

### Công thức triển khai cho bạn

```text
Request
→ workflow_runs
→ planner tạo workflow_tasks
→ publish RabbitMQ
→ agent consume
→ agent gọi Archestra tools
→ ghi tool_call_logs + source_records + observations/assertions/signals
→ orchestrator aggregate
→ scoring
→ ai_analysis_results
```

### Tư duy quan trọng

- Orchestrator quyết định luồng
- RabbitMQ quyết định execution async
- Agent chỉ làm bounded task
- Archestra chuẩn hóa tool access
- DB lõi là source of truth
- Guardrails là bắt buộc, không phải tùy chọn

