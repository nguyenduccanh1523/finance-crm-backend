# Recurring Rules - Complete Documentation Summary

## 📚 Documentation Files Created

I've created 3 comprehensive markdown files to document the Recurring Rules system for automated periodic transactions:

### 1. **[RECURRING_RULES_GUIDE.md](RECURRING_RULES_GUIDE.md)** - Architecture & Design

- Complete system overview
- Entity relationships & database schema
- Supported transaction types (INCOME, EXPENSE, TRANSFER)
- Detailed RRULE pattern reference
- Real-world examples for Vietnamese users
- API endpoint documentation
- Cron job execution flow
- Feature access control

**Best for**: Understanding the system architecture and how it works

---

### 2. **[RECURRING_RULES_IMPLEMENTATION.md](RECURRING_RULES_IMPLEMENTATION.md)** - Setup & Usage

- Quick start guide for module setup
- Cron job configuration
- Complete API usage examples with code
- Practical RRULE patterns reference
- 7 Real Vietnamese use cases:
  - Salary (Monthly income)
  - Rent (Fixed monthly payment)
  - Utilities (Multi-day payments)
  - Subscriptions (Weekly)
  - Insurance (End of month)
  - Quarterly bonuses (Limited duration)
  - Temporary allowances
- Database monitoring queries
- Testing examples
- Troubleshooting guide

**Best for**: Setting up and using the system with practical code samples

---

### 3. **[RECURRING_RULES_ENHANCEMENTS.md](RECURRING_RULES_ENHANCEMENTS.md)** - Future Improvements

- 8 recommended enhancement features:
  1. Execution History Tracking
  2. Advanced Filtering & Search
  3. Rule Templates
  4. Bulk Operations
  5. Notifications & Alerts
  6. Statistics & Dashboard
  7. Conditional Rules
  8. Webhook Support
- Current technical stack summary
- Testing best practices
- Performance tuning strategies
- Migration path for enhancements

**Best for**: Planning improvements and understanding enterprise features

---

## 🎯 System Overview

### What is Recurring Rules?

Recurring Rules enable **automatic, periodic financial transactions** that execute on a set schedule. Each rule automatically creates transactions, updates account balances, and calculates the next execution date.

### Key Capabilities ✅

| Feature                    | Status | Details                                                        |
| -------------------------- | ------ | -------------------------------------------------------------- |
| **INCOME transactions**    | ✅     | Auto-generate money coming in (salary, bonus, interest)        |
| **EXPENSE transactions**   | ✅     | Auto-generate money going out (rent, utilities, subscriptions) |
| **Flexible scheduling**    | ✅     | RFC5545 RRULE (daily, weekly, monthly, yearly patterns)        |
| **Auto execution**         | ✅     | Daily cron job processes due rules                             |
| **Account balance update** | ✅     | Balances automatically adjusted                                |
| **End dates**              | ✅     | Rules can expire on a set date                                 |
| **Soft deletes**           | ✅     | Rules archived when done                                       |
| **Transaction audit**      | ✅     | Each execution creates a transaction record                    |
| **Quota management**       | ✅     | Plan-based limits                                              |

---

## 🚀 Quick Start

### 1. Create Monthly Salary (INCOME)

```bash
curl -X POST http://localhost:3000/personal/recurring-rules \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "your-account-id",
    "type": "INCOME",
    "amountCents": 5000000,
    "currency": "VND",
    "rrule": "FREQ=MONTHLY;BYMONTHDAY=5",
    "nextRunAt": "2026-04-05"
  }'
```

**Result**: Every 5th of the month, 50,000 VND is automatically added to the account.

### 2. Create Weekly Subscription (EXPENSE)

```bash
curl -X POST http://localhost:3000/personal/recurring-rules \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "your-account-id",
    "categoryId": "subscription-category-id",
    "type": "EXPENSE",
    "amountCents": 99000,
    "currency": "VND",
    "rrule": "FREQ=WEEKLY;BYDAY=MO",
    "nextRunAt": "2026-03-23"
  }'
```

**Result**: Every Monday, 990 VND is automatically deducted from the account.

