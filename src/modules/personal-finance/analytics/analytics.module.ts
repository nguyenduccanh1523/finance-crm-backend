import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsController } from './analytics.controller';
import {
  FinancialCalculationService,
  BudgetAnalyticsService,
  BudgetAnalyticsWithCurrencyService,
  GoalAnalyticsService,
  GoalAnalyticsWithCurrencyService,
  InsightService,
  ActionSuggestionService,
  GamificationService,
} from './services/index';
import { Budget } from '../entities/budget.entity';
import { Goal } from '../entities/goal.entity';
import { Transaction } from '../entities/transaction.entity';
import { Category } from '../entities/category.entity';
import { PersonalWorkspace } from '../entities/personal-workspace.entity';
import { PersonalWorkspaceService } from '../workspace/personal-workspace.service';
import { ExchangeRateService } from '../common/exchange-rate.service';
import { RepositoriesModule } from '../repositories.module';
import { BillingModule } from '../../billing/billing.module';

/**
 * Analytics Module
 *
 * SOLID Architecture:
 * - S (Single Responsibility): Mỗi service chỉ thực hiện một task
 *   - FinancialCalculationService: Chỉ tính toán
 *   - BudgetAnalyticsService: Chỉ analytics ngân sách
 *   - GoalAnalyticsService: Chỉ analytics mục tiêu
 *   - InsightService: Chỉ generate insights
 *   - ActionSuggestionService: Chỉ gợi ý hành động
 *   - GamificationService: Chỉ handle gamification
 *
 * - O (Open/Closed): Mở rộng mà không sửa code hiện tại
 *   - Có thể thêm services mới mà không sửa existing
 *   - Có thể extend services bằng cách tạo subclasses
 *
 * - L (Liskov Substitution): Implement interfaces
 *   - Mỗi service implement interface tương ứng
 *   - Có thể thay thế bằng mock services cho testing
 *
 * - I (Interface Segregation): Specific interfaces
 *   - IBudgetAnalyticsService: Chỉ có budget methods
 *   - IGoalAnalyticsService: Chỉ có goal methods
 *   - Không có "god interface"
 *
 * - D (Dependency Inversion): Depend on abstractions
 *   - Services depend on interfaces, không concrete classes
 *   - Controller depends on services thông qua interfaces
 *
 * Cấu trúc folders:
 * analytics/
 *   ├── interfaces/           # Abstractions
 *   │   └── analytics.interface.ts
 *   ├── services/             # Business logic
 *   │   ├── financial-calculation.service.ts
 *   │   ├── budget-analytics.service.ts
 *   │   ├── goal-analytics.service.ts
 *   │   ├── insight.service.ts
 *   │   ├── action-suggestion.service.ts
 *   │   ├── gamification.service.ts
 *   │   └── index.ts
 *   ├── dto/                  # Response models
 *   │   └── analytics-response.dto.ts
 *   ├── analytics.controller.ts
 *   ├── analytics.module.ts
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Budget,
      Goal,
      Transaction,
      Category,
      PersonalWorkspace,
    ]),
    RepositoriesModule,
    BillingModule,
  ],
  controllers: [AnalyticsController],
  providers: [
    FinancialCalculationService,
    BudgetAnalyticsService,
    BudgetAnalyticsWithCurrencyService,
    GoalAnalyticsService,
    GoalAnalyticsWithCurrencyService,
    InsightService,
    ActionSuggestionService,
    GamificationService,
    PersonalWorkspaceService,
    ExchangeRateService,
  ],
  exports: [
    FinancialCalculationService,
    BudgetAnalyticsService,
    BudgetAnalyticsWithCurrencyService,
    GoalAnalyticsService,
    GoalAnalyticsWithCurrencyService,
    InsightService,
    ActionSuggestionService,
    GamificationService,
    ExchangeRateService,
  ],
})
export class AnalyticsModule {}
