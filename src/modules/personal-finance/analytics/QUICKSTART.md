## 🚀 Quick Start - Using the Analytics Module

### 1️⃣ **Import Module**

Update [src/modules/personal-finance/personal-finance.module.ts](src/modules/personal-finance/personal-finance.module.ts):

```typescript
import { AnalyticsModule } from './analytics/analytics.module';

@Module({
  imports: [
    AnalyticsModule, // ← Add this
    BudgetsModule,
    GoalsModule,
    // ... other modules
  ],
})
export class PersonalFinanceModule {}
```

---

### 2️⃣ **Test Endpoints**

#### Get Complete Dashboard

```bash
curl -X GET http://localhost:3000/personal/analytics/dashboard \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response includes:**

- Budget progress + predictions
- Goal progress + velocity
- Smart insights
- Anomaly detection
- Action suggestions
- Gamification stats
- Overall summary

---

#### Get Budget Analysis with Predictions

```bash
curl -X GET http://localhost:3000/personal/analytics/budgets \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Try this:**

```json
{
  "budgets": [
    {
      "budgetId": "xxx",
      "categoryName": "Marketing",
      "limitFormatted": "₫10,000,000",
      "spentFormatted": "₫7,200,000",
      "percentageUsed": 72,
      "status": "WARNING",
      "prediction": {
        "predictedSpendFormatted": "₫12,300,000",
        "overagePercentage": 23,
        "isOverBudget": true,
        "daysUntilOverBudget": 10,
        "message": "⚠️ Dự đoán vượt 23% (sau 10 ngày)"
      }
    }
  ]
}
```

---

#### Get Smart Insights

```bash
curl -X GET http://localhost:3000/personal/analytics/insights \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response includes:**

- 📊 Pattern insights (trends, top categories)
- ⚠️ Warning insights (budget risks, goals at risk)
- 💡 Actionable recommendations

---

#### Get Action Suggestions

```bash
curl -X GET http://localhost:3000/personal/analytics/suggestions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response includes:**

- Reduce Ads 15% → Save ₫1.5M
- Negotiate supplier rates
- Find cheaper alternatives
- Cancel unused subscriptions
- Quick wins

---

#### Get Gamification Stats

```bash
curl -X GET http://localhost:3000/personal/analytics/gamification \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response includes:**

- Total points: 2,500
- Level: 5/10
- Current streak: 7 days 🔥
- Achievements unlocked: 4/12
- Badges earned: 2/5

---

#### Auto Budget Breakdown

```bash
curl -X POST http://localhost:3000/personal/analytics/budget-breakdown \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "totalBudget": 50000000
  }'
