# Finance CRM AI Roadmap

## 1. Mục tiêu tài liệu

Tài liệu này gom lại toàn bộ định hướng triển khai cho dự án **Finance CRM** theo hướng:

- Giữ **core backend** ở dạng **modular monolith** để dễ maintain và triển khai nhanh.
- Dùng **RabbitMQ** cho async workflow và tách các tác vụ nặng khỏi HTTP request.
- Tách **AI Service** riêng bằng **Python** để xử lý phân tích chi tiêu, dự báo ngân sách, đề xuất.
- Thêm **RAG Store** để AI có ngữ cảnh nội bộ và trả lời sát dữ liệu thật.
- Thêm **MCP Server** để chuẩn hóa cách AI truy cập tools, resources, prompts và mở rộng sang CRM sau này.

Tài liệu này ưu tiên tính **thực chiến**: đọc xong có thể bắt đầu cắm dần vào code hiện tại.

---

## 2. Đánh giá định hướng hiện tại

### 2.1 Nên giữ backend hiện tại như thế nào?

Với cấu trúc DB Finance CRM hiện tại, hướng phù hợp nhất là:

- **Không tách full microservice ngay**
- **Giữ 1 backend NestJS chính**
- **Tách module rõ ràng trong code**
- **Chỉ tách AI Service thành service riêng**

Lý do:

- Domain của bạn khá rộng: Finance, CRM, Billing, Reports, RBAC, multi-tenant.
- Nếu tách microservice quá sớm sẽ tăng mạnh độ phức tạp: auth giữa service, message consistency, retry, monitoring, deploy pipeline, debugging.
- Trong giai đoạn hiện tại, thứ đáng tách nhất là **AI** vì nó nặng, async, dễ scale riêng, và có thể dùng Python cho ML/LLM dễ hơn.

### 2.2 Kiến trúc nên đi

```text
Frontend
   ↓
NestJS Finance CRM API (modular monolith)
   ├── PostgreSQL
   ├── RabbitMQ
   ├── Redis (optional)
   └── Background consumers / scheduled jobs

Python AI Service
   ├── RabbitMQ consumer
   ├── analytics engine
   ├── LLM orchestration
   ├── RAG retriever
   └── MCP Server

RAG Store
   ├── ai_knowledge_documents
   ├── ai_knowledge_chunks
   └── pgvector index
```

---

## 3. Tư duy triển khai tổng thể

### 3.1 Tách rõ vai trò từng thành phần

#### NestJS core backend
Chịu trách nhiệm:

- Auth, RBAC, multi-tenant
- Finance CRUD
- CRM CRUD
- Billing / webhook / invoices / payments
- Publish domain events
- API cho frontend

#### RabbitMQ
Chịu trách nhiệm:

- Làm cầu nối async giữa backend và worker
- Tách tác vụ nặng khỏi request đồng bộ
- Retry, DLQ, route event, fan-out workflow

#### Python AI Service
Chịu trách nhiệm:

- Phân tích chi tiêu
- Dự báo ngân sách
- Đề xuất đơn giản
- Sau này mở rộng sang CRM AI
- Gọi model, orchestrate prompt, save result

#### RAG Store
Chịu trách nhiệm:

- Lưu tri thức nội bộ của hệ thống
- Cho AI truy xuất đúng context trước khi phân tích
- Tách khỏi raw transactional queries

#### MCP Server
Chịu trách nhiệm:

- Expose resources
- Expose tools
- Expose prompts
- Chuẩn hóa cách AI/client gọi dữ liệu và hành động

---

## 4. Roadmap triển khai theo giai đoạn

# Giai đoạn 1 — Foundation

## 4.1 Mục tiêu

Dựng nền để hệ thống có thể:

- giữ code hiện tại ổn định
- thêm async workflow mà không phá logic cũ
- sẵn sàng để cắm AI dần vào

## 4.2 Việc phải làm

### A. Giữ core backend Finance CRM dạng modular monolith

Tổ chức lại code theo module rõ ràng:

```text
src/modules/
  auth/
  users/
  organizations/
  permissions/
  finance/
    accounts/
    transactions/
    budgets/
    goals/
    recurring-rules/
    reports/
  billing/
    plans/
    subscriptions/
    payments/
    webhooks/
  crm/
    customers/
    contacts/
    activities/
  work/
    projects/
    tasks/
    timesheets/
  ai/
    ai-events/
    ai-analysis/
    ai-results/
    ai-knowledge/
  integrations/
    rabbitmq/
```

Mỗi module nên có:

```text
controller
service
repository
entity
DTO
mapper
```

### B. Thêm RabbitMQ

#### Exchange đề xuất

```text
domain.events
ai.jobs
notifications.events
```

#### Routing key đề xuất

```text
finance.transaction.created
finance.transaction.updated
finance.budget.updated
finance.goal.updated
finance.invoice.created
finance.report.generated
billing.payment.succeeded
billing.payment.failed
crm.activity.created
```

#### Queue đề xuất ban đầu

```text
ai.finance.analysis.queue
ai.finance.forecast.queue
ai.finance.recommendation.queue
notification.email.queue
audit.log.queue
```

### C. Thêm bảng AI trong PostgreSQL

#### Bảng 1: ai_analysis_jobs
Dùng để lưu job AI đã được tạo.

Gợi ý cột:

- id
- scope_type (PERSONAL / ORG)
- workspace_id
- org_id
- analysis_type (SPEND_ANALYSIS / BUDGET_FORECAST / SIMPLE_RECOMMENDATION)
- status (PENDING / RUNNING / COMPLETED / FAILED)
- requested_by_user_id
- trigger_event
- input_snapshot jsonb
- started_at
- finished_at
- error_message
- created_at

#### Bảng 2: ai_analysis_results
Dùng để lưu kết quả AI để frontend đọc lại nhanh.

Gợi ý cột:

- id
- job_id
- summary_text
- structured_result jsonb
- confidence_score
- model_name
- prompt_version
- created_at

#### Bảng 3: ai_knowledge_documents
Dùng cho RAG, lưu tài liệu nguồn.

Gợi ý cột:

- id
- scope_type
- workspace_id
- org_id
- source_type (REPORT / POLICY / NOTE / CRM_ACTIVITY / INVOICE_NOTE / SUMMARY)
- source_id
- title
- content
- metadata jsonb
- created_at
- updated_at

#### Bảng 4: ai_knowledge_chunks
Dùng cho RAG chunk + embedding.

Gợi ý cột:

- id
- document_id
- chunk_index
- content
- embedding vector
- metadata jsonb
- created_at

### D. Publish event từ các nghiệp vụ Finance

Bạn phải thêm event publishing vào những service chính sau:

#### TransactionService
Sau khi tạo transaction thành công:

```text
finance.transaction.created
```

#### BudgetService
Sau khi create/update budget:

```text
finance.budget.updated
```

#### GoalService
Sau khi create/update goal:

```text
finance.goal.updated
```

#### InvoiceService
Sau khi tạo invoice:

```text
finance.invoice.created
```

### E. Rule triển khai

- Chỉ publish event **sau khi DB transaction commit thành công**
- Payload event phải gọn, chỉ chứa id và scope cần thiết
- Không publish full record quá lớn

Ví dụ payload:

```json
{
  "event_id": "uuid",
  "event_name": "finance.transaction.created",
  "workspace_id": "uuid",
  "org_id": null,
  "user_id": "uuid",
  "transaction_id": "uuid",
  "occurred_at": "2026-04-01T10:00:00Z"
}
```

## 4.3 Kết quả mong muốn sau giai đoạn 1

- Backend core vẫn chạy bình thường
- RabbitMQ đã vào hệ thống
- Event đã phát từ Finance/Billing
- DB đã có bảng cho AI và RAG
- Chưa có AI thật nhưng hạ tầng đã sẵn

---

# Giai đoạn 2 — Finance AI MVP

## 5.1 Mục tiêu

Làm AI bản đầu có giá trị thực:

- Phân tích chi tiêu
- Dự báo ngân sách
- Đề xuất đơn giản

## 5.2 Tách AI Service bằng Python

Khuyên dùng:

- Python
- FastAPI
- RabbitMQ client
- PostgreSQL client
- OpenAI SDK

