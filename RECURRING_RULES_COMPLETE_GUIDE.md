# 🎯 RECURRING RULES - Complete Guide (Tất Cả Trong 1 File)

## ⚙️ SETUP: Cron Job Đã Được Thêm Vào Code!

### ✅ Các Thay Đổi Đã Thêm Vào Code (recurring-rules.service.ts):

```typescript
// 1. Import thêm Cron decorator
import { Cron, CronExpression } from '@nestjs/schedule';
import { Logger } from '@nestjs/common';

// 2. Thêm Logger vào service
@Injectable()
export class RecurringRulesService {
  private readonly logger = new Logger(RecurringRulesService.name);

  // 3. Thêm @Cron decorator - chạy mỗi ngày lúc 00:00 (nửa đêm UTC)
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async processRecurringRules() {
    try {
      this.logger.log('🔄 Starting recurring rules processing...');
      const result = await this.runDueRules();
      this.logger.log(
        `✅ Successfully processed ${result.processed} recurring rules`,
      );
    } catch (error) {
      this.logger.error('❌ Error processing recurring rules:', error);
    }
  }
}
```

### 🚀 Để Hoạt Động, Cần Cấu Hình App Module:

```typescript
// src/app.module.ts
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(), // ← THÊM DÒNG NÀY
    PersonalFinanceModule,
    // ... other modules
  ],
})
export class AppModule {}
```

### ✨ Cron Job Sẽ:

- **Chạy Mỗi Ngày** lúc 00:00 UTC (nửa đêm)
- **Tự Động Tìm** tất cả recurring rules có `nextRunAt <= now`
- **Tạo Transactions** cho mỗi rule
- **Cập Nhật Balance** tài khoản
- **Tính Ngày Chạy Tiếp Theo** dựa vào RRULE

---

## 📊 RRULE PATTERNS - Tất Cả Các Dạng

### A. HÀNG NGÀY (DAILY)

| Mô Tả                           | RRULE                             | Ví Dụ                     |
| ------------------------------- | --------------------------------- | ------------------------- |
| **Mỗi ngày**                    | `FREQ=DAILY`                      | Allowance hàng ngày       |
| **Mỗi 2 ngày**                  | `FREQ=DAILY;INTERVAL=2`           | Check-in bonus 2 ngày/lần |
| **Mỗi ngày thứ 2-6**            | `FREQ=DAILY;BYDAY=MO,TU,WE,TH,FR` | Weekday allowance         |
| **Mỗi ngày cuối tuần**          | `FREQ=DAILY;BYDAY=SA,SU`          | Weekend bonus             |
| **Hàng ngày + giới hạn 30 lần** | `FREQ=DAILY;COUNT=30`             | Promotion 30 days         |

---

### B. HÀNG TUẦN (WEEKLY)

| Mô Tả                     | RRULE                                | Ví Dụ                     |
| ------------------------- | ------------------------------------ | ------------------------- |
| **Mỗi tuần**              | `FREQ=WEEKLY`                        | Salary tuần nhất          |
| **Mỗi 2 tuần**            | `FREQ=WEEKLY;INTERVAL=2`             | Bi-weekly payment         |
| **Thứ 2, 3, 5**           | `FREQ=WEEKLY;BYDAY=MO,WE,FR`         | 3x/tuần                   |
| **Chỉ thứ 2**             | `FREQ=WEEKLY;BYDAY=MO`               | Weekly meeting allocation |
| **Chỉ Thứ 6**             | `FREQ=WEEKLY;BYDAY=SA`               | Weekend bonus             |
| **Mỗi 2 tuần, thứ 2 & 6** | `FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,FR` | Bi-weekly (2 days)        |

---

### C. HÀNG THÁNG (MONTHLY)

