# Intelligence Orchestrator + RabbitMQ Pipeline + Python AI Service

## 1. Mục tiêu tài liệu

Tài liệu này là bản **bắt tay vào code** cho hướng triển khai bạn đã chốt:

- **Intelligence Orchestrator**
  - deterministic
  - workflow-first
  - state-machine based
  - DB-driven bằng `workflow_runs` và `workflow_tasks`
- **RabbitMQ pipeline**
  - agent queue based
  - retry + DLQ rõ ràng
  - message envelope chuẩn hóa
- **Agent Workers**
  - bounded-task agents
  - gọi tool qua **Archestra MCP Gateway**
  - persist output về DB lõi
- **Guardrails**
  - auth/workspace boundary
  - tool policy
  - timeout/budget
  - confidence threshold
  - visibility constraint
  - idempotency

Mục tiêu là để bạn có thể đi theo thứ tự:

```text
Migration DB
→ NestJS publisher + orchestrator
→ RabbitMQ topology
→ Python AI worker
→ Archestra tool call
→ persist output
→ aggregate + scoring
```

---

## 2. Kiến trúc đích

```text
Frontend / API caller
   ↓
NestJS Finance CRM API
   ↓
Intelligence Orchestrator
   ├── tạo workflow_runs
   ├── tạo workflow_tasks
   ├── publish RabbitMQ messages
   └── aggregate kết quả

RabbitMQ
   ├── intelligence.workflow.exchange
   ├── intelligence.agent.exchange
   ├── intelligence.agent.retry.exchange
   └── intelligence.agent.dlx

Python AI Service
   ├── task consumers
   ├── bounded-task agents
   ├── tool caller → Archestra MCP Gateway
   ├── result writer
   └── guardrails executor

Archestra MCP Gateway
   ├── route tới MCP servers
   ├── auth / credentials / governance
   └── expose tools / resources / prompts

PostgreSQL
   ├── workflow_runs
   ├── workflow_tasks
   ├── tool_call_logs
   ├── source_records
   ├── observations
   ├── assertions
   ├── signals
   ├── ai_analysis_jobs (optional integration)
   └── ai_analysis_results (optional integration)
```

---

## 3. Nguyên tắc triển khai

## 3.1 Orchestrator không phải LLM agent

`Intelligence Orchestrator` là **bộ điều phối deterministic**. Nó không tự reasoning tự do.
Nó chỉ làm đúng các việc sau:

1. nhận request
2. tạo `workflow_runs`
3. sinh `workflow_tasks` theo template cố định
4. publish task sang RabbitMQ
5. theo dõi trạng thái task
6. aggregate output
7. scoring / finalize / fail

Nó **không** nên:

- tự gọi tool trực tiếp hàng loạt
- tự suy diễn business logic không kiểm soát
- tự chạy prompt tự do kiểu chat agent

## 3.2 Agent workers phải bounded-task

Mỗi agent chỉ làm **1 loại nhiệm vụ rõ ràng**.

Ví dụ:

- `SpendAnalysisAgent`
- `BudgetForecastAgent`
- `RecommendationAgent`
- `EvidenceCollectorAgent`
- `CRMCollectionsInsightAgent` (sau này)

Mỗi agent:

- nhận đúng 1 loại `task_type`
- chỉ gọi các tools được phép
- trả output theo schema cố định
- persist kết quả về DB

## 3.3 Archestra là MCP Gateway, không phải message broker

RabbitMQ xử lý **job/event pipeline**.
Archestra xử lý **tool access / MCP registry / governance**.

Đừng trộn 2 vai trò này.

---

## 4. Database cần thêm

Khuyến nghị tạo **schema riêng**:

```sql
CREATE SCHEMA IF NOT EXISTS intelligence;
```

## 4.1 workflow_runs

Lưu 1 lần chạy workflow ở level tổng.

### Mục đích

- theo dõi 1 request intelligence từ đầu đến cuối
- là parent của toàn bộ task con
- là state machine tổng

### SQL gợi ý

```sql
CREATE TABLE intelligence.workflow_runs (
  id uuid PRIMARY KEY,
  workflow_name text NOT NULL,
  workflow_version text NOT NULL DEFAULT 'v1',
  scope_type text NOT NULL, -- PERSONAL / ORG / WORKSPACE / CRM
  workspace_id uuid NULL,
  org_id uuid NULL,
  requested_by_user_id uuid NULL,
  trigger_source text NOT NULL, -- api / event / cron
  trigger_event text NULL,
  request_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  planning_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL, -- PENDING / PLANNED / RUNNING / PARTIAL / COMPLETED / FAILED / CANCELED / TIMED_OUT
  priority int NOT NULL DEFAULT 5,
  idempotency_key text NULL,
  started_at timestamptz NULL,
  finished_at timestamptz NULL,
  error_code text NULL,
  error_message text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_workflow_runs_idempotency_key
  ON intelligence.workflow_runs (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX idx_workflow_runs_status_created_at
  ON intelligence.workflow_runs (status, created_at DESC);

CREATE INDEX idx_workflow_runs_workspace_status
  ON intelligence.workflow_runs (workspace_id, status)
  WHERE workspace_id IS NOT NULL;

CREATE INDEX idx_workflow_runs_org_status
  ON intelligence.workflow_runs (org_id, status)
  WHERE org_id IS NOT NULL;
```

---

## 4.2 workflow_tasks

Mỗi run có nhiều task con. Đây là trung tâm của state-machine task-level.