```

**Response:**

```json
{
  "totalBudget": 50000000,
  "breakdown": [
    { "category": "Marketing", "amount": 20000000, "percentage": "40%" },
    { "category": "Operations", "amount": 17500000, "percentage": "35%" },
    { "category": "HR", "amount": 7500000, "percentage": "15%" },
    { "category": "IT", "amount": 5000000, "percentage": "10%" }
  ]
}
```

---

### 3️⃣ **Frontend Integration Examples**

#### React Component - Budget Progress

```typescript
function BudgetProgressComponent() {
  const [budget, setBudget] = useState<BudgetProgressResponseDto | null>(null);

  useEffect(() => {
    fetch('/personal/analytics/budgets', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setBudget(data.budgets[0]));
  }, []);

  if (!budget) return <div>Loading...</div>;

  return (
    <div>
      <h2>{budget.categoryName}</h2>
      <p>💰 {budget.limitFormatted}</p>
      <p>✓ {budget.spentFormatted} ({budget.percentageUsed}%)</p>

      {budget.prediction && (
        <div style={{ borderColor: budget.prediction.isOverBudget ? 'red' : 'green' }}>
          <p>{budget.prediction.message}</p>
          <p>Confidence: {budget.prediction.confidence}%</p>
        </div>
      )}
    </div>
  );
}
```

#### Vue.js Template - Insights

```vue
<template>
  <div class="insights-container">
    <h2>💡 Smart Insights</h2>

    <div v-for="insight in insights" :key="insight.id" class="insight-card">
      <span>{{ insight.typeIcon }}</span>
      <h3>{{ insight.title }}</h3>
      <p>{{ insight.description }}</p>

      <div v-if="insight.suggestedActions" class="actions">
        <button v-for="action in insight.suggestedActions" :key="action.id">
          {{ action.title }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const insights = ref([]);

onMounted(async () => {
  const response = await fetch('/personal/analytics/insights', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json();
  insights.value = data;
});
</script>
```

#### Angular Service - Dashboard

```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  constructor(private http: HttpClient) {}

  getDashboard() {
    return this.http.get('/personal/analytics/dashboard');
  }

  getBudgets() {
    return this.http.get('/personal/analytics/budgets');
  }

  getInsights() {
    return this.http.get('/personal/analytics/insights');
  }

  getSuggestions() {
    return this.http.get('/personal/analytics/suggestions');
  }

  getGamification() {
    return this.http.get('/personal/analytics/gamification');
  }
}

// Component usage:
@Component({...})
export class DashboardComponent implements OnInit {
  dashboard$ = this.analytics.getDashboard();

  constructor(private analytics: AnalyticsService) {}
}
```

---

### 4️⃣ **Common Use Cases**

#### Scenario 1: User Lands on Dashboard

```typescript
// Fetch everything needed
const dashboard = await fetch('/personal/analytics/dashboard');
// Display: budgets + goals + insights + suggestions + gamification + summary
```

#### Scenario 2: User Views Budget Details

```typescript
// Show budget progress + prediction
const budgets = await fetch('/personal/analytics/budgets');
// Display: bar charts, status colors, warning alerts, prediction info
```

#### Scenario 3: User Gets Recommendations

```typescript
// Show suggested actions
const suggestions = await fetch('/personal/analytics/suggestions');
// Display: top 5 actionable suggestions with difficulty & impact
```

#### Scenario 4: User Wants to Gamify

```typescript
// Show gamification stats
const gamification = await fetch('/personal/analytics/gamification');
// Display: level bar, streak counter, achievement badges, points total
```

#### Scenario 5: User Creates New Budget

```typescript
// Get smart breakdown
const breakdown = await fetch('/personal/analytics/budget-breakdown', {
  method: 'POST',
  body: JSON.stringify({ totalBudget: 50000000 }),
});
// Display: suggested allocation: Marketing 40%, Ops 35%, HR 15%, IT 10%
```

---

### 5️⃣ **Response Format Quick Reference**

| Endpoint                  | Contains                 | Format                                                            |
| ------------------------- | ------------------------ | ----------------------------------------------------------------- |
| `/dashboard`              | Everything               | Complete package                                                  |
| `/budgets`                | 💰 Progress + Prediction | `limitFormatted`, `spentFormatted`, `prediction`, `status`        |
| `/budgets/:id/prediction` | 📊 Just prediction       | `predictedSpend`, `overagePercentage`, `daysUntilOverBudget`      |
| `/goals`                  | 🎯 Progress + Velocity   | `percentageAchieved`, `velocityPerDay`, `estimatedCompletionDate` |
| `/insights`               | 💡 Smart insights        | `type`, `title`, `description`, `suggestedActions`                |
| `/anomalies`              | 🚨 Warnings              | `severity`, `title`, `description`                                |
| `/suggestions`            | 💪 Actions               | `title`, `difficulty`, `impact`, `potentialSavings`               |
| `/gamification`           | 🎮 Stats                 | `totalPoints`, `level`, `currentStreak`, `achievements`           |

---

### 6️⃣ **Error Handling**

```typescript
try {
  const response = await fetch('/personal/analytics/dashboard', {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    if (response.status === 401) {
      // Token expired, redirect to login
    } else if (response.status === 403) {
      // Feature not enabled
    } else if (response.status === 404) {
      // Workspace not found
    }
  }

  const data = await response.json();
  // Use data...
} catch (error) {
  console.error('Analytics API error:', error);
}
```

---

### 7️⃣ **TypeScript Types**

```typescript
// Copy these to your frontend project:
import {
  BudgetProgressResponseDto,
  GoalProgressResponseDto,
  InsightResponseDto,
  AnomalyResponseDto,
  ActionSuggestionResponseDto,
  GamificationResponseDto,
  DashboardResponseDto,
} from '@backend/analytics/dto/analytics-response.dto';

// Use in your components:
const dashboard: DashboardResponseDto = await fetchDashboard();
const budgets: BudgetProgressResponseDto[] = dashboard.budgets;
const goals: GoalProgressResponseDto[] = dashboard.goals;
```

---

## 📋 Troubleshooting

### Q: Getting 401 Unauthorized

A: Check JWT token is valid and in Authorization header

### Q: Feature flag error

A: Ensure user's plan includes FINANCE_REPORTS feature

### Q: No data returned

A: Ensure workspace has budgets, goals, and transactions

### Q: Predictions look wrong

A: Need at least 3-7 days of data for good predictions (confidence increases)

### Q: Performance is slow

A: Consider implementing caching or paginating results

---

## 🔗 Documentation Files

- [ARCHITECTURE.md](ARCHITECTURE.md) - Full architecture & SOLID details
- [IMPLEMENTATION_TODO.md](IMPLEMENTATION_TODO.md) - Database & next steps
- [README.md](README.md) - Complete feature guide

---

**Ready to use! 🚀**
