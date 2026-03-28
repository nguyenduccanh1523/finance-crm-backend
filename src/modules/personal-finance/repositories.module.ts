import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { PersonalWorkspace } from './entities/personal-workspace.entity';
import { Account } from './entities/account.entity';
import { Category } from './entities/category.entity';
import { Tag } from './entities/tag.entity';
import { Transaction } from './entities/transaction.entity';
import { TransactionTag } from './entities/transaction-tag.entity';
import { Budget } from './entities/budget.entity';
import { Goal } from './entities/goal.entity';
import { RecurringRule } from './entities/recurring-rule.entity';
import { Attachment } from './entities/attachment.entity';
import { BudgetTransaction } from './entities/budget-transaction.entity';
import { GoalTransaction } from './entities/goal-transaction.entity';
import { ExchangeRate } from './entities/exchange-rate.entity';

// Repositories
import { PersonalWorkspaceRepository } from './workspace/personal-workspace.repository';
import { AccountsRepository } from './accounts/accounts.repository';
import { CategoriesRepository } from './categories/categories.repository';
import { TagsRepository } from './tags/tags.repository';
import { TransactionsRepository } from './transactions/transactions.repository';
import { BudgetsRepository } from './budgets/budgets.repository';
import { GoalsRepository } from './goals/goals.repository';
import { GoalTransactionsRepository } from './goals/goal-transactions.repository';
import { RecurringRulesRepository } from './recurring-rules/recurring-rules.repository';
import { ExchangeRateRepository } from './common/exchange-rate.repository';

/**
 * Repositories Module
 *
 * Centralized repository management for PersonalFinance domain.
 * This module provides all repositories and entities to other modules that need them.
 */
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
      Goal,
      RecurringRule,
      Attachment,
      BudgetTransaction,
      GoalTransaction,
      ExchangeRate,
    ]),
  ],
  providers: [
    PersonalWorkspaceRepository,
    AccountsRepository,
    CategoriesRepository,
    TagsRepository,
    TransactionsRepository,
    BudgetsRepository,
    GoalsRepository,
    GoalTransactionsRepository,
    RecurringRulesRepository,
    ExchangeRateRepository,
  ],
  exports: [
    PersonalWorkspaceRepository,
    AccountsRepository,
    CategoriesRepository,
    TagsRepository,
    TransactionsRepository,
    BudgetsRepository,
    GoalsRepository,
    GoalTransactionsRepository,
    RecurringRulesRepository,
    ExchangeRateRepository,
  ],
})
export class RepositoriesModule {}