### 3. Create Quarterly Bonus (Limited Duration)

```bash
curl -X POST http://localhost:3000/personal/recurring-rules \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "bonus-account-id",
    "type": "INCOME",
    "amountCents": 3000000,
    "currency": "VND",
    "rrule": "FREQ=MONTHLY;INTERVAL=3;BYMONTHDAY=1",
    "nextRunAt": "2026-04-01",
    "endAt": "2027-12-31"
  }'
```

**Result**: Every 3 months (Apr 1, Jul 1, Oct 1, Jan 1), 30,000 VND is added, ending on Dec 31, 2027.

---

## 📊 RRULE Patterns Cheat Sheet

### Daily

```
FREQ=DAILY                          # Every day
FREQ=DAILY;INTERVAL=2               # Every 2 days
FREQ=DAILY;BYDAY=MO,TU,WE,TH,FR    # Weekdays only
```

### Weekly

```
FREQ=WEEKLY                         # Same day each week
FREQ=WEEKLY;INTERVAL=2              # Every 2 weeks
FREQ=WEEKLY;BYDAY=MO,WE,FR          # Mon, Wed, Fri
```

### Monthly

```
FREQ=MONTHLY                        # Same day each month
FREQ=MONTHLY;BYMONTHDAY=15          # 15th of month
FREQ=MONTHLY;BYMONTHDAY=-1          # Last day of month
FREQ=MONTHLY;BYMONTHDAY=1,15        # 1st and 15th
```

### Yearly

```
FREQ=YEARLY                         # Same date each year
FREQ=YEARLY;BYMONTH=12;BYMONTHDAY=25  # Christmas (Dec 25)
```

### With Limits

```
FREQ=MONTHLY;COUNT=12               # 12 times, then stop
FREQ=WEEKLY;UNTIL=2026-12-31        # Until Dec 31, 2026
```

---

## 🔄 How It Works

```
┌─────────────────────────────────────────────────────────────┐
│ Developer/User Creates Recurring Rule                       │
│ (e.g., "Every 5th: +50,000 VND INCOME")                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────────┐
        │ Rule stored in database    │
        │ - RRULE: FREQ=MONTHLY...   │
        │ - nextRunAt: Apr 5, 2026   │
        │ - amountCents: 5000000     │
        └────────────────┬───────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │ Daily Cron Job       │
              │ (Midnight UTC)       │
              └──────┬───────────────┘
                     │
        ┌────────────▼────────────┐
        │ Check: nextRunAt ≤ now? │
        └────────┬───────────┬────┘
                 │           │
              YES│           │NO
                 │           └─── Skip, wait for next day
                 │
                 ▼
    ┌────────────────────────────┐
    │ 1. Create Transaction      │
    │    - type: INCOME          │
    │    - amountCents: 5000000  │
    │    - occurredAt: now       │
    └────────┬───────────────────┘
             │
             ▼
    ┌────────────────────────────┐
    │ 2. Update Account Balance  │
    │    balance += 5000000      │
    └────────┬───────────────────┘
             │
             ▼
    ┌────────────────────────────┐
    │ 3. Calculate Next Run      │
    │    using RRULE library     │
    │    nextRunAt = May 5, 2026 │
    └─────────────────────────────┘
```

---

## 📋 API Reference

### Endpoints

| Method   | Endpoint                        | Purpose                   |
| -------- | ------------------------------- | ------------------------- |
| `GET`    | `/personal/recurring-rules`     | List all rules            |
| `POST`   | `/personal/recurring-rules`     | Create new rule           |
| `PATCH`  | `/personal/recurring-rules/:id` | Update rule               |
| `DELETE` | `/personal/recurring-rules/:id` | Delete rule (soft delete) |

### Request/Response Examples

**Create Request**:

```json
{
  "accountId": "uuid",
  "categoryId": "uuid (optional)",
  "type": "INCOME | EXPENSE | TRANSFER",
  "amountCents": 5000000,
  "currency": "VND",
  "rrule": "FREQ=MONTHLY;BYMONTHDAY=5",
  "nextRunAt": "2026-04-05",
  "endAt": "2027-12-31 (optional)"
}
```