Cấu trúc service đề xuất:

```text
ai_service/
  app/
    api/
    consumers/
    services/
    analytics/
    prompts/
    rag/
    repositories/
    schemas/
    config/
```

## 5.3 Flow xử lý

```text
NestJS publish event
   ↓
RabbitMQ
   ↓
Python AI consumer nhận job
   ↓
load dữ liệu từ PostgreSQL
   ↓
calculate metrics deterministic
   ↓
call model
   ↓
save ai_analysis_results
   ↓
frontend đọc kết quả hoặc nhận notify
```

## 5.4 3 bài toán AI cần làm đầu tiên

### A. Spend Analysis

Input:

- transactions 30/60/90 ngày
- categories
- accounts
- budgets liên quan

Phần hệ thống phải tự tính trước:

- total spent
- total income
- net cashflow
- top spending categories
- average daily spend
- trend so với kỳ trước
- anomaly đơn giản

AI chỉ nên làm:

- giải thích xu hướng
- tóm tắt insight
- nêu rủi ro

Output gợi ý:

```json
{
  "top_spending_category": "Marketing",
  "spend_growth_percent": 18.2,
  "risk_level": "HIGH",
  "insights": [
    "Chi tiêu marketing tăng mạnh trong 2 tuần gần đây"
  ]
}
```

### B. Budget Forecast

Input:

- budget hiện tại
- lịch sử chi tiêu
- recurring rules

Hệ thống tự tính trước:

- budget_used_percent
- remaining_budget
- burn_rate
- simple baseline forecast

AI làm:

- diễn giải khả năng vượt budget
- nêu nguyên nhân chính
- tạo narrative dễ hiểu

Output gợi ý:

```json
{
  "forecast_amount_cents": 12300000,
  "over_budget_probability": 0.81,
  "drivers": ["marketing_ads", "subscription_renewal"],
  "summary": "Nếu giữ tốc độ hiện tại, bạn có thể vượt ngân sách trong 9 ngày tới"
}
```

### C. Simple Recommendation

Input:

- spend analysis result
- budget forecast result
- goals

AI làm:

- 2–3 đề xuất ngắn
- có lý do
- không phức tạp

Output gợi ý:

```json
{
  "recommendations": [
    "Giảm ngân sách Ads 10% trong 2 tuần tới",
    "Tạm hoãn chi phí mua công cụ không bắt buộc",
    "Chuyển thêm 5% ngân sách sang mục tiêu quỹ dự phòng"
  ]
}
```

## 5.5 Caching kết quả

Mỗi lần AI chạy xong phải lưu `ai_analysis_results`.

Lợi ích:

- UI load nhanh
- tránh gọi model liên tục
- có lịch sử để so sánh
- sau này dùng lại cho RAG

## 5.6 UI nên hiển thị gì?

### Budget

- % đã dùng
- amount đã dùng / còn lại
- dự báo cuối kỳv
- cảnh báo vượt budget
- insight ngắn

Ví dụ:

```text
Budget Marketing: 10,000,000
Đã dùng: 7,200,000 (72%)
Dự báo cuối tháng: 12,300,000
⚠ Có nguy cơ vượt budget 23%
```

### Goal

- mục tiêu
- tiến độ đạt mục tiêu
- expected completion
- AI coaching note

Ví dụ:

```text
Goal: Quỹ dự phòng 100,000,000
Đã đạt: 65,000,000 (65%)
Nếu giữ tốc độ hiện tại, bạn sẽ đạt mục tiêu trong 4 tháng nữa
```

## 5.7 Kết quả mong muốn sau giai đoạn 2

- Có AI thật cho Finance
- Có dashboard insight hấp dẫn hơn
- Có data result để tái sử dụng
- AI vẫn còn đơn giản nhưng đã hữu ích

---

# Giai đoạn 3 — RAG

## 6.1 Mục tiêu

Làm AI trả lời có căn cứ từ dữ liệu nội bộ thay vì chỉ dựa vào raw metrics.

## 6.2 Nguồn dữ liệu nên ingest vào knowledge base

Ưu tiên từ dễ đến hữu ích:

1. monthly summaries
2. generated reports
3. budget notes
4. goal notes
5. invoice notes
6. payment failure reasons
7. CRM activities liên quan collection/customer behavior
8. policy docs nội bộ

## 6.3 Cách ingest

### Bước 1: tạo document

Lưu vào `ai_knowledge_documents`:

- source_type
- title
- raw content
- tenant scope

### Bước 2: chunk content

Chunk size gợi ý:

- 200–500 tokens
- overlap nhẹ nếu cần

Lưu vào `ai_knowledge_chunks`.

### Bước 3: tạo embedding

Tạo embedding cho từng chunk rồi lưu vào cột vector.

## 6.4 Dùng gì cho vector store?

Đề xuất mạnh nhất cho giai đoạn hiện tại:

- **PostgreSQL + pgvector**

Lý do:

- cùng hệ DB với dự án hiện tại
- dễ filter theo `workspace_id` / `org_id`
- dễ triển khai hơn so với thêm một vector DB riêng

## 6.5 Retriever phải có tenant filtering

Bất kỳ retrieval nào cũng phải lọc theo:

- `workspace_id`
- hoặc `org_id`

Đây là rule bắt buộc để tránh lộ dữ liệu tenant khác.

## 6.6 Flow RAG

```text
AI job nhận request
   ↓
build retrieval query
   ↓
query top-k chunks trong cùng workspace/org
   ↓
ghép chunk context + metrics deterministic
   ↓
gọi model
   ↓
lưu result
```

## 6.7 Ví dụ hiệu quả của RAG

Không có RAG:

```text
Bạn đang chi quá nhiều cho marketing
```

Có RAG:

```text
Bạn đang chi quá nhiều cho marketing. Xu hướng này đã lặp lại 3 kỳ gần nhất, và trong budget note tháng này có mục tiêu kiểm soát quảng cáo dưới 30% tổng chi phí.
```

## 6.8 Kết quả mong muốn sau giai đoạn 3

- AI trả lời có căn cứ hơn
- Có "trí nhớ doanh nghiệp" cho Finance
- Bắt đầu sẵn sàng mở rộng sang CRM AI

---

# Giai đoạn 4 — MCP

## 7.1 Mục tiêu

Chuẩn hóa cách AI và client truy cập dữ liệu, tools và prompts.

## 7.2 Hiểu MCP đúng cách

MCP không phải nơi chứa business logic chính.

MCP là lớp giao tiếp để:

- expose resources
- expose tools
- expose prompts
- giúp model/client gọi đúng thứ được phép gọi

## 7.3 Nên bắt đầu MCP ở đâu?

Bắt đầu bằng cách tích hợp MCP vào chính Python AI Service.

Sau này nếu lớn lên mới tách MCP Server riêng.

## 7.4 Resources nên expose

Ví dụ:

```text
finance://workspace/{id}/budget/current
finance://workspace/{id}/goal/current
finance://workspace/{id}/monthly-summary/{yyyy-mm}
finance://workspace/{id}/top-categories
crm://org/{id}/overdue-invoices
crm://org/{id}/customer-payment-behavior
```

Resource là dữ liệu để model đọc context.

## 7.5 Tools nên expose

Ví dụ:

```text
search_transactions
get_budget_snapshot
get_goal_progress
get_spending_anomalies
get_invoice_overdue_summary
generate_finance_brief
```

Tool là function để model gọi.

## 7.6 Prompts nên expose

Ví dụ:

```text
budget-review
monthly-finance-summary
goal-coach
overdue-invoice-review
```

Prompt là template workflow có tham số.

## 7.7 Khi nào cần deep research mode?

Nếu sau này bạn muốn dùng mode kiểu research sâu, bạn có thể thêm:

- `search`
- `fetch`

Nhưng giai đoạn đầu chưa bắt buộc. Nên ưu tiên operational MCP trước.

## 7.8 Flow MCP sau cùng

```text
Client AI / LLM
   ↓
MCP Server
   ├── resources
   ├── tools
   └── prompts
   ↓
AI Service / PostgreSQL / RAG Store / Backend APIs
```

