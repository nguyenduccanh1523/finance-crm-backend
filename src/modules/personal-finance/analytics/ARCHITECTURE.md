# 📊 Finance CRM Analytics Module - SOLID Architecture Design

## 📋 Tổng quan

Module Analytics được thiết kế theo **SOLID principles** để cung cấp các features:

1. **Smart Budget Progress** - Tiến độ ngân sách thông minh
2. **Goal Tracking** - Theo dõi mục tiêu tài chính
3. **Smart Insights** - Phát hiện bất thường và xu hướng
4. **Action Suggestions** - Gợi ý hành động cực hữu ích
5. **Gamification** - Hệ thống điểm, level, badges

---

## 🏗️ SOLID Architecture

### 1️⃣ Single Responsibility (SRP)

Mỗi service chỉ có **một trách nhiệm duy nhất**:

```
FinancialCalculationService
├── calculateMonthlyTrend()           # Tính % thay đổi hàng tháng
├── forecastMonthEnd()               # Dự báo cuối tháng
├── calculateDailyVelocity()         # Tính tốc độ đạt mục tiêu
└── suggestBudgetAllocation()        # Gợi ý chia ngân sách

BudgetAnalyticsService
├── analyzeBudgetProgress()          # Phân tích tiến độ ngân sách
├── predictBudgetOverflow()          # Dự báo vượt budget
└── detectBudgetAnomalies()          # Phát hiện bất thường

GoalAnalyticsService
├── analyzeGoalProgress()            # Phân tích tiến độ mục tiêu
├── calculateGoalVelocity()          # Tính tốc độ đạt mục tiêu
└── predictGoalCompletion()          # Dự báo hoàn thành

InsightService
├── generateInsights()               # Generate tất cả insights
├── generatePatternInsights()        # Patterns (trends, top categories)
└── generateWarningInsights()        # Warnings (overspend, alerts)

ActionSuggestionService
├── suggestBudgetOptimization()      # Gợi ý tối ưu ngân sách
├── suggestGoalStrategy()            # Gợi ý chiến lược mục tiêu
└── suggestSpendingReduction()       # Gợi ý cắt giảm chi phí

GamificationService
├── getStats()                       # Lấy stats điểm/level/streaks
├── updatePoints()                   # Cập nhật điểm
└── checkAndUnlockAchievements()     # Kiểm tra mở khóa achievements
```

### 2️⃣ Open/Closed Principle (OCP)

Module **mở rộng** mà không cần **sửa** code hiện tại:

```typescript
// ✅ Dễ thêm feature mới mà không sửa existing code
class AIInsightService extends InsightService {
  async generateAIInsights(workspaceId: string) {
    // AI-powered insights
  }
}

// ✅ Dễ thêm strategy mới cho gamification
class CompetitiveGamificationService extends GamificationService {
  async getLeaderboard() {
    // Leaderboard logic
  }
}
```

### 3️⃣ Liskov Substitution (LSP)

Services implement **interfaces** để dễ thay thế:

```typescript
// Có thể thay BudgetAnalyticsService bằng mock
export interface IBudgetAnalyticsService {
  analyzeBudgetProgress(workspaceId: string): Promise<BudgetProgress[]>;
  predictBudgetOverflow(...): Promise<BudgetPrediction>;
  detectBudgetAnomalies(...): Promise<Anomaly[]>;
}

// Testing
const mockService: IBudgetAnalyticsService = {
  async analyzeBudgetProgress() { return []; },
  // ...
};
```

### 4️⃣ Interface Segregation (ISP)

Interfaces **nhỏ** và **specific**:

```typescript
// ✅ GOOD - Interfaces nhỏ, specific
export interface IBudgetAnalyticsService {
  analyzeBudgetProgress(): Promise<BudgetProgress[]>;
  predictBudgetOverflow(): Promise<BudgetPrediction>;
}

export interface IGoalAnalyticsService {
  analyzeGoalProgress(): Promise<GoalProgress[]>;
  calculateGoalVelocity(): Promise<number>;
}

// ❌ BAD - God interface (tránh)
export interface IAnalyticsService {
  analyzeBudgetProgress();
  analyzeGoalProgress();
  generateInsights();
  suggestActions();
  // ... 20 methods
}
```

### 5️⃣ Dependency Inversion (DIP)

Depend on **abstractions**, không **concrete classes**:

```typescript
// ✅ GOOD - Depend on interface
@Injectable()
export class AnalyticsController {
  constructor(
    private readonly budgetAnalytics: IBudgetAnalyticsService, // Interface
    private readonly calculation: IFinancialCalculationService, // Interface
  ) {}
}

// ❌ BAD - Depend on concrete class
export class AnalyticsController {
  constructor(
    private readonly budgetAnalytics: BudgetAnalyticsService, // Concrete
  ) {}
}
```

