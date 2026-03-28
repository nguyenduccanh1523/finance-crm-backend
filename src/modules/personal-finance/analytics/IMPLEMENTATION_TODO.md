# 🎯 Implementation Checklist

## ✅ Completed

- [x] Core Interfaces (IBudgetAnalyticsService, IGoalAnalyticsService, etc.)
- [x] FinancialCalculationService (calculations & algorithms)
- [x] BudgetAnalyticsService (budget progress & predictions)
- [x] GoalAnalyticsService (goal tracking & velocity)
- [x] InsightService (patterns & warnings)
- [x] ActionSuggestionService (recommendations)
- [x] GamificationService (points, levels, achievements)
- [x] Response DTOs (formatted for frontend)
- [x] AnalyticsController (API endpoints)
- [x] AnalyticsModule
- [x] Architecture Documentation

## 🔄 TODO - Database Entities

### 1. Gamification Entities

```typescript
// Create file: src/modules/personal-finance/entities/user-gamification.entity.ts
@Entity('user_gamifications')
export class UserGamification {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @Column({ name: 'total_points', type: 'integer', default: 0 })
  totalPoints: number;

  @Column({ type: 'integer', default: 1 })
  level: number;

  @Column({ name: 'current_streak', type: 'integer', default: 0 })
  currentStreak: number;

  @Column({ name: 'longest_streak', type: 'integer', default: 0 })
  longestStreak: number;

  @Column({ name: 'last_activity_date', type: 'date', nullable: true })
  lastActivityDate: Date;
}

// Create file: src/modules/personal-finance/entities/achievement.entity.ts
@Entity('achievements')
export class Achievement {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  achievementId: string; // reference to achievement definition

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @Column({ name: 'unlocked_at', type: 'timestamp', nullable: true })
  unlockedAt: Date;

  @Column({ name: 'progress', type: 'integer', default: 0 })
  progress: number;
}

// Create file: src/modules/personal-finance/entities/gamification-log.entity.ts
@Entity('gamification_logs')
export class GamificationLog {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @Column({ type: 'integer' })
  points: number;

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
```

### 2. Analytics Cache Entities (Optional)

```typescript
// Create file: src/modules/personal-finance/entities/analytics-cache.entity.ts
// For performance optimization - store pre-computed insights
@Entity('analytics_cache')
export class AnalyticsCache {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @Column({ type: 'text' })
  key: string; // e.g., 'insights', 'predictions', 'anomalies'

  @Column({ type: 'jsonb' })
  data: Record<string, any>;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
```

## 🔄 TODO - Repositories

```typescript
// Create file: src/modules/personal-finance/gamification/gamification.repository.ts
@Injectable()
export class GamificationRepository extends Repository<UserGamification> {
  constructor(private dataSource: DataSource) {
    super(UserGamification, dataSource.createEntityManager());
  }

  async getOrCreate(workspaceId: string): Promise<UserGamification> {
    let gamification = await this.findOne({ where: { workspaceId } });
    if (!gamification) {
      gamification = this.create({
        id: uuidv4(),
        workspaceId,
        totalPoints: 0,
        level: 1,
      });
      await this.save(gamification);
    }
    return gamification;
  }
}

// Create file: src/modules/personal-finance/achievements/achievement.repository.ts
@Injectable()
export class AchievementRepository extends Repository<Achievement> {
  constructor(private dataSource: DataSource) {
    super(Achievement, dataSource.createEntityManager());
  }

  async unlockAchievement(
    workspaceId: string,
    achievementId: string,
  ): Promise<Achievement> {
    let achievement = await this.findOne({
      where: { workspaceId, achievementId },
    });
    if (!achievement) {
      achievement = this.create({
        id: uuidv4(),
        workspaceId,
        achievementId,
        unlockedAt: new Date(),
      });
    } else {
      achievement.unlockedAt = new Date();
    }
    return this.save(achievement);
  }
}
```

## 🔄 TODO - Module Integration

```typescript
// Update file: src/modules/personal-finance/personal-finance.module.ts
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Budget,
      Goal,
      Transaction,
      Category,
      // Add new entities:
      UserGamification,
      Achievement,
      GamificationLog,
      // AnalyticsCache,
    ]),
    AuthModule,
    BillingModule,
    AnalyticsModule, // ← ADD THIS
    // ... other modules
  ],
})
export class PersonalFinanceModule {}
```

## 🔄 TODO - Database Migration