| Mô Tả                       | RRULE                                  | Ví Dụ                      |
| --------------------------- | -------------------------------------- | -------------------------- |
| **Cùng ngày hàng tháng**    | `FREQ=MONTHLY`                         | Salary ngày 5 hàng tháng   |
| **Ngày 1 hàng tháng**       | `FREQ=MONTHLY;BYMONTHDAY=1`            | Rent payment               |
| **Ngày 15 hàng tháng**      | `FREQ=MONTHLY;BYMONTHDAY=15`           | Mid-month bonus            |
| **Ngày cuối tháng**         | `FREQ=MONTHLY;BYMONTHDAY=-1`           | Utilities payment          |
| **Ngày 1 & 15**             | `FREQ=MONTHLY;BYMONTHDAY=1,15`         | Bi-monthly                 |
| **Ngày 1, 10, 20**          | `FREQ=MONTHLY;BYMONTHDAY=1,10,20`      | 3x/tháng                   |
| **5 ngày trước cuối tháng** | `FREQ=MONTHLY;BYMONTHDAY=-5`           | Pre-month payment          |
| **Thứ 2 đầu tiên**          | `FREQ=MONTHLY;BYDAY=1MO`               | First Monday bonus         |
| **Thứ 6 cuối cùng**         | `FREQ=MONTHLY;BYDAY=-1FR`              | Last Friday payout         |
| **Mỗi 2 tháng**             | `FREQ=MONTHLY;INTERVAL=2;BYMONTHDAY=1` | Bi-monthly (Feb, Apr, Jun) |

---

### D. HÀNG QUÝ (QUARTERLY)

| Mô Tả                | RRULE                                   | Ví Dụ                |
| -------------------- | --------------------------------------- | -------------------- |
| **3 tháng/lần**      | `FREQ=MONTHLY;INTERVAL=3;BYMONTHDAY=1`  | Quarterly bonus      |
| **Quý 1,2,3,4**      | `FREQ=MONTHLY;INTERVAL=3;BYMONTHDAY=15` | Quarterly mid-month  |
| **Mỗi 3 tháng cuối** | `FREQ=MONTHLY;INTERVAL=3;BYMONTHDAY=-1` | Quarterly end payout |

---

### E. HÀNG NĂM (YEARLY)

| Mô Tả                               | RRULE                                  | Ví Dụ               |
| ----------------------------------- | -------------------------------------- | ------------------- |
| **Cùng ngày/tháng hàng năm**        | `FREQ=YEARLY`                          | Anniversary bonus   |
| **25/12 hàng năm**                  | `FREQ=YEARLY;BYMONTH=12;BYMONTHDAY=25` | Christmas gift      |
| **1/7 hàng năm**                    | `FREQ=YEARLY;BYMONTH=7;BYMONTHDAY=1`   | Mid-year bonus      |
| **1/1 & 1/7**                       | `FREQ=YEARLY;BYMONTH=1,7;BYMONTHDAY=1` | Semi-annual         |
| **Tất cả Thứ 2 đầu tiên trong năm** | `FREQ=YEARLY;BYDAY=1MO`                | Yearly Monday bonus |

---

### F. CÓ GIỚI HẠN (WITH LIMITS)

| Mô Tả                        | RRULE                             | Ví Dụ                 |
| ---------------------------- | --------------------------------- | --------------------- |
| **Mỗi tháng, 12 lần**        | `FREQ=MONTHLY;COUNT=12`           | 1 năm salary          |
| **Mỗi tuần, 52 lần**         | `FREQ=WEEKLY;COUNT=52`            | 1 năm payment         |
| **Hàng ngày đến 31/12/2026** | `FREQ=DAILY;UNTIL=2026-12-31`     | Limited promotion     |
| **Hàng tháng đến 30/6/2027** | `FREQ=MONTHLY;UNTIL=2027-06-30`   | Contract period       |
| **15 lần, mỗi 2 tuần**       | `FREQ=WEEKLY;INTERVAL=2;COUNT=15` | 15 bi-weekly payments |

---

## 🌍 RRULE PATTERNS - Ví Dụ Thực Tế Tiếng Việt

### 1️⃣ LƯƠNG THÁNG (Monthly Salary)