---

## 📁 Folder Structure

```
analytics/
├── interfaces/
│   ├── analytics.interface.ts      # Tất cả interfaces
│   └── index.ts
├── services/
│   ├── financial-calculation.service.ts
│   ├── budget-analytics.service.ts
│   ├── goal-analytics.service.ts
│   ├── insight.service.ts
│   ├── action-suggestion.service.ts
│   ├── gamification.service.ts
│   └── index.ts
├── dto/
│   └── analytics-response.dto.ts   # Response models
├── analytics.controller.ts          # Controllers
├── analytics.module.ts              # Module definition
└── README.md                        # This file
```

---

## 🔄 Data Flow

```
                      ┌─────────────────────────────┐
                      │   AnalyticsController       │
                      │  (API Endpoints)            │
                      └──────────────┬──────────────┘
                                     │
           ┌─────────────────────────┼─────────────────────────┐
           │                         │                         │
           ▼                         ▼                         ▼
    ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
    │  BudgetAnalytics│      │ GoalAnalytics   │      │ InsightService  │
    │    Service      │      │    Service      │      │                 │
    └────────┬────────┘      └────────┬────────┘      └────────┬────────┘
             │                        │                        │
             └────────────────────────┼────────────────────────┘
                                      │
                  ┌───────────────────┴───────────────────┐
                  │                                       │
                  ▼                                       ▼
    ┌─────────────────────────────┐        ┌──────────────────────────────┐
    │ Financial Calculation Srv   │        │ ActionSuggestion Service     │
    │ (Math + Algorithms)         │        │ (Smart Recommendations)      │
    └─────────────────────────────┘        └──────────────────────────────┘
                  │
                  ▼
    ┌─────────────────────────────┐
    │ TypeORM Repositories        │
    │ (Budget, Goal, Transaction) │
    └─────────────────────────────┘
                  │
                  ▼
    ┌─────────────────────────────┐
    │ PostgreSQL Database         │
    └─────────────────────────────┘
```

---

## 🎯 Features & Endpoints

### 1. Smart Budget Progress

```
GET /personal/analytics/budgets
├── Budget limit
├── Amount spent (%)
├── Remaining amount
├── Status (ON_TRACK, WARNING, EXCEEDED, CRITICAL)
├── Days left in month
└── Prediction (will overflow on day X)
```

### 2. Goal Tracking

```
GET /personal/analytics/goals
├── Target amount
├── Current amount (%)
├── Velocity per day
├── Estimated completion date
├── Is ahead schedule?
└── Status (ON_TRACK, AHEAD, BEHIND, COMPLETED)
```

### 3. Smart Insights

```
GET /personal/analytics/insights
├── Pattern insights
│  ├── Spending trend (18% up from last month)
│  ├── Top spending categories
│  ├── Unusual category spikes
│  └── Savings achievements
├── Warning insights
│  ├── Budget overflows
│  ├── Categories at risk
│  └── Goal delays
└── Recommendations
```

### 4. Anomaly Detection

```
GET /personal/analytics/anomalies
├── SPENDING_SPIKE (45% increase in Ads)
├── UNUSUAL_PATTERN (spending outside 2 std deviations)
└── CATEGORY_OVERSPEND (Ads budget exceeded by 23%)
```

### 5. Action Suggestions

```
GET /personal/analytics/suggestions
├── Budget optimizations
│  ├── Reduce Ads 15% to save 1.5M
│  ├── Negotiate supplier rates
│  └── Find cheaper alternatives
├── Revenue increase strategies
│  ├── Increase price 5%
│  ├── Up-sell/Cross-sell
│  └── Find new customers
└── Quick wins
   ├── Cancel unused subscriptions
   └── Enable budget alerts
```

### 6. Gamification

```
GET /personal/analytics/gamification
├── Total points
├── Level (1-10)
├── Points to next level
├── Current streak (days)
├── Longest streak
├── Achievements unlocked
└── Badges earned
```

### 7. Dashboard

```
GET /personal/analytics/dashboard
└── All of the above + summary stats
```

---

## 💡 Algorithm Examples

### Budget Prediction

```typescript
predictedSpend = (currentSpent / daysElapsed) * daysInMonth

Ví dụ:
- Ngày 10 của tháng 30 ngày
- Đã chi 5M
- Dự báo: (5M / 10) * 30 = 15M
- Nếu limit 10M → Vượt 50%
```

### Goal Velocity

```typescript
velocity = (currentAmount - startAmount) / daysPassed

Ví dụ:
- Mục tiêu: 100M
- Bắt đầu: 0M
- Sau 30 ngày: 45M
- Velocity: 45M / 30 = 1.5M/ngày
- Time to complete: (100M - 45M) / 1.5M = ~37 ngày
```

