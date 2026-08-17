# Business database & API guide

This is the single source of truth for the business module. Keep it updated with every entity or migration change. The migration `1779000000000-add-business-search-indexes.ts` records the search-index changes made with this module.

## Admin dashboard

`GET /api/business/dashboard` returns KPI clients/projects/tasks, payment-based revenue and growth, chart data, sales-pipeline values, today workload, and quick-focus counts for the current active organization.

## API contract

All responses use one envelope:

```json
{
  "statusCode": 200,
  "message": "Business resources retrieved",
  "data": [],
  "pagination": { "page": 1, "limit": 20, "total": 0, "totalPages": 0 }
}
```

Sign in through `POST /api/auth/login`; it establishes the HttpOnly `access_token` cookie used by the frontend and Swagger. The dashboard reads the HttpOnly `active_org_id` cookie, which is set by `POST /api/organizations/:orgId/select`; the browser sends both cookies automatically. The JWT strategy still accepts `Authorization: Bearer <access-token>` only as a backwards-compatible fallback. Interactive Swagger is available at `/api/docs`.

## Business dashboard

`GET /api/business/dashboard` returns UI-ready KPI cards, today's workload, sales pipeline, quick-focus counts, bottom summaries, and a `charts` object. It uses the selected `active_org_id` cookie and is available to the active `ORG_ADMIN` membership of that organization. Global `SUPER_ADMIN` and `TESTER` roles have full dashboard access even without a membership; ordinary members and other global roles receive `403`.

Use `GET /api/organizations` to list accessible organizations. Calling `POST /api/organizations/:orgId/select` validates membership and selects the active one for 30 days. If a user has only one active organization, login selects it automatically. `x-org-id` remains an optional fallback for dashboard calls made from Postman or legacy clients.

Every chart uses the same FE-friendly shape: `{ "type": "bar|line|doughnut", "labels": [...], "series": [{ "name": "...", "data": [...] }] }`. Current charts cover sales pipeline, tasks by status, and six-month cash flow.

Money values are returned as decimal strings in cents so JavaScript clients do not lose precision on PostgreSQL `bigint` values. Finance totals are grouped by currency and must not be added together without conversion.

| Group         | Resource URL (`/api/business/{resource}`) | Table                | Search fields                           |
| ------------- | ----------------------------------------- | -------------------- | --------------------------------------- |
| CRM           | `crm-customers`                           | `crm_customers`      | name, industry, email, phone, stage     |
| CRM           | `crm-contacts`                            | `crm_contacts`       | fullName, email, phone, title, notes    |
| CRM           | `crm-activities`                          | `crm_activities`     | type, summary                           |
| Workflow      | `statuses`                                | `statuses`           | entityType, name                        |
| Workflow      | `work-types`                              | `work_types`         | name, color                             |
| Projects      | `projects`                                | `projects`           | name, description                       |
| Projects      | `tasks`                                   | `tasks`              | title, description                      |
| Finance       | `invoices`                                | `invoices`           | number, currency                        |
| Finance       | `expenses`                                | `org_expenses`       | category, note, currency                |
| Time          | `attendance`                              | `attendance_records` | status, note                            |
| Time          | `timesheets`                              | `timesheet_entries`  | status, description                     |
| Communication | `conversations`                           | `conversations`      | title, type                             |
| Communication | `messages`                                | `messages`           | body                                    |
| Communication | `emails`                                  | `emails`             | fromEmail, subject, body, providerMsgId |
| Communication | `reports`                                 | `reports`            | type, fileUrl                           |

Every resource supports `GET`, `POST`, `GET /:id`, `PATCH /:id`, and `DELETE /:id`. Collection calls accept `page` (default 1), `limit` (maximum 100), `q`, `sortBy`, and `order=ASC|DESC`. Exact filters use URL-encoded JSON in `filters`, for example: `/api/business/tasks?filters=%7B%22statusId%22%3A%22...%22%7D&q=proposal`.

## Related tables

`project_members`, `task_assignees`, `invoice_items`, `invoice_payments`, and `conversation_members` are join/detail tables. They are intentionally not exposed through the generic CRUD route because they do not contain `org_id`; creating a generic route would permit a cross-organization IDOR vulnerability. Add narrowly-scoped nested endpoints (for example `/invoices/:invoiceId/items`) when their parent workflow is defined.

## Search performance

All queries scope by `org_id`, paginate at the database, whitelist sort/filter columns, and use parameter binding. Existing composite indexes cover lifecycle filters; the new `pg_trgm` GIN indexes accelerate `%q%` search on the busiest text fields. Run the migration before load testing and verify plans with `EXPLAIN (ANALYZE, BUFFERS)` using production-like data.

## Test checklist

1. Log in in `/api/docs`; the browser stores the HttpOnly authentication cookie.
2. Call `GET /api/organizations`, then `POST /api/organizations/:orgId/select` for users with multiple organizations.
3. Create workflow statuses and work types, then create a customer, project, task, invoice, and expense.
4. Verify pagination, `q`, exact `filters`, invalid resource, invalid UUID, foreign organization, update, and delete cases.
5. Confirm each successful response matches the envelope above and each unauthorized/invalid request follows the global error envelope.