**Kịch Bản**: Nhân viên nhận lương vào ngày 5 hàng tháng

```
RRULE: FREQ=MONTHLY;BYMONTHDAY=5
Tháng 4: 5th → +50,000 VND
Tháng 5: 5th → +50,000 VND
Tháng 6: 5th → +50,000 VND
... (vô hạn)
```

**CURL**:

```bash
curl -X POST http://localhost:3000/personal/recurring-rules \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "acc-salary-uuid",
    "type": "INCOME",
    "amountCents": 5000000,
    "currency": "VND",
    "rrule": "FREQ=MONTHLY;BYMONTHDAY=5",
    "nextRunAt": "2026-04-05"
  }'
```

---

### 2️⃣ TIỀN NHÀ (Rent Payment)

**Kịch Bản**: Thanh toán tiền nhà vào ngày 1 hàng tháng

```
RRULE: FREQ=MONTHLY;BYMONTHDAY=1
Tháng 4: 1st → -30,000 VND
Tháng 5: 1st → -30,000 VND
Tháng 6: 1st → -30,000 VND
... (vô hạn)
```

**CURL**:

```bash
curl -X POST http://localhost:3000/personal/recurring-rules \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "acc-checking-uuid",
    "categoryId": "cat-rent-uuid",
    "type": "EXPENSE",
    "amountCents": 3000000,
    "currency": "VND",
    "rrule": "FREQ=MONTHLY;BYMONTHDAY=1",
    "nextRunAt": "2026-04-01"
  }'
```

---

### 3️⃣ TIỀN NƯỚC ĐIỆN (Utility Bills - Twice/Month)

**Kịch Bản**: Thanh toán hóa đơn vào ngày 15 và ngày cuối tháng

```
RRULE: FREQ=MONTHLY;BYMONTHDAY=15,-1
Tháng 4: 15th → -5,000 VND
Tháng 4: 30th → -5,000 VND
Tháng 5: 15th → -5,000 VND
Tháng 5: 31st → -5,000 VND
... (vô hạn)
```

**CURL**:

```bash
curl -X POST http://localhost:3000/personal/recurring-rules \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "acc-checking-uuid",
    "categoryId": "cat-utilities-uuid",
    "type": "EXPENSE",
    "amountCents": 500000,
    "currency": "VND",
    "rrule": "FREQ=MONTHLY;BYMONTHDAY=15,-1",
    "nextRunAt": "2026-03-15"
  }'
```

---

### 4️⃣ SUBSCRIPTION (Weekly)

**Kịch Bản**: Thanh toán Netflix mỗi thứ 2 (Monday)

```
RRULE: FREQ=WEEKLY;BYDAY=MO
Tuần 1: Mon → -99,000 VND
Tuần 2: Mon → -99,000 VND
Tuần 3: Mon → -99,000 VND
... (vô hạn)
```

**CURL**:

```bash
curl -X POST http://localhost:3000/personal/recurring-rules \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "acc-checking-uuid",
    "categoryId": "cat-subscription-uuid",
    "type": "EXPENSE",
    "amountCents": 99000,
    "currency": "VND",
    "rrule": "FREQ=WEEKLY;BYDAY=MO",
    "nextRunAt": "2026-03-23"
  }'
```

---

### 5️⃣ BẢO HIỂM (Insurance - End of Month)

**Kịch Bản**: Thanh toán bảo hiểm vào ngày cuối tháng

```
RRULE: FREQ=MONTHLY;BYMONTHDAY=-1
Tháng 3: 31st → -15,000 VND
Tháng 4: 30th → -15,000 VND
Tháng 5: 31st → -15,000 VND
... (vô hạn)
```

**CURL**:

```bash
curl -X POST http://localhost:3000/personal/recurring-rules \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "acc-checking-uuid",
    "categoryId": "cat-insurance-uuid",
    "type": "EXPENSE",
    "amountCents": 1500000,
    "currency": "VND",
    "rrule": "FREQ=MONTHLY;BYMONTHDAY=-1",
    "nextRunAt": "2026-03-31"
  }'
```