```typescript
// Create migration file: src/database/migrations/TIMESTAMP-add-analytics-tables.ts
export class AddAnalyticsTables {
  async up(queryRunner: QueryRunner): Promise<void> {
    // Create user_gamifications table
    await queryRunner.createTable(
      new Table({
        name: 'user_gamifications',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true },
          { name: 'workspace_id', type: 'uuid', isNullable: false },
          { name: 'total_points', type: 'integer', default: 0 },
          { name: 'level', type: 'integer', default: 1 },
          { name: 'current_streak', type: 'integer', default: 0 },
          { name: 'longest_streak', type: 'integer', default: 0 },
          { name: 'last_activity_date', type: 'date', isNullable: true },
        ],
        foreignKeys: [
          {
            columnNames: ['workspace_id'],
            referencedTableName: 'personal_workspaces',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true,
    );

    // Create achievements table
    await queryRunner.createTable(
      new Table({
        name: 'achievements',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true },
          { name: 'achievement_id', type: 'text', isNullable: false },
          { name: 'workspace_id', type: 'uuid', isNullable: false },
          { name: 'unlocked_at', type: 'timestamp', isNullable: true },
          { name: 'progress', type: 'integer', default: 0 },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
        foreignKeys: [
          {
            columnNames: ['workspace_id'],
            referencedTableName: 'personal_workspaces',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
        uniques: [
          {
            columnNames: ['workspace_id', 'achievement_id'],
          },
        ],
      }),
      true,
    );

    // Create gamification_logs table
    await queryRunner.createTable(
      new Table({
        name: 'gamification_logs',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true },
          { name: 'workspace_id', type: 'uuid', isNullable: false },
          { name: 'points', type: 'integer', isNullable: false },
          { name: 'reason', type: 'text', isNullable: false },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
        foreignKeys: [
          {
            columnNames: ['workspace_id'],
            referencedTableName: 'personal_workspaces',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('gamification_logs');
    await queryRunner.dropTable('achievements');
    await queryRunner.dropTable('user_gamifications');
  }
}
```

## 🔄 TODO - Environment Configuration

```typescript
// Add to .env
ANALYTICS_CACHE_TTL=3600  # 1 hour
GAMIFICATION_ENABLED=true
INSIGHTS_BATCH_SIZE=10
ANOMALY_DETECTION_ENABLED=true
```

## 🔄 TODO - Testing

```typescript
// Create test file: src/modules/personal-finance/analytics/services/__tests__/budget-analytics.service.spec.ts
describe('BudgetAnalyticsService', () => {
  let service: BudgetAnalyticsService;
  let budgetRepo: Repository<Budget>;
  let transactionRepo: Repository<Transaction>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BudgetAnalyticsService,
        FinancialCalculationService,
        {
          provide: getRepositoryToken(Budget),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Transaction),
          useValue: {
            createQueryBuilder: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<BudgetAnalyticsService>(BudgetAnalyticsService);
  });

  it('should analyze budget progress correctly', async () => {
    // Test implementation
  });

  it('should predict budget overflow', async () => {
    // Test implementation
  });

  it('should detect spending spike anomaly', async () => {
    // Test implementation
  });
});
```

## 🔄 TODO - Frontend Integration

```typescript
// Example frontend endpoints to call:

// 1. Dashboard
GET /personal/analytics/dashboard
Response: {
  budgets: [...],           // Budget progress list
  goals: [...],             // Goal progress list
  insights: [...],          // Smart insights
  anomalies: [...],         // Detected anomalies
  suggestions: [...],       // Action suggestions
  gamification: {...},      // Gamification stats
  summary: {...}            // Overall stats
}

// 2. Smart Budget Prediction
GET /personal/analytics/budgets/:id/prediction
Response: {
  budgetId,
  predictedSpendFormatted: "₫12,300,000",
  overagePercentage: 23,
  isOverBudget: true,
  daysUntilOverBudget: 10,
  trendDirection: "UP",
  confidence: 85,
  message: "⚠️ Dự đoán vượt 23% (sau 10 ngày)"
}

// 3. Auto Budget Breakdown
POST /personal/analytics/budget-breakdown
Request: { totalBudget: 50000000 }
Response: {
  totalBudget: 50000000,
  breakdown: [
    { category: "Marketing", amount: 20000000, percentage: "40%" },
    { category: "Operations", amount: 17500000, percentage: "35%" },
    { category: "HR", amount: 7500000, percentage: "15%" },
    { category: "IT", amount: 5000000, percentage: "10%" }
  ]
}

// 4. Export Analytics
GET /personal/analytics/export
Response: JSON/CSV file download
```

---

## 📝 Notes

1. **Performance**: Consider implementing caching for insights (TTL: 1 hour)
2. **Real-time**: Use WebSockets for real-time alerts when anomalies detected
3. **Notifications**: Send push notifications for important insights
4. **Background Jobs**: Use Bull queue for periodic insight generation
5. **AI/ML**: Integrate with ML service for advanced predictions

---

## 🎯 Priority

1. **P0 (Critical)**: Gamification entities + GamificationService implementation
2. **P1 (High)**: Database integration for caching analytics
3. **P2 (Medium)**: Real-time notifications + WebSocket integration
4. **P3 (Low)**: Advanced ML predictions + Leaderboard

---

## 👤 Assignment

- [ ] Create entities (GamificationService owner)
- [ ] Implement repositories (ORM owner)
- [ ] Database migration (DevOps/DBA)
- [ ] Frontend integration (Frontend team)
- [ ] Testing (QA team)
- [ ] Documentation (Technical writer)