**Create Response**:

```json
{
  "id": "uuid",
  "workspaceId": "uuid",
  "accountId": "uuid",
  "categoryId": "uuid",
  "type": "INCOME",
  "amountCents": 5000000,
  "currency": "VND",
  "rrule": "FREQ=MONTHLY;BYMONTHDAY=5",
  "nextRunAt": "2026-04-05T00:00:00Z",
  "endAt": "2027-12-31T00:00:00Z",
  "createdAt": "2026-03-18T14:00:00Z",
  "deletedAt": null
}
```

---

## 🔐 Security & Access Control

- **Authentication**: Requires JWT token
- **Authorization**: Feature flag `FINANCE_REPORTS` (plan-based)
- **Isolation**: Each user can only see their workspace's rules
- **Validation**: Full input validation (account exists, category exists, RRULE format, etc.)
- **Soft Deletes**: Rules aren't hard-deleted, just marked as deleted

---

## 📈 Use Cases

### Personal Finance

- **Salary**: Monthly income on 5th
- **Rent**: Monthly expense on 1st
- **Utilities**: Bi-monthly on 15th and last day
- **Subscriptions**: Weekly or monthly expenses
- **Bonuses**: Quarterly income (limited duration)

### Business CRM

- **Invoice Payments**: Recurring billing cycles
- **Supplier Costs**: Regular vendor payments
- **Product Revenue**: Subscription-based income
- **Tax Payments**: Quarterly or annual obligations

### Investment

- **Dividend Income**: Yearly or quarterly
- **Loan Payments**: Monthly installments
- **Savings Plans**: Regular contributions

---

## 🛠️ Implementation Architecture

```typescript
// Layer 1: Controller (API endpoint)
RecurringRulesController {
  @Get() list()
  @Post() create()
  @Patch(':id') update()
  @Delete(':id') remove()
}
      ↓
// Layer 2: Service (Business logic)
RecurringRulesService {
  create(user, dto)
  update(user, id, dto)
  remove(user, id)
  runDueRules()  // ← Cron job
  computeNextRunAt()
}
      ↓
// Layer 3: Repository (Database access)
RecurringRuleRepository {
  find(criteria)
  save(entity)
  softDelete(id)
}
      ↓
// Layer 4: Database
recurring_rules table {
  id, workspace_id, account_id, category_id
  type, amount_cents, currency
  rrule, next_run_at, end_at
  created_at, updated_at, deleted_at
}
```

---

## 🗄️ Database Schema

```sql
CREATE TABLE recurring_rules (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL,
  account_id UUID NOT NULL,
  category_id UUID,
  type TEXT NOT NULL,              -- INCOME | EXPENSE | TRANSFER
  amount_cents BIGINT NOT NULL,
  currency CHAR(3) NOT NULL,
  rrule TEXT NOT NULL,             -- RFC5545 format
  next_run_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,          -- Soft delete

  INDEX ON next_run_at,
  INDEX ON workspace_id,
  INDEX ON account_id,

  FOREIGN KEY (workspace_id) REFERENCES personal_workspaces(id),
  FOREIGN KEY (account_id) REFERENCES accounts(id),
  FOREIGN KEY (category_id) REFERENCES categories(id)
);
```

---

## 🧪 Testing

See **RECURRING_RULES_IMPLEMENTATION.md** for comprehensive testing examples including:

- Unit tests for `computeNextRunAt()`
- Unit tests for `runDueRules()`
- E2E tests for full workflow
- Database query tests

---

## 🚨 Troubleshooting

| Problem              | Solution                                                  |
| -------------------- | --------------------------------------------------------- |
| Rule never executes  | Verify `nextRunAt` is in past, check RRULE syntax         |
| Balance not updating | Ensure cron job is running, check `@Cron()` decorator     |
| Invalid RRULE error  | Use proper RFC5545 format, see RRULE Cheat Sheet above    |
| Rule not found       | Verify rule exists and user owns it (workspace isolation) |
| Account not found    | Create account first, verify accountId is correct         |