### Mục đích

- đại diện cho từng bước bounded-task
- là đơn vị publish sang RabbitMQ
- lưu retry count, queue, worker assignment, guardrail info

### SQL gợi ý

```sql
CREATE TABLE intelligence.workflow_tasks (
  id uuid PRIMARY KEY,
  workflow_run_id uuid NOT NULL REFERENCES intelligence.workflow_runs(id) ON DELETE CASCADE,
  task_order int NOT NULL,
  task_type text NOT NULL, -- spend_analysis / budget_forecast / recommendation / evidence_collect
  agent_name text NOT NULL,
  queue_name text NOT NULL,
  routing_key text NOT NULL,
  depends_on_task_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  input_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL, -- PENDING / QUEUED / RUNNING / SUCCEEDED / FAILED / RETRYING / SKIPPED / BLOCKED / TIMED_OUT / DLQ
  attempt_count int NOT NULL DEFAULT 0,
  max_attempts int NOT NULL DEFAULT 3,
  timeout_seconds int NOT NULL DEFAULT 60,
  cost_budget_cents int NULL,
  confidence_threshold numeric(5,4) NULL,
  visibility_scope text NULL,
  assigned_worker text NULL,
  locked_at timestamptz NULL,
  started_at timestamptz NULL,
  finished_at timestamptz NULL,
  output_payload jsonb NULL,
  error_code text NULL,
  error_message text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workflow_run_id, task_order)
);

CREATE INDEX idx_workflow_tasks_run_status
  ON intelligence.workflow_tasks (workflow_run_id, status);

CREATE INDEX idx_workflow_tasks_queue_status
  ON intelligence.workflow_tasks (queue_name, status);

CREATE INDEX idx_workflow_tasks_agent_status
  ON intelligence.workflow_tasks (agent_name, status);
```

---

## 4.3 tool_call_logs

Lưu mọi lần agent gọi tool qua Archestra.

### Mục đích

- audit
- debug
- cost / latency tracking
- guardrails evidence

### SQL gợi ý

```sql
CREATE TABLE intelligence.tool_call_logs (
  id uuid PRIMARY KEY,
  workflow_run_id uuid NOT NULL REFERENCES intelligence.workflow_runs(id) ON DELETE CASCADE,
  workflow_task_id uuid NOT NULL REFERENCES intelligence.workflow_tasks(id) ON DELETE CASCADE,
  tool_name text NOT NULL,
  tool_provider text NOT NULL DEFAULT 'archestra',
  request_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  response_payload jsonb NULL,
  status text NOT NULL, -- STARTED / SUCCEEDED / FAILED / BLOCKED / TIMED_OUT
  latency_ms int NULL,
  token_usage jsonb NULL,
  cost_cents int NULL,
  confidence_score numeric(5,4) NULL,
  blocked_reason text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz NULL
);

CREATE INDEX idx_tool_call_logs_task_created_at
  ON intelligence.tool_call_logs (workflow_task_id, created_at DESC);
```

---

## 4.4 source_records

Lưu record nguồn từ tool/data source để truy vết evidence.

### SQL gợi ý

```sql
CREATE TABLE intelligence.source_records (
  id uuid PRIMARY KEY,
  workflow_run_id uuid NOT NULL REFERENCES intelligence.workflow_runs(id) ON DELETE CASCADE,
  workflow_task_id uuid NULL REFERENCES intelligence.workflow_tasks(id) ON DELETE SET NULL,
  source_type text NOT NULL, -- mcp_resource / mcp_tool / db_snapshot / report / invoice_note
  source_uri text NULL,
  source_ref text NULL,
  title text NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  visibility_scope text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_source_records_run_type
  ON intelligence.source_records (workflow_run_id, source_type);
```

---

## 4.5 observations

Observation là “sự kiện quan sát được” sau khi xử lý evidence.

Ví dụ:

- marketing_spend_growth = 18.2%
- overdue_invoice_count = 7
- budget_used_percent = 72

### SQL gợi ý

```sql
CREATE TABLE intelligence.observations (
  id uuid PRIMARY KEY,
  workflow_run_id uuid NOT NULL REFERENCES intelligence.workflow_runs(id) ON DELETE CASCADE,
  workflow_task_id uuid NULL REFERENCES intelligence.workflow_tasks(id) ON DELETE SET NULL,
  observation_type text NOT NULL,
  observation_key text NOT NULL,
  value_json jsonb NOT NULL,
  confidence_score numeric(5,4) NULL,
  source_record_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_observations_run_type
  ON intelligence.observations (workflow_run_id, observation_type);
```

---

## 4.6 assertions

Assertion là kết luận có cấu trúc hơn observation.

Ví dụ:

- “budget_risk is high”
- “ads_spend is main driver”

### SQL gợi ý

```sql
CREATE TABLE intelligence.assertions (
  id uuid PRIMARY KEY,
  workflow_run_id uuid NOT NULL REFERENCES intelligence.workflow_runs(id) ON DELETE CASCADE,
  workflow_task_id uuid NULL REFERENCES intelligence.workflow_tasks(id) ON DELETE SET NULL,
  assertion_type text NOT NULL,
  assertion_text text NOT NULL,
  severity text NULL,
  confidence_score numeric(5,4) NULL,
  source_record_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_assertions_run_type
  ON intelligence.assertions (workflow_run_id, assertion_type);
```

---

## 4.7 signals

Signal là output tổng hợp để frontend / downstream systems dùng.