### Anomaly Detection (Standard Deviation)

```typescript
zScore = (value - mean) / stdDev

Nếu |zScore| > 2 → bất thường
Ví dụ:
- Spending history: [1M, 1.1M, 0.9M, 0.95M, 3.5M]
- Mean: 1.5M
- StdDev: 1.2M
- Latest: 3.5M
- zScore: 1.67 → không bất thường
- Nếu = 5M → zScore > 2 → BẤT THƯỜNG
```

### Confidence Score

```typescript
confidence = (dataPoints / minDataPoints) * 100

minDataPoints = 7 (1 tuần)
Ví dụ:
- 3 ngày data → 43% confidence
- 7 ngày data → 100% confidence
```

---

## 🧪 Testing Strategy

```typescript
// Unit Testing
describe('FinancialCalculationService', () => {
  it('should forecast month end correctly', () => {
    const service = new FinancialCalculationService();
    const forecast = service.forecastMonthEnd(5000000, 10, 30);
    expect(forecast).toBe(15000000);
  });
});

// Integration Testing
describe('BudgetAnalyticsService', () => {
  it('should detect budget overflow anomaly', async () => {
    const mockBudgetRepo = {
      find: jest.fn().mockResolvedValue([mockBudget]),
    };
    const service = new BudgetAnalyticsService(
      mockBudgetRepo,
      mockTransactionRepo,
      mockCalculation,
    );
    const anomalies = await service.detectBudgetAnomalies(workspaceId);
    expect(anomalies.length).toBeGreaterThan(0);
  });
});

// Mock Services for Testing
class MockBudgetAnalyticsService implements IBudgetAnalyticsService {
  async analyzeBudgetProgress(): Promise<BudgetProgress[]> {
    return [];
  }
  // ...
}
```

---

## 🚀 Performance Optimization

### 1. Parallel Data Fetching

```typescript
// ✅ Parallelize queries
const [budgets, goals, insights] = await Promise.all([
  this.budgetAnalytics.analyzeBudgetProgress(workspaceId),
  this.goalAnalytics.analyzeGoalProgress(workspaceId),
  this.insightService.generateInsights(workspaceId),
]);
```

### 2. Caching

```typescript
// Cache insights cho 1 giờ
@Cacheable({ ttl: 3600 })
async generateInsights(workspaceId: string): Promise<Insight[]> {
  // ...
}
```

### 3. Database Indexing

```typescript
// Trong entities:
@Index(['workspaceId', 'occurredAt'])
@Entity()
export class Transaction {
  // ...
}
```

---

## 📝 Future Enhancements

- [ ] Machine Learning predictions
- [ ] Collaborative filtering recommendations
- [ ] Real-time alerts/notifications
- [ ] Budget forecasting with confidence intervals
- [ ] Comparative benchmarking (vs other users)
- [ ] Export reports (PDF, Excel, etc.)
- [ ] Custom alert rules
- [ ] Team collaboration features
- [ ] Advanced gamification (leaderboards, badges)
- [ ] Mobile app push notifications

---

## 📚 Related Documentation

- [Budget Entity](../entities/budget.entity.ts)
- [Goal Entity](../entities/goal.entity.ts)
- [Transaction Entity](../entities/transaction.entity.ts)
- [Auth Guard](../../core/auth/guards/jwt-auth.guard.ts)
- [Feature Guard](../../billing/guards/feature.guard.ts)

---

## 🔗 Integration with Personal Finance Module

```typescript
// personal-finance.module.ts
@Module({
  imports: [
    AnalyticsModule, // ← New
    BudgetsModule,
    GoalsModule,
    TransactionsModule,
    // ...
  ],
})
export class PersonalFinanceModule {}
```

---

## 👨‍💻 Developer Guide

### Adding a New Insight Type

1. **Add to IInsightService interface**

   ```typescript
   export interface IInsightService {
     generateMyNewInsight(workspaceId: string): Promise<Insight>;
   }
   ```

2. **Implement in InsightService**

   ```typescript
   async generateMyNewInsight(workspaceId: string): Promise<Insight> {
     // Implementation
   }
   ```

3. **Call from generateInsights()**
   ```typescript
   async generateInsights(workspaceId: string): Promise<Insight[]> {
     const insights: Insight[] = [];
     // ...
     const myInsight = await this.generateMyNewInsight(workspaceId);
     insights.push(myInsight);
     return insights;
   }
   ```

### Adding a New Action Suggestion

Similar process - implement in ActionSuggestionService and call from generateSmartSuggestions()

---

## 📞 Support

For questions or issues, refer to the project's GitHub issues or documentation.