---

### 6️⃣ THƯỞNG QUÝ (Quarterly Bonus - Limited Duration)

**Kịch Bản**: Nhận thưởng 3 tháng/lần vào ngày 1, kết thúc 31/12/2027

```
RRULE: FREQ=MONTHLY;INTERVAL=3;BYMONTHDAY=1
UNTIL: 2027-12-31

Tháng 4/2026: 1st → +30,000 VND
Tháng 7/2026: 1st → +30,000 VND
Tháng 10/2026: 1st → +30,000 VND
Tháng 1/2027: 1st → +30,000 VND
Tháng 4/2027: 1st → +30,000 VND
... (kết thúc 31/12/2027)
```

**CURL**:

```bash
curl -X POST http://localhost:3000/personal/recurring-rules \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "acc-bonus-uuid",
    "type": "INCOME",
    "amountCents": 3000000,
    "currency": "VND",
    "rrule": "FREQ=MONTHLY;INTERVAL=3;BYMONTHDAY=1",
    "nextRunAt": "2026-04-01",
    "endAt": "2027-12-31"
  }'
```

---

### 7️⃣ TRỢ CẤP TẠM THỜI (Temporary Allowance - Weekdays Only)

**Kịch Bản**: Nhận allowance 500 VND mỗi ngày thứ 2-6, kết thúc 31/3/2026

```
RRULE: FREQ=DAILY;BYDAY=MO,TU,WE,TH,FR
UNTIL: 2026-03-31

Jan 2-31/2026 (Thứ 2-6): ~20 ngày → +500 VND
Feb 1-29/2026 (Thứ 2-6): ~20 ngày → +500 VND
Mar 1-31/2026 (Thứ 2-6): ~22 ngày → +500 VND
= 62 transactions tổng cộng
```

**CURL**:

```bash
curl -X POST http://localhost:3000/personal/recurring-rules \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "acc-allowance-uuid",
    "type": "INCOME",
    "amountCents": 50000,
    "currency": "VND",
    "rrule": "FREQ=DAILY;BYDAY=MO,TU,WE,TH,FR",
    "nextRunAt": "2026-01-02",
    "endAt": "2026-03-31"
  }'
```

---

### 8️⃣ THƯỞNG NGÀY CUỐI TUẦN (Last Friday Bonus)

**Kịch Bản**: Thưởng vào thứ 6 cuối cùng của mỗi tháng

```
RRULE: FREQ=MONTHLY;BYDAY=-1FR

Tháng 3/2026: Thứ 6 cuối → +2,000 VND
Tháng 4/2026: Thứ 6 cuối → +2,000 VND
Tháng 5/2026: Thứ 6 cuối → +2,000 VND
... (vô hạn)
```

**CURL**:

```bash
curl -X POST http://localhost:3000/personal/recurring-rules \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "acc-bonus-uuid",
    "type": "INCOME",
    "amountCents": 2000000,
    "currency": "VND",
    "rrule": "FREQ=MONTHLY;BYDAY=-1FR",
    "nextRunAt": "2026-03-27"
  }'
```

---

### 9️⃣ QUỸ TIẾT KIỆM (Savings Fund - Bi-Weekly, 1 Năm)

**Kịch Bản**: Tiết kiệm 1M VND mỗi 2 tuần, 26 lần (1 năm)

```
RRULE: FREQ=WEEKLY;INTERVAL=2;COUNT=26

Tuần 1: -1,000,000 VND
Tuần 3: -1,000,000 VND
Tuần 5: -1,000,000 VND
... (26 lần, tổng 26M VND/năm)
```

**CURL**:

```bash
curl -X POST http://localhost:3000/personal/recurring-rules \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "acc-checking-uuid",
    "categoryId": "cat-savings-uuid",
    "type": "EXPENSE",
    "amountCents": 100000000,
    "currency": "VND",
    "rrule": "FREQ=WEEKLY;INTERVAL=2;COUNT=26",
    "nextRunAt": "2026-03-23"
  }'
```