Ví dụ:

- `budget_overrun_risk`
- `goal_lagging`
- `customer_collection_risk`

### SQL gợi ý

```sql
CREATE TABLE intelligence.signals (
  id uuid PRIMARY KEY,
  workflow_run_id uuid NOT NULL REFERENCES intelligence.workflow_runs(id) ON DELETE CASCADE,
  signal_name text NOT NULL,
  signal_value text NOT NULL,
  score numeric(8,4) NULL,
  confidence_score numeric(5,4) NULL,
  explanation text NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_signals_run_name
  ON intelligence.signals (workflow_run_id, signal_name);
```

---

## 4.8 Optional: gắn với bảng AI cũ

Nếu bạn đã có:

- `ai_analysis_jobs`
- `ai_analysis_results`

thì có thể giữ lại như **read model** cho dashboard/UI.

Tức là:

- `workflow_runs`, `workflow_tasks` là orchestrator execution model
- `ai_analysis_results` là UI query model

---

## 5. RabbitMQ topology

RabbitMQ dùng queue/exchange routing; topic exchange route dựa trên routing key, còn DLX xử lý dead-lettered messages. Bạn nên tận dụng topic exchange + DLX ngay từ đầu.

## 5.1 Exchanges

```text
intelligence.workflow.exchange     (topic)
intelligence.agent.exchange        (topic)
intelligence.agent.retry.exchange  (topic)
intelligence.agent.dlx             (topic)
```

## 5.2 Queues

### Main queues

```text
intelligence.agent.spend_analysis.q
intelligence.agent.budget_forecast.q
intelligence.agent.recommendation.q
intelligence.agent.evidence_collect.q
```

### Retry queues

```text
intelligence.agent.spend_analysis.retry.q
intelligence.agent.budget_forecast.retry.q
intelligence.agent.recommendation.retry.q
intelligence.agent.evidence_collect.retry.q
```

### DLQ

```text
intelligence.agent.dlq
```

## 5.3 Routing keys

```text
agent.spend_analysis.execute
agent.budget_forecast.execute
agent.recommendation.execute
agent.evidence_collect.execute
```

## 5.4 Message envelope chuẩn hóa

Mọi message publish sang RabbitMQ phải theo envelope chung.

```json
{
  "message_id": "uuid",
  "correlation_id": "uuid",
  "causation_id": "uuid",
  "workflow_run_id": "uuid",
  "workflow_task_id": "uuid",
  "event_name": "agent.spend_analysis.execute",
  "producer": "intelligence-orchestrator",
  "schema_version": "v1",
  "occurred_at": "2026-04-08T10:00:00Z",
  "workspace_id": "uuid-or-null",
  "org_id": "uuid-or-null",
  "auth_context": {
    "requested_by_user_id": "uuid",
    "actor_type": "user",
    "scopes": ["finance:read", "budget:read"]
  },
  "guardrails": {
    "timeout_seconds": 60,
    "cost_budget_cents": 200,
    "confidence_threshold": 0.75,
    "visibility_scope": "workspace",
    "allowed_tools": [
      "get_budget_snapshot",
      "search_transactions",
      "search_finance_knowledge"
    ]
  },
  "payload": {
    "analysis_window_days": 30,
    "budget_id": "uuid",
    "goal_id": null
  }
}
```

### Envelope rules

- `message_id`: id duy nhất của message
- `correlation_id`: theo `workflow_run_id`
- `causation_id`: id của event trước đó nếu có
- `guardrails`: luôn đi kèm trong message
- `auth_context`: luôn đi kèm để enforce workspace boundary

---

## 6. State machine

## 6.1 workflow_runs states

```text
PENDING
→ PLANNED
→ RUNNING
→ PARTIAL
→ COMPLETED
→ FAILED
→ CANCELED
→ TIMED_OUT
```

### Rule

- `PENDING`: vừa tạo
- `PLANNED`: đã sinh task xong
- `RUNNING`: có task đang chạy
- `PARTIAL`: có task fail nhưng policy vẫn cho aggregate
- `COMPLETED`: task đủ điều kiện hoàn tất
- `FAILED`: fail toàn cục
- `TIMED_OUT`: quá SLA run-level

## 6.2 workflow_tasks states

```text
PENDING
→ QUEUED
→ RUNNING
→ SUCCEEDED
→ FAILED
→ RETRYING
→ BLOCKED
→ SKIPPED
→ TIMED_OUT
→ DLQ
```

### Rule

- `PENDING`: tạo trong planner
- `QUEUED`: đã publish RabbitMQ
- `RUNNING`: worker đã nhận
- `SUCCEEDED`: worker xử lý xong
- `FAILED`: worker fail, chưa retry hoặc hết retry
- `RETRYING`: đang đưa sang retry queue
- `BLOCKED`: bị guardrail chặn
- `TIMED_OUT`: chạy quá timeout
- `DLQ`: chết hẳn, cần operator xử lý

---

## 7. Workflow template gợi ý cho Finance

Ví dụ workflow `finance_budget_review_v1`.

## 7.1 Các task

```text
1. evidence_collect
2. spend_analysis
3. budget_forecast
4. recommendation
5. aggregate_and_score
```

## 7.2 Phụ thuộc

```text
evidence_collect
  ↓
spend_analysis
  ↓
budget_forecast
  ↓
recommendation
  ↓
aggregate_and_score
```

Hoặc bạn có thể cho `spend_analysis` và `budget_forecast` chạy song song sau `evidence_collect`.