## 7.9 Kết quả mong muốn sau giai đoạn 4

- AI stack chuyên nghiệp hơn
- Mở rộng sang CRM AI dễ hơn
- Dễ kết nối với external AI clients về sau

---

## 8. RabbitMQ triển khai cụ thể cho code hiện tại

### 8.1 Nên dùng RabbitMQ để làm gì?

Trong dự án Finance CRM này, RabbitMQ nên dùng cho:

- AI analysis jobs
- PDF/report generation
- email sending
- notifications
- webhook hậu xử lý
- CRM activity enrichment

### 8.2 Không nên dùng RabbitMQ cho gì?

- CRUD đồng bộ cơ bản
- business rule chính bắt buộc phải xong ngay mới trả response
- transaction DB nội bộ ngắn và nhẹ

### 8.3 Pattern queue nên áp dụng

#### Domain event publish
Ví dụ `finance.transaction.created`

#### AI job fan-out
Một transaction mới có thể dẫn tới:

- spend analysis update
- budget forecast refresh
- recommendation refresh

#### Retry + dead-letter queue
Mỗi queue AI nên có:

- retry max 3
- dead-letter queue
- log lỗi rõ ràng

### 8.4 Queue naming đề xuất

```text
ai.finance.analysis.queue
ai.finance.forecast.queue
ai.finance.recommendation.queue
ai.finance.dlq
```

---

## 9. Service layer và SOLID áp dụng vào dự án này

### 9.1 Luồng chuẩn trong NestJS

```text
Controller
   ↓
Service (business orchestration)
   ↓
Repository / Provider / Publisher
```

### 9.2 Service xử lý business là gì?

Là nơi quyết định flow nghiệp vụ.

Ví dụ `CreateTransactionService`:

- validate rule
- save transaction
- update balances nếu có
- publish domain event
- return result

Nó **không nên**:

- ôm SQL dài dòng
- tự gọi model AI
- tự làm network logic rối rắm

### 9.3 Áp dụng SOLID ngắn gọn

#### S — Single Responsibility
Mỗi service chỉ làm 1 việc chính.

Ví dụ:

- `TransactionService` tạo transaction
- `BudgetForecastTriggerService` chỉ kích trigger forecast
- `AiResultQueryService` chỉ đọc result

#### O — Open/Closed
Thêm loại AI analysis mới mà ít sửa code cũ.

Ví dụ:

- `SpendAnalysisHandler`
- `BudgetForecastHandler`
- `GoalRecommendationHandler`

#### I — Interface Segregation
Tách interface nhỏ:

- `AnalysisJobPublisher`
- `BudgetSnapshotProvider`
- `KnowledgeRetriever`

#### D — Dependency Inversion
Service phụ thuộc abstraction chứ không new cứng implementation.

---

## 10. Cách cắm dần vào code hiện tại

### Bước 1
Thêm module tích hợp RabbitMQ vào NestJS.

### Bước 2
Thêm event publisher service.

### Bước 3
Sửa 4 service:

- TransactionService
- BudgetService
- GoalService
- InvoiceService

để publish event sau commit.

### Bước 4
Thêm migration cho 4 bảng AI.

### Bước 5
Dựng Python AI service bản đầu chỉ với 1 queue consumer.

### Bước 6
Làm 1 pipeline AI trước: `spend_analysis`.

### Bước 7
Mở rộng sang `budget_forecast`.

### Bước 8
Mở rộng sang `simple_recommendation`.

### Bước 9
Làm knowledge documents + chunks.

### Bước 10
Bật RAG retriever.

### Bước 11
Expose MCP resources/tools/prompts.

---

## 11. Timeline gợi ý triển khai

### Sprint 1
- Modular cleanup
- RabbitMQ setup
- Domain event publisher
- Publish event từ transaction/budget/goal/invoice
- AI tables migration

### Sprint 2
- Python AI service skeleton
- Consumer analysis queue
- Spend analysis MVP
- Save ai_analysis_results

### Sprint 3
- Budget forecast MVP
- Recommendation MVP
- Dashboard hiển thị insights

### Sprint 4
- ai_knowledge_documents
- ai_knowledge_chunks
- embedding pipeline
- retriever theo workspace/org