---

### 🔟 THƯỞNG LẺ (Ad-hoc Income - Multiple Days per Month)

**Kịch Bản**: Nhận bonus vào ngày 1, 10, 20 hàng tháng

```
RRULE: FREQ=MONTHLY;BYMONTHDAY=1,10,20

Tháng 4: 1st, 10th, 20th → +1,000 VND x3
Tháng 5: 1st, 10th, 20th → +1,000 VND x3
... (vô hạn, tổng 3M/tháng)
```

**CURL**:

```bash
curl -X POST http://localhost:3000/personal/recurring-rules \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "acc-bonus-uuid",
    "type": "INCOME",
    "amountCents": 100000000,
    "currency": "VND",
    "rrule": "FREQ=MONTHLY;BYMONTHDAY=1,10,20",
    "nextRunAt": "2026-04-01"
  }'
```

---

## 📝 TẤT CẢ CÁC CURL COMMANDS

### ✅ 1. TẠO RULE - Lương Tháng

```bash
curl -X POST http://localhost:3000/personal/recurring-rules \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "deposit-account-uuid",
    "type": "INCOME",
    "amountCents": 5000000,
    "currency": "VND",
    "rrule": "FREQ=MONTHLY;BYMONTHDAY=5",
    "nextRunAt": "2026-04-05"
  }'
```

**Response**:

```json
{
  "id": "rule-uuid-1",
  "workspaceId": "workspace-uuid",
  "accountId": "account-uuid",
  "type": "INCOME",
  "amountCents": 5000000,
  "currency": "VND",
  "rrule": "FREQ=MONTHLY;BYMONTHDAY=5",
  "nextRunAt": "2026-04-05T00:00:00Z",
  "createdAt": "2026-03-18T14:30:00Z"
}
```

---

### ✅ 2. TẠO RULE - Tiền Nhà

```bash
curl -X POST http://localhost:3000/personal/recurring-rules \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "checking-account-uuid",
    "categoryId": "rent-category-uuid",
    "type": "EXPENSE",
    "amountCents": 3000000,
    "currency": "VND",
    "rrule": "FREQ=MONTHLY;BYMONTHDAY=1",
    "nextRunAt": "2026-04-01"
  }'
```

---

### ✅ 3. TẠO RULE - Tiền Nước Điện (2x/tháng)

```bash
curl -X POST http://localhost:3000/personal/recurring-rules \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "checking-account-uuid",
    "categoryId": "utilities-category-uuid",
    "type": "EXPENSE",
    "amountCents": 500000,
    "currency": "VND",
    "rrule": "FREQ=MONTHLY;BYMONTHDAY=15,-1",
    "nextRunAt": "2026-03-15"
  }'
```

---

### ✅ 4. TẠO RULE - Netflix/Subscription (Hàng Tuần)

```bash
curl -X POST http://localhost:3000/personal/recurring-rules \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "checking-account-uuid",
    "categoryId": "subscription-category-uuid",
    "type": "EXPENSE",
    "amountCents": 99000,
    "currency": "VND",
    "rrule": "FREQ=WEEKLY;BYDAY=MO",
    "nextRunAt": "2026-03-23"
  }'
```

---

### ✅ 5. TẠO RULE - Bảo Hiểm (Ngày Cuối Tháng)

```bash
curl -X POST http://localhost:3000/personal/recurring-rules \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "checking-account-uuid",
    "categoryId": "insurance-category-uuid",
    "type": "EXPENSE",
    "amountCents": 1500000,
    "currency": "VND",
    "rrule": "FREQ=MONTHLY;BYMONTHDAY=-1",
    "nextRunAt": "2026-03-31"
  }'
```

---

### ✅ 6. TẠO RULE - Thưởng Quý (Giới Hạn)