---

## 8. NestJS triển khai: cấu trúc code

```text
src/modules/intelligence/
  application/
    orchestrator.service.ts
    planner.service.ts
    workflow-template.service.ts
    workflow-aggregator.service.ts
    scoring.service.ts
    guardrail-policy.service.ts
  domain/
    workflow-run.entity.ts
    workflow-task.entity.ts
    enums/
  infrastructure/
    persistence/
      workflow-run.repository.ts
      workflow-task.repository.ts
      tool-call-log.repository.ts
      source-record.repository.ts
      observation.repository.ts
      assertion.repository.ts
      signal.repository.ts
    messaging/
      rabbitmq.module.ts
      rabbitmq-publisher.service.ts
      rabbitmq-topology.service.ts
    api/
      intelligence.controller.ts
  dto/
```

---

## 9. NestJS code: RabbitMQ module

Dùng `amqplib` là đủ để nắm control rõ ràng.

## 9.1 rabbitmq.module.ts

```ts
import { Global, Module } from '@nestjs/common';
import { RabbitMqPublisherService } from './rabbitmq-publisher.service';
import { RabbitMqTopologyService } from './rabbitmq-topology.service';

@Global()
@Module({
  providers: [RabbitMqPublisherService, RabbitMqTopologyService],
  exports: [RabbitMqPublisherService, RabbitMqTopologyService],
})
export class RabbitMqModule {}
```

## 9.2 rabbitmq-topology.service.ts

```ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import * as amqp from 'amqplib';

@Injectable()
export class RabbitMqTopologyService implements OnModuleInit {
  private conn!: amqp.ChannelModel;
  private channel!: amqp.Channel;

  async onModuleInit() {
    this.conn = await amqp.connect(process.env.RABBITMQ_URL!);
    this.channel = await this.conn.createChannel();

    await this.channel.assertExchange('intelligence.workflow.exchange', 'topic', { durable: true });
    await this.channel.assertExchange('intelligence.agent.exchange', 'topic', { durable: true });
    await this.channel.assertExchange('intelligence.agent.retry.exchange', 'topic', { durable: true });
    await this.channel.assertExchange('intelligence.agent.dlx', 'topic', { durable: true });

    await this.assertMainQueue('intelligence.agent.spend_analysis.q', 'agent.spend_analysis.execute');
    await this.assertMainQueue('intelligence.agent.budget_forecast.q', 'agent.budget_forecast.execute');
    await this.assertMainQueue('intelligence.agent.recommendation.q', 'agent.recommendation.execute');
    await this.assertMainQueue('intelligence.agent.evidence_collect.q', 'agent.evidence_collect.execute');

    await this.assertRetryQueue('intelligence.agent.spend_analysis.retry.q', 'agent.spend_analysis.execute', 15000);
    await this.assertRetryQueue('intelligence.agent.budget_forecast.retry.q', 'agent.budget_forecast.execute', 15000);
    await this.assertRetryQueue('intelligence.agent.recommendation.retry.q', 'agent.recommendation.execute', 15000);
    await this.assertRetryQueue('intelligence.agent.evidence_collect.retry.q', 'agent.evidence_collect.execute', 15000);

    await this.channel.assertQueue('intelligence.agent.dlq', { durable: true });
    await this.channel.bindQueue('intelligence.agent.dlq', 'intelligence.agent.dlx', '#');
  }

  private async assertMainQueue(queue: string, routingKey: string) {
    await this.channel.assertQueue(queue, {
      durable: true,
      deadLetterExchange: 'intelligence.agent.dlx',
      deadLetterRoutingKey: routingKey,
    });
    await this.channel.bindQueue(queue, 'intelligence.agent.exchange', routingKey);
  }

  private async assertRetryQueue(queue: string, routingKey: string, ttlMs: number) {
    await this.channel.assertQueue(queue, {
      durable: true,
      messageTtl: ttlMs,
      deadLetterExchange: 'intelligence.agent.exchange',
      deadLetterRoutingKey: routingKey,
    });
    await this.channel.bindQueue(queue, 'intelligence.agent.retry.exchange', routingKey);
  }
}
```

---

## 10. NestJS code: publisher

```ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import * as amqp from 'amqplib';

@Injectable()
export class RabbitMqPublisherService implements OnModuleInit {
  private conn!: amqp.ChannelModel;
  private channel!: amqp.ConfirmChannel;

  async onModuleInit() {
    this.conn = await amqp.connect(process.env.RABBITMQ_URL!);
    this.channel = await this.conn.createConfirmChannel();
  }

  async publish(exchange: string, routingKey: string, payload: unknown) {
    const body = Buffer.from(JSON.stringify(payload));

    this.channel.publish(exchange, routingKey, body, {
      contentType: 'application/json',
      deliveryMode: 2,
      timestamp: Date.now(),
      messageId: (payload as any)?.message_id,
      correlationId: (payload as any)?.correlation_id,
      persistent: true,
    });

    await this.channel.waitForConfirms();
  }
}
```

---

## 11. NestJS code: planner

## 11.1 Workflow template service

