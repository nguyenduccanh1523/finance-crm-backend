import {
  Column,
  Entity,
  Index,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Goal } from './goal.entity';
import { Transaction } from './transaction.entity';

export type GoalTransactionType = 'ALLOCATION' | 'WITHDRAWAL';

@Entity({ name: 'goal_transactions' })
@Index(['goalId', 'recordedAt'])
@Index(['transactionId'])
@Index(['goalId', 'type'])
export class GoalTransaction extends BaseEntity {
  @Column({ name: 'goal_id', type: 'uuid' })
  goalId!: string;

  @ManyToOne(() => Goal, (goal) => goal.goalTransactions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'goal_id' })
  goal!: Goal;

  @Column({ name: 'transaction_id', type: 'uuid' })
  transactionId!: string;

  @ManyToOne(() => Transaction, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'transaction_id' })
  transaction!: Transaction;

  /**
   * Type of transaction relative to goal
   * - ALLOCATION: Money moved into goal (increases goal balance)
   * - WITHDRAWAL: Money taken from goal (decreases goal balance)
   */
  @Column({ name: 'type', type: 'text' })
  type!: GoalTransactionType;

  /**
   * Amount contributed/withdrawn (in cents)
   * Always positive; type determines +/- semantics
   *
   * Example:
   * - ALLOCATION with 100M cents → goal += 100M
   * - WITHDRAWAL with 100M cents → goal -= 100M
   */
  @Column({ name: 'amount_cents', type: 'bigint' })
  amountCents!: number;

  @CreateDateColumn({ name: 'recorded_at', type: 'timestamptz' })
  recordedAt!: Date;

  /**
   * Optional notes about this transaction
   * Example: "Monthly contribution", "Used for renovation", "Emergency withdrawal"
   */
  @Column({ name: 'note', type: 'text', nullable: true })
  note?: string;
}