```bash
curl -X POST http://localhost:3000/personal/recurring-rules \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "bonus-account-uuid",
    "type": "INCOME",
    "amountCents": 3000000,
    "currency": "VND",
    "rrule": "FREQ=MONTHLY;INTERVAL=3;BYMONTHDAY=1",
    "nextRunAt": "2026-04-01",
    "endAt": "2027-12-31"
  }'
```

---

### ✅ 7. TẠO RULE - Allowance Hàng Ngày (Thứ 2-6)

```bash
curl -X POST http://localhost:3000/personal/recurring-rules \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "allowance-account-uuid",
    "type": "INCOME",
    "amountCents": 50000,
    "currency": "VND",
    "rrule": "FREQ=DAILY;BYDAY=MO,TU,WE,TH,FR",
    "nextRunAt": "2026-01-02",
    "endAt": "2026-03-31"
  }'
```

---

### ✅ 8. TẠO RULE - Thưởng Thứ 6 Cuối Tháng

```bash
curl -X POST http://localhost:3000/personal/recurring-rules \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "bonus-account-uuid",
    "type": "INCOME",
    "amountCents": 2000000,
    "currency": "VND",
    "rrule": "FREQ=MONTHLY;BYDAY=-1FR",
    "nextRunAt": "2026-03-27"
  }'
```

---

### ✅ 9. LIỆT KÊ TẤT CẢ RULES

```bash
curl -X GET http://localhost:3000/personal/recurring-rules \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**Response**:

```json
[
  {
    "id": "rule-uuid-1",
    "type": "INCOME",
    "amountCents": 5000000,
    "rrule": "FREQ=MONTHLY;BYMONTHDAY=5",
    "nextRunAt": "2026-04-05T00:00:00Z"
  },
  {
    "id": "rule-uuid-2",
    "type": "EXPENSE",
    "amountCents": 3000000,
    "rrule": "FREQ=MONTHLY;BYMONTHDAY=1",
    "nextRunAt": "2026-04-01T00:00:00Z"
  }
]
```

---

### ✅ 10. CẬP NHẬT RULE - Tăng Lương

```bash
curl -X PATCH http://localhost:3000/personal/recurring-rules/rule-uuid-1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amountCents": 6000000
  }'
```

---

### ✅ 11. CẬP NHẬT RULE - Đổi Pattern

```bash
curl -X PATCH http://localhost:3000/personal/recurring-rules/rule-uuid-1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rrule": "FREQ=WEEKLY;BYDAY=MO,WE,FR"
  }'
```

---

### ✅ 12. CẬP NHẬT RULE - Đặt Ngày Kết Thúc

```bash
curl -X PATCH http://localhost:3000/personal/recurring-rules/rule-uuid-1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "endAt": "2026-12-31"
  }'
```

---

### ✅ 13. XÓA RULE

```bash
curl -X DELETE http://localhost:3000/personal/recurring-rules/rule-uuid-1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**Response**:

```json
{
  "ok": true
}
```

---

---

## 🔧 CÁC THAO TÁC QUẢN LÝ

### Kiểm Tra Các Rule Sắp Chạy

```bash
# Liệt kê tất cả rule và xem nextRunAt
curl -X GET http://localhost:3000/personal/recurring-rules \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" | jq '.[] | {id, type, nextRunAt, rrule}'
```

---

### Dừng Rule (Đặt Ngày Kết Thúc)

```bash
# Dừng rule vào 30/6/2026
curl -X PATCH http://localhost:3000/personal/recurring-rules/rule-uuid \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "endAt": "2026-06-30"
  }'
```

---

### Thay Đổi Số Tiền

```bash
# Tăng lương từ 5M lên 6M
curl -X PATCH http://localhost:3000/personal/recurring-rules/rule-uuid \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amountCents": 6000000
  }'
```

---

### Thay Đổi Tần Suất

```bash
# Đổi từ hàng ngày thành 3x/tuần
curl -X PATCH http://localhost:3000/personal/recurring-rules/rule-uuid \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rrule": "FREQ=WEEKLY;BYDAY=MO,WE,FR"
  }'
```

---