```ts
export interface PlannedTask {
  taskOrder: number;
  taskType: string;
  agentName: string;
  queueName: string;
  routingKey: string;
  dependsOnTaskOrders: number[];
  inputPayload: Record<string, any>;
  timeoutSeconds: number;
  maxAttempts: number;
  confidenceThreshold?: number;
}

export class WorkflowTemplateService {
  buildFinanceBudgetReview(input: {
    workspaceId?: string;
    orgId?: string;
    budgetId?: string;
    goalId?: string;
    analysisWindowDays: number;
  }): PlannedTask[] {
    return [
      {
        taskOrder: 1,
        taskType: 'evidence_collect',
        agentName: 'EvidenceCollectorAgent',
        queueName: 'intelligence.agent.evidence_collect.q',
        routingKey: 'agent.evidence_collect.execute',
        dependsOnTaskOrders: [],
        inputPayload: { analysisWindowDays: input.analysisWindowDays },
        timeoutSeconds: 30,
        maxAttempts: 3,
      },
      {
        taskOrder: 2,
        taskType: 'spend_analysis',
        agentName: 'SpendAnalysisAgent',
        queueName: 'intelligence.agent.spend_analysis.q',
        routingKey: 'agent.spend_analysis.execute',
        dependsOnTaskOrders: [1],
        inputPayload: { budgetId: input.budgetId, analysisWindowDays: input.analysisWindowDays },
        timeoutSeconds: 60,
        maxAttempts: 3,
        confidenceThreshold: 0.75,
      },
      {
        taskOrder: 3,
        taskType: 'budget_forecast',
        agentName: 'BudgetForecastAgent',
        queueName: 'intelligence.agent.budget_forecast.q',
        routingKey: 'agent.budget_forecast.execute',
        dependsOnTaskOrders: [1],
        inputPayload: { budgetId: input.budgetId, analysisWindowDays: input.analysisWindowDays },
        timeoutSeconds: 60,
        maxAttempts: 3,
        confidenceThreshold: 0.70,
      },
      {
        taskOrder: 4,
        taskType: 'recommendation',
        agentName: 'RecommendationAgent',
        queueName: 'intelligence.agent.recommendation.q',
        routingKey: 'agent.recommendation.execute',
        dependsOnTaskOrders: [2, 3],
        inputPayload: { goalId: input.goalId },
        timeoutSeconds: 45,
        maxAttempts: 2,
        confidenceThreshold: 0.70,
      },
    ];
  }
}
```

## 11.2 Orchestrator create-run flow

```ts
async createRunAndPlan(request: {
  workflowName: 'finance_budget_review_v1';
  workspaceId?: string;
  orgId?: string;
  requestedByUserId: string;
  requestPayload: Record<string, any>;
}) {
  const run = await this.workflowRunRepo.create({
    workflowName: request.workflowName,
    workflowVersion: 'v1',
    scopeType: request.workspaceId ? 'WORKSPACE' : 'ORG',
    workspaceId: request.workspaceId ?? null,
    orgId: request.orgId ?? null,
    requestedByUserId: request.requestedByUserId,
    triggerSource: 'api',
    requestPayload: request.requestPayload,
    status: 'PENDING',
  });

  const planned = this.workflowTemplateService.buildFinanceBudgetReview({
    workspaceId: request.workspaceId,
    orgId: request.orgId,
    budgetId: request.requestPayload.budgetId,
    goalId: request.requestPayload.goalId,
    analysisWindowDays: request.requestPayload.analysisWindowDays ?? 30,
  });

  for (const task of planned) {
    await this.workflowTaskRepo.create({
      workflowRunId: run.id,
      taskOrder: task.taskOrder,
      taskType: task.taskType,
      agentName: task.agentName,
      queueName: task.queueName,
      routingKey: task.routingKey,
      dependsOnTaskIds: [],
      inputPayload: task.inputPayload,
      status: 'PENDING',
      maxAttempts: task.maxAttempts,
      timeoutSeconds: task.timeoutSeconds,
      confidenceThreshold: task.confidenceThreshold ?? null,
    });
  }

  await this.workflowRunRepo.updateStatus(run.id, 'PLANNED');
  return run;
}
```

---

## 12. NestJS code: dispatch ready tasks

```ts
async dispatchReadyTasks(workflowRunId: string) {
  const tasks = await this.workflowTaskRepo.findPendingByRunId(workflowRunId);

  for (const task of tasks) {
    const depsSatisfied = await this.workflowTaskRepo.areDependenciesSatisfied(task.id);
    if (!depsSatisfied) continue;

    const envelope = {
      message_id: crypto.randomUUID(),
      correlation_id: workflowRunId,
      causation_id: null,
      workflow_run_id: workflowRunId,
      workflow_task_id: task.id,
      event_name: task.routingKey,
      producer: 'intelligence-orchestrator',
      schema_version: 'v1',
      occurred_at: new Date().toISOString(),
      workspace_id: task.workspaceId ?? null,
      org_id: task.orgId ?? null,
      auth_context: {
        requested_by_user_id: task.requestedByUserId,
        actor_type: 'user',
        scopes: ['finance:read', 'budget:read'],
      },
      guardrails: {
        timeout_seconds: task.timeoutSeconds,
        cost_budget_cents: task.costBudgetCents ?? 200,
        confidence_threshold: task.confidenceThreshold ?? 0.7,
        visibility_scope: task.visibilityScope ?? 'workspace',
        allowed_tools: this.guardrailPolicyService.resolveAllowedTools(task.taskType),
      },
      payload: task.inputPayload,
    };

    await this.publisher.publish('intelligence.agent.exchange', task.routingKey, envelope);
    await this.workflowTaskRepo.updateStatus(task.id, 'QUEUED');
  }

  await this.workflowRunRepo.updateStatus(workflowRunId, 'RUNNING');
}
```

---

