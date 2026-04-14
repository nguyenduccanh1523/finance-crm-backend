import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PersonalWorkspace } from './entities/personal-workspace.entity';
import { Account } from './entities/account.entity';
import { Category } from './entities/category.entity';
import { Tag } from './entities/tag.entity';
import { Transaction } from './entities/transaction.entity';
import { TransactionTag } from './entities/transaction-tag.entity';
import { Budget } from './entities/budget.entity';
import { BudgetTransaction } from './entities/budget-transaction.entity';
import { GoalTransaction } from './entities/goal-transaction.entity';
import { Goal } from './entities/goal.entity';
import { RecurringRule } from './entities/recurring-rule.entity';
import { Attachment } from './entities/attachment.entity';

import { PersonalWorkspaceService } from './workspace/personal-workspace.service';
import { PersonalWorkspaceController } from './workspace/personal-workspace.controller';
import { PersonalWorkspaceRepository } from './workspace/personal-workspace.repository';

import { PersonalPlanPolicyService } from './common/personal-plan-policy.service';

import { AccountsService } from './accounts/accounts.service';
import { AccountsController } from './accounts/accounts.controller';
import { AccountsAdminController } from './accounts/accounts.admin.controller';
import { AccountsRepository } from './accounts/accounts.repository';

import { CategoriesService } from './categories/categories.service';
import { CategoriesController } from './categories/categories.controller';
import { CategoriesAdminController } from './categories/categories.admin.controller';
import { CategoriesRepository } from './categories/categories.repository';

import { TagsService } from './tags/tags.service';
import { TagsController } from './tags/tags.controller';
import { TagsAdminController } from './tags/tags.admin.controller';
import { TagsRepository } from './tags/tags.repository';

import { TransactionsService } from './transactions/transactions.service';
import { TransactionsController } from './transactions/transactions.controller';
import { TransactionsAdminController } from './transactions/transactions.admin.controller';
import { TransactionsRepository } from './transactions/transactions.repository';

import { BudgetsService } from './budgets/budgets.service';
import { BudgetsController } from './budgets/budgets.controller';
import { BudgetsRepository } from './budgets/budgets.repository';
import { BudgetTransactionsRepository } from './budgets/budget-transactions.repository';

import { GoalsService } from './goals/goals.service';
import { GoalsController } from './goals/goals.controller';
import { GoalsRepository } from './goals/goals.repository';

import { RecurringRulesService } from './recurring-rules/recurring-rules.service';
import { RecurringRulesController } from './recurring-rules/recurring-rules.controller';
import { RecurringRulesRepository } from './recurring-rules/recurring-rules.repository';

import { RepositoriesModule } from './repositories.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PersonalWorkspace,
      Account,
      Category,
      Tag,
      Transaction,
      TransactionTag,
      Budget,
      BudgetTransaction,
      Goal,
      GoalTransaction,
      RecurringRule,
      Attachment,
    ]),
    BillingModule,
    RepositoriesModule,
    AnalyticsModule,
  ],
  controllers: [
    PersonalWorkspaceController,

    AccountsController,
    AccountsAdminController,

    CategoriesController,
    CategoriesAdminController,

    TagsController,
    TagsAdminController,

    TransactionsController,
    TransactionsAdminController,

    BudgetsController,
    GoalsController,
    RecurringRulesController,
  ],
  providers: [
    PersonalWorkspaceService,
    PersonalWorkspaceRepository,
    PersonalPlanPolicyService,

    AccountsService,
    AccountsRepository,

    CategoriesService,
    CategoriesRepository,

    TagsService,
    TagsRepository,

    TransactionsService,
    TransactionsRepository,

    BudgetsService,
    BudgetsRepository,
    BudgetTransactionsRepository,

    GoalsService,
    GoalsRepository,

    RecurringRulesService,
    RecurringRulesRepository,
  ],
  exports: [PersonalWorkspaceService, PersonalPlanPolicyService],
})
export class PersonalFinanceModule {}
