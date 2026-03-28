import {
  Column,
  Entity,
  Index,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Budget } from './budget.entity';
import { Transaction } from './transaction.entity';

/**
 * BudgetTransaction Entity
 *
 * Purpose: Links spending transactions to their corresponding budgets
 * This allows accurate tracking of budget spending without recalculating from transactions
 *
 * Flow:
 * 1. User creates EXPENSE transaction with categoryId
 * 2. System creates BudgetTransaction linking transaction to the budget for that month+category
 * 3. Budget analytics queries BudgetTransaction instead of manual transaction aggregation
 *
 * SOLID: Single Responsibility - only tracks the relationship between budget and transaction
 */
@Entity({ name: 'budget_transactions' })
@Unique(['budgetId', 'transactionId']) // Prevent double-counting same transaction in same budget
@Index(['budgetId', 'recordedAt'])
@Index(['transactionId'])
export class BudgetTransaction extends BaseEntity {
  @Column({ name: 'budget_id', type: 'uuid' })
  budgetId: string;

  @ManyToOne(() => Budget, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'budget_id' })
  budget: Budget;

  @Column({ name: 'transaction_id', type: 'uuid' })
  transactionId: string;

  @ManyToOne(() => Transaction, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'transaction_id' })
  transaction: Transaction;

  /**
   * Amount charged against this budget (in cents)
   * May differ from transaction amount if split across multiple budgets
   * Example: ₫100k transaction split 60% marketing, 40% operations
   */
  @Column({ name: 'amount_cents', type: 'bigint' })
  amountCents: number;

  /**
   * When this transaction was recorded/linked to the budget
   * Allows tracking of budget entries timeline
   */
  @CreateDateColumn({ name: 'recorded_at', type: 'timestamptz' })
  recordedAt: Date;
}