## 13. Python AI service: cấu trúc code

```text
ai_service/
  app/
    main.py
    config.py
    db.py
    mq.py
    schemas.py
    repositories/
      workflow_repo.py
      task_repo.py
      tool_log_repo.py
      source_repo.py
      observation_repo.py
      assertion_repo.py
      signal_repo.py
    tools/
      archestra_client.py
    agents/
      base_agent.py
      evidence_collector_agent.py
      spend_analysis_agent.py
      budget_forecast_agent.py
      recommendation_agent.py
    services/
      guardrails.py
      deterministic_metrics.py
      task_dispatcher.py
```

Khuyên dùng:

- `aio-pika` cho RabbitMQ async consumer
- `asyncpg` hoặc SQLAlchemy async cho DB
- `httpx` cho gọi Archestra gateway

---

## 14. Python: message schema

```py
from pydantic import BaseModel
from typing import Any

class AuthContext(BaseModel):
    requested_by_user_id: str
    actor_type: str
    scopes: list[str]

class Guardrails(BaseModel):
    timeout_seconds: int
    cost_budget_cents: int | None = None
    confidence_threshold: float | None = None
    visibility_scope: str | None = None
    allowed_tools: list[str] = []

class TaskEnvelope(BaseModel):
    message_id: str
    correlation_id: str
    causation_id: str | None = None
    workflow_run_id: str
    workflow_task_id: str
    event_name: str
    producer: str
    schema_version: str
    occurred_at: str
    workspace_id: str | None = None
    org_id: str | None = None
    auth_context: AuthContext
    guardrails: Guardrails
    payload: dict[str, Any]
```

---

## 15. Python: aio-pika consumer skeleton

```py
import json
import aio_pika
from app.schemas import TaskEnvelope
from app.services.task_dispatcher import TaskDispatcher

class AgentConsumer:
    def __init__(self, amqp_url: str, queue_name: str, dispatcher: TaskDispatcher):
        self.amqp_url = amqp_url
        self.queue_name = queue_name
        self.dispatcher = dispatcher

    async def start(self):
        connection = await aio_pika.connect_robust(self.amqp_url)
        channel = await connection.channel()
        await channel.set_qos(prefetch_count=5)
        queue = await channel.declare_queue(self.queue_name, durable=True)

        async with queue.iterator() as queue_iter:
            async for message in queue_iter:
                async with message.process(requeue=False):
                    envelope = TaskEnvelope.model_validate_json(message.body.decode())
                    await self.dispatcher.dispatch(envelope)
```

---

## 16. Python: bounded-task agent base class

```py
from abc import ABC, abstractmethod
from app.schemas import TaskEnvelope

class BaseAgent(ABC):
    task_type: str

    @abstractmethod
    async def execute(self, envelope: TaskEnvelope) -> dict:
        raise NotImplementedError
```

---

## 17. Python: Archestra MCP tool caller

Giả sử Archestra là MCP gateway HTTP endpoint phía trước.

```py
import httpx
from app.schemas import TaskEnvelope

class ArchestraClient:
    def __init__(self, base_url: str, token: str):
        self.base_url = base_url.rstrip('/')
        self.token = token

    async def call_tool(self, tool_name: str, args: dict, envelope: TaskEnvelope) -> dict:
        headers = {
            'Authorization': f'Bearer {self.token}',
            'Content-Type': 'application/json',
            'X-Workspace-Id': envelope.workspace_id or '',
            'X-Org-Id': envelope.org_id or '',
            'X-Correlation-Id': envelope.correlation_id,
        }
        payload = {
            'tool': tool_name,
            'arguments': args,
        }
        async with httpx.AsyncClient(timeout=envelope.guardrails.timeout_seconds) as client:
            res = await client.post(f'{self.base_url}/tools/call', json=payload, headers=headers)
            res.raise_for_status()
            return res.json()
```

> Ghi chú: endpoint thực tế phụ thuộc cách bạn cấu hình Archestra/gateway. Trong code thật, hãy đóng gói adapter cho đúng API endpoint của gateway bạn dùng.

---

## 18. Python: guardrails service

```py
from app.schemas import TaskEnvelope

class GuardrailError(Exception):
    pass

class GuardrailService:
    def assert_tool_allowed(self, envelope: TaskEnvelope, tool_name: str):
        if tool_name not in envelope.guardrails.allowed_tools:
            raise GuardrailError(f'tool_not_allowed:{tool_name}')

    def assert_workspace_scope(self, envelope: TaskEnvelope, returned_scope: str | None):
        if envelope.guardrails.visibility_scope and returned_scope:
            if envelope.guardrails.visibility_scope != returned_scope:
                raise GuardrailError('visibility_scope_mismatch')

    def assert_confidence(self, envelope: TaskEnvelope, confidence: float | None):
        threshold = envelope.guardrails.confidence_threshold
        if threshold is not None and confidence is not None and confidence < threshold:
            raise GuardrailError('confidence_below_threshold')
```

---

## 19. Python: SpendAnalysisAgent example