### Sprint 5
- MCP resources
- MCP tools
- MCP prompts
- auth / scoping / logging / auditing

---

## 12. Kiến trúc cuối cùng nên hướng tới

```text
[ Frontend ]
   ↓
[ NestJS Finance CRM API ]
   ├── Finance modules
   ├── Billing modules
   ├── CRM modules
   ├── AI results query
   ├── RabbitMQ publisher
   └── PostgreSQL

[ RabbitMQ ]
   ├── domain.events exchange
   ├── ai.jobs exchange
   ├── ai.finance.analysis.queue
   ├── ai.finance.forecast.queue
   └── ai.finance.recommendation.queue

[ Python AI Service ]
   ├── analysis consumers
   ├── deterministic metrics engine
   ├── RAG retriever
   ├── LLM orchestration
   └── MCP server

[ PostgreSQL + pgvector ]
   ├── core business tables
   ├── ai_analysis_jobs
   ├── ai_analysis_results
   ├── ai_knowledge_documents
   └── ai_knowledge_chunks
```

---

## 13. Quyết định kỹ thuật chốt

### Nên làm

- Giữ NestJS core dạng modular monolith
- RabbitMQ cho async
- Python AI service riêng
- pgvector trong PostgreSQL cho RAG store
- MCP triển khai dần trong AI service

### Chưa nên làm ngay

- Tách full microservice cho toàn hệ thống
- Kafka nếu hiện tại chủ yếu là task queue workflow
- Vector DB riêng nếu pgvector đã đủ
- Deep research mode ngay từ đầu

---

## 14. Checklist triển khai nhanh

### Backend
- [ ] Tách module rõ ràng
- [ ] Thêm RabbitMQ module
- [ ] Thêm domain event publisher
- [ ] Publish event ở transaction/budget/goal/invoice
- [ ] Thêm AI migrations

### AI Service
- [ ] Dựng FastAPI service
- [ ] RabbitMQ consumer
- [ ] PostgreSQL read/write
- [ ] Spend analysis
- [ ] Budget forecast
- [ ] Recommendation

### RAG
- [ ] ai_knowledge_documents
- [ ] ai_knowledge_chunks
- [ ] chunking pipeline
- [ ] embedding pipeline
- [ ] tenant-aware retriever

### MCP
- [ ] resources
- [ ] tools
- [ ] prompts
- [ ] auth + scope filter
- [ ] logging / audit

---

## 15. Kết luận ngắn gọn

### Hướng phù hợp nhất với dự án hiện tại

- Core app: **NestJS modular monolith**
- Async workflow: **RabbitMQ**
- AI riêng: **Python AI Service**
- Knowledge grounding: **RAG Store bằng PostgreSQL + pgvector**
- Chuẩn hóa AI access: **MCP Server**

### Logic triển khai đúng

1. Dựng nền trước
2. Làm AI Finance MVP trước
3. Bổ sung RAG để AI có căn cứ
4. Bổ sung MCP để chuyên nghiệp hóa và mở rộng sang CRM

### Tư duy quan trọng

- Đừng bắt AI thay thế toàn bộ logic hệ thống
- Hãy để hệ thống tự tính các chỉ số cứng
- AI chỉ nên giải thích, dự báo, đề xuất trên nền dữ liệu đã được chuẩn hóa
- RAG giúp AI “nói đúng theo dữ liệu nội bộ”
- MCP giúp AI “gọi đúng thứ cần gọi” theo chuẩn lâu dài

---

## 16. Tài liệu tham khảo

- RabbitMQ Queues: https://www.rabbitmq.com/docs/queues
- RabbitMQ Exchanges: https://www.rabbitmq.com/docs/exchanges
- MCP Intro: https://modelcontextprotocol.io/docs/getting-started/intro
- MCP Architecture: https://modelcontextprotocol.io/docs/learn/architecture
- MCP Resources Spec: https://modelcontextprotocol.io/specification/2025-06-18/server/resources
- OpenAI MCP Guide: https://developers.openai.com/api/docs/guides/tools-connectors-mcp
- pgvector: https://github.com/pgvector/pgvector