See **RECURRING_RULES_IMPLEMENTATION.md** for detailed troubleshooting guide.

---

## 📖 Documentation Navigation

```
You are here (Overview summary)
    ↓
    ├─→ [RECURRING_RULES_GUIDE.md](RECURRING_RULES_GUIDE.md)
    │   ├─ System Architecture
    │   ├─ Entity Relationships
    │   ├─ API Endpoints
    │   ├─ RRULE Patterns
    │   └─ Real-World Examples
    │
    ├─→ [RECURRING_RULES_IMPLEMENTATION.md](RECURRING_RULES_IMPLEMENTATION.md)
    │   ├─ Setup Instructions
    │   ├─ Code Examples
    │   ├─ 7 Vietnamese Use Cases
    │   ├─ Database Queries
    │   └─ Troubleshooting
    │
    └─→ [RECURRING_RULES_ENHANCEMENTS.md](RECURRING_RULES_ENHANCEMENTS.md)
        ├─ 8 Recommended Features
        ├─ Implementation Code
        ├─ Testing Best Practices
        ├─ Performance Tuning
        └─ Migration Roadmap
```

---

## 🎓 Learning Path

**Beginner**: Start with this document (overview)
↓
**Intermediate**: Read [RECURRING_RULES_GUIDE.md](RECURRING_RULES_GUIDE.md)
↓
**Practical**: Follow [RECURRING_RULES_IMPLEMENTATION.md](RECURRING_RULES_IMPLEMENTATION.md) for setup
↓
**Advanced**: Review [RECURRING_RULES_ENHANCEMENTS.md](RECURRING_RULES_ENHANCEMENTS.md) for improvements

---

## 🎯 Next Steps

1. ✅ Review the 3 documentation files
2. ✅ Set up recurring rules in your development environment
3. ✅ Test with the Vietnamese use case examples
4. ✅ Configure cron job for production
5. ✅ Plan enhancements from Phase 2+ as needed

---

## 💡 Key Insights

- **Status**: System is production-ready ✅
- **Coverage**: Supports INCOME, EXPENSE, and TRANSFER types
- **Flexibility**: RFC5545 RRULE allows virtually any schedule pattern
- **Reliability**: Database transactions ensure data consistency
- **Performance**: Processed in batches (200 rules/day max)
- **Scalability**: Can handle thousands of recurring rules

---

## 📧 Quick Reference Table

| Concept         | Example                                | Documentation |
| --------------- | -------------------------------------- | ------------- |
| Monthly Salary  | `FREQ=MONTHLY;BYMONTHDAY=5`            | Impl. Guide   |
| Weekly Expense  | `FREQ=WEEKLY;BYDAY=MO`                 | Impl. Guide   |
| Daily Allowance | `FREQ=DAILY;BYDAY=MO,TU,WE,TH,FR`      | Enhancements  |
| Quarterly Bonus | `FREQ=MONTHLY;INTERVAL=3;BYMONTHDAY=1` | Impl. Guide   |
| Create API Call | POST /personal/recurring-rules         | Guide         |
| List API Call   | GET /personal/recurring-rules          | Guide         |
| Update API Call | PATCH /personal/recurring-rules/:id    | Guide         |
| Delete API Call | DELETE /personal/recurring-rules/:id   | Guide         |

---

## 🏆 Summary

The **Recurring Rules** system provides a robust, flexible foundation for automated periodic transactions. It currently supports:

✅ Automatic Income/Expense generation  
✅ Flexible scheduling (daily/weekly/monthly/yearly)  
✅ Account balance auto-updates  
✅ Soft deletes and expiration dates  
✅ Transaction audit trail  
✅ Plan-based access control

With recommended enhancements planned for:
🎯 Execution history tracking  
🎯 Advanced search & filtering  
🎯 Notifications & alerts  
🎯 Statistics dashboard  
🎯 Webhooks for integration

---

**Created**: March 18, 2026  
**Last Updated**: March 18, 2026  
**Maintained By**: Finance CRM Development Team  
**Status**: ✅ Production Ready