```py
from app.agents.base_agent import BaseAgent
from app.schemas import TaskEnvelope
from app.tools.archestra_client import ArchestraClient
from app.services.guardrails import GuardrailService

class SpendAnalysisAgent(BaseAgent):
    task_type = 'spend_analysis'

    def __init__(self, archestra: ArchestraClient, guardrails: GuardrailService, repos):
        self.archestra = archestra
        self.guardrails = guardrails
        self.repos = repos

    async def execute(self, envelope: TaskEnvelope) -> dict:
        self.guardrails.assert_tool_allowed(envelope, 'search_transactions')
        tx = await self.archestra.call_tool(
            'search_transactions',
            {
                'workspace_id': envelope.workspace_id,
                'window_days': envelope.payload.get('analysisWindowDays', 30),
            },
            envelope,
        )

        tool_log_id = await self.repos.tool_logs.create_started(
            workflow_run_id=envelope.workflow_run_id,
            workflow_task_id=envelope.workflow_task_id,
            tool_name='search_transactions',
            request_payload={'window_days': envelope.payload.get('analysisWindowDays', 30)},
        )

        await self.repos.tool_logs.mark_succeeded(tool_log_id, response_payload=tx)

        metrics = self._compute_metrics(tx)
        observation_ids = []

        observation_ids.append(await self.repos.observations.create(
            workflow_run_id=envelope.workflow_run_id,
            workflow_task_id=envelope.workflow_task_id,
            observation_type='finance_spend',
            observation_key='total_spent',
            value_json={'value': metrics['total_spent']},
            confidence_score=1.0,
        ))

        result = {
            'summary': metrics['summary'],
            'structured_result': metrics,
            'confidence_score': 0.92,
            'observation_ids': observation_ids,
        }

        self.guardrails.assert_confidence(envelope, result['confidence_score'])
        return result

    def _compute_metrics(self, tx: dict) -> dict:
        # deterministic metrics trước, không phụ thuộc LLM
        total_spent = sum(item['amount_cents'] for item in tx.get('items', []))
        return {
            'total_spent': total_spent,
            'summary': f'Tổng chi trong kỳ là {total_spent} cents',
        }
```

---

## 20. Python: dispatcher

```py
from app.agents.spend_analysis_agent import SpendAnalysisAgent
from app.agents.budget_forecast_agent import BudgetForecastAgent
from app.agents.recommendation_agent import RecommendationAgent
from app.agents.evidence_collector_agent import EvidenceCollectorAgent

class TaskDispatcher:
    def __init__(self, repos, publisher, agents: dict[str, object]):
        self.repos = repos
        self.publisher = publisher
        self.agents = agents

    async def dispatch(self, envelope):
        task = await self.repos.tasks.get(envelope.workflow_task_id)
        await self.repos.tasks.mark_running(task.id)

        try:
            agent = self.agents[task.task_type]
            output = await agent.execute(envelope)

            await self.repos.tasks.mark_succeeded(task.id, output)
            await self.repos.runs.try_progress(task.workflow_run_id)

        except Exception as exc:
            attempt = task.attempt_count + 1
            if attempt < task.max_attempts:
                await self.repos.tasks.mark_retrying(task.id, str(exc), attempt)
                await self.publisher.publish_retry(task.routing_key, envelope.model_dump())
            else:
                await self.repos.tasks.mark_failed(task.id, str(exc), attempt)
                await self.publisher.publish_dlq(task.routing_key, envelope.model_dump())
```

---

## 21. Retry + DLQ logic

## 21.1 Rule

- agent exception nhẹ → gửi retry queue
- guardrail block cố định → fail ngay hoặc blocked ngay
- tool timeout quá số lần → DLQ
- invalid schema → DLQ luôn

## 21.2 Retry strategy đề xuất

- attempt 1 → retry sau 15s
- attempt 2 → retry sau 60s
- attempt 3 → DLQ

Để dễ làm, bạn có thể có 3 retry queues với TTL khác nhau, hoặc 1 retry queue cho giai đoạn đầu.

---

## 22. Orchestrator aggregate + scoring

Sau khi tasks hoàn tất, orchestrator sẽ tổng hợp.

## 22.1 Aggregate service

```ts
async aggregateRun(workflowRunId: string) {
  const tasks = await this.workflowTaskRepo.findByRunId(workflowRunId);

  const allDone = tasks.every(t => ['SUCCEEDED', 'FAILED', 'SKIPPED', 'BLOCKED', 'TIMED_OUT', 'DLQ'].includes(t.status));
  if (!allDone) return;

  const succeeded = tasks.filter(t => t.status === 'SUCCEEDED');
  const failed = tasks.filter(t => ['FAILED', 'DLQ', 'TIMED_OUT'].includes(t.status));

  const observations = await this.observationRepo.findByRunId(workflowRunId);
  const assertions = await this.assertionRepo.findByRunId(workflowRunId);

  const score = this.scoringService.compute({
    succeededCount: succeeded.length,
    failedCount: failed.length,
    observations,
    assertions,
  });

  await this.signalRepo.create({
    workflowRunId,
    signalName: 'run_quality_score',
    signalValue: score.label,
    score: score.value,
    confidenceScore: score.confidence,
    explanation: score.explanation,
    payload: score.payload,
  });

  await this.workflowRunRepo.updateStatus(
    workflowRunId,
    failed.length > 0 && succeeded.length > 0 ? 'PARTIAL' : failed.length > 0 ? 'FAILED' : 'COMPLETED',
  );
}
```

## 22.2 Scoring gợi ý

Ví dụ score tổng hợp:

- đủ evidence: +0.2
- spend analysis thành công: +0.25
- forecast thành công: +0.25
- recommendation thành công: +0.2
- confidence trung bình cao: +0.1

---

## 23. Guardrails bắt buộc

## 23.1 Auth / workspace boundary

Mọi request sang agent và tool call phải mang:

- `workspace_id` hoặc `org_id`
- `requested_by_user_id`
- scopes

Agent không được gọi tool nếu scope không hợp lệ.

## 23.2 Tool policy

Mỗi `task_type` có danh sách tool được phép.

Ví dụ:

```ts
const TOOL_POLICY = {
  evidence_collect: ['get_budget_snapshot', 'search_finance_knowledge'],
  spend_analysis: ['search_transactions', 'get_budget_snapshot'],
  budget_forecast: ['search_transactions', 'get_budget_snapshot', 'search_finance_knowledge'],
  recommendation: ['get_goal_progress', 'search_finance_knowledge'],
};
```

## 23.3 Timeout / budget

Mỗi task có:

- `timeout_seconds`
- `cost_budget_cents`

Worker phải enforce trước khi gọi tool / model.

## 23.4 Confidence threshold

Nếu output dưới ngưỡng, task:

- `BLOCKED`
- hoặc `FAILED`
- hoặc `PARTIAL` nếu policy cho phép

## 23.5 Visibility constraint

Nếu tool trả source thuộc tenant khác hoặc scope mismatch → block.

## 23.6 Idempotency

- request API vào orchestrator cần `idempotency_key`
- publish event cần `message_id`
- worker xử lý task dựa trên `workflow_task_id` và trạng thái hiện tại để tránh chạy trùng

---

## 24. API entrypoint gợi ý trong NestJS

```ts
@Post('budget-review')
async createBudgetReview(@Body() dto: CreateBudgetReviewDto, @Req() req) {
  const run = await this.orchestrator.createRunAndPlan({
    workflowName: 'finance_budget_review_v1',
    workspaceId: dto.workspaceId,
    orgId: dto.orgId,
    requestedByUserId: req.user.id,
    requestPayload: {
      budgetId: dto.budgetId,
      goalId: dto.goalId,
      analysisWindowDays: dto.analysisWindowDays ?? 30,
    },
  });

  await this.orchestrator.dispatchReadyTasks(run.id);

  return {
    workflowRunId: run.id,
    status: 'PLANNED',
  };
}
```

## Query status endpoint

```ts
@Get('runs/:id')
async getRun(@Param('id') id: string) {
  return this.intelligenceQueryService.getRunDetail(id);
}
```

---

## 25. Thứ tự code nên làm

## Sprint A — DB + topology

1. tạo schema `intelligence`
2. migration 7 bảng:
   - workflow_runs
   - workflow_tasks
   - tool_call_logs
   - source_records
   - observations
   - assertions
   - signals
3. thêm RabbitMQ topology service
4. assert exchanges + queues + retry + DLQ

## Sprint B — NestJS orchestrator

1. `WorkflowTemplateService`
2. `OrchestratorService`
3. `WorkflowRunRepository`
4. `WorkflowTaskRepository`
5. API create run
6. dispatch ready tasks
7. run status API

## Sprint C — Python AI worker

1. aio-pika consumer
2. task dispatcher
3. 1 agent đầu tiên: `EvidenceCollectorAgent`
4. 1 agent thứ hai: `SpendAnalysisAgent`
5. persist observations + tool logs
6. retry + DLQ

## Sprint D — Archestra MCP integration

1. tạo `ArchestraClient`
2. map allowed tools theo task type
3. log tool calls
4. enforce workspace/org headers
5. handle timeout / blocked / confidence threshold

## Sprint E — aggregate + scoring

1. aggregate service
2. scoring service
3. create signals
4. mark workflow_runs completed / partial / failed
5. optional: project sang `ai_analysis_results`

---

## 26. Những thứ không nên làm lúc đầu

- không cho agent tự chọn task tiếp theo
- không cho agent gọi tool ngoài allowlist
- không cho orchestrator reasoning kiểu chat
- không cho worker ghi lung tung vào business tables
- không gắn full RAG/LLM vào mọi task từ đầu

Lúc đầu hãy giữ:

- deterministic planner
- bounded-task worker
- strict tool policy
- DB-first execution state

---

## 27. Mapping gần với Finance hiện tại

### Task type → use case

- `evidence_collect`
  - lấy budget snapshot
  - lấy goal progress
  - lấy monthly summaries

- `spend_analysis`
  - phân tích transaction windows
  - top category
  - burn rate

- `budget_forecast`
  - baseline forecast
  - risk estimate

- `recommendation`
  - simple suggestions theo output từ spend + forecast + goal

### Sau này sang CRM

Bạn chỉ cần thêm task types mới:

- `collection_risk_analysis`
- `customer_payment_behavior`
- `lead_health_signal`
- `crm_action_recommendation`

Không cần đổi lõi orchestrator.

---

## 28. Công thức triển khai dễ nhớ

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
→ completed / partial / failed
```

---

## 29. Kết luận

Nếu bạn làm đúng theo tài liệu này thì:

- `Intelligence Orchestrator` sẽ là **deterministic control plane**
- `RabbitMQ` sẽ là **task pipeline backbone**
- `Python AI service` sẽ là **bounded-task execution layer**
- `Archestra` sẽ là **MCP gateway / tool governance layer**
- `PostgreSQL` sẽ là **execution state + evidence store**

Đây là hướng rất phù hợp với dự án của bạn vì:

- vẫn cắm được vào backend hiện tại
- mở rộng dần sang Finance AI trước
- sau đó sang CRM AI mà không phải đập lại kiến trúc
- guardrails rõ ràng, dễ audit, dễ debug
