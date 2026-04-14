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

@Entity({ name: 'budget_transactions' })
@Unique(['budgetId', 'transactionId']) // Prevent double-counting same transaction in same budget
@Index(['budgetId', 'recordedAt'])
@Index(['transactionId'])
export class BudgetTransaction extends BaseEntity {
  @Column({ name: 'budget_id', type: 'uuid' })
  budgetId!: string;

  @ManyToOne(() => Budget, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'budget_id' })
  budget!: Budget;

  @Column({ name: 'transaction_id', type: 'uuid' })
  transactionId!: string;

  @ManyToOne(() => Transaction, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'transaction_id' })
  transaction!: Transaction;

  /**
   * Amount charged against this budget (in cents)
   * May differ from transaction amount if split across multiple budgets
   * Example: ₫100k transaction split 60% marketing, 40% operations
   */
  @Column({ name: 'amount_cents', type: 'bigint' })
  amountCents!: number;

  /**
   * When this transaction was recorded/linked to the budget
   * Allows tracking of budget entries timeline
   */
  @CreateDateColumn({ name: 'recorded_at', type: 'timestamptz' })
  recordedAt!: Date;
}
