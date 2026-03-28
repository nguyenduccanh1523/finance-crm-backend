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

/**
 * GoalTransaction Entity
 *
 * Purpose: Maintains complete transaction history for each goal
 * Connects money movements (allocation/withdrawal) to specific transactions
 *
 * Financial Flow Examples:
 *
 * 1. User allocates ₫1,000,000 to "House Fund" goal:
 *    - Creates GOAL_ALLOCATION transaction
 *    - Creates GoalTransaction(type='ALLOCATION', amount=1M)
 *    - Goal.currentAmountCents increases by 1M
 *    - Account.currentBalanceCents decreases by 1M
 *
 * 2. User uses ₫400,000 from goal for house down payment:
 *    - Creates GOAL_WITHDRAWAL transaction
 *    - Creates GoalTransaction(type='WITHDRAWAL', amount=400k)
 *    - Goal.currentAmountCents decreases by 400k
 *    - Account.currentBalanceCents increases by 400k (money returns)
 *
 * 3. Goal transaction history (audit trail):
 *    - Can see: ALLOCATIONs → goal grew, WITHDRAWALs → goal shrunk
 *    - Complete visibility: why goal has current amount
 *    - Analytics: velocity = total allocated / time elapsed
 *
 * SOLID:
 * - Single Responsibility: Only tracks goal-transaction relationships
 * - Open/Closed: Can extend with new transaction types without modifying existing
 * - Liskov Substitution: All transaction types follow same pattern
 */
@Entity({ name: 'goal_transactions' })
@Index(['goalId', 'recordedAt'])
@Index(['transactionId'])
@Index(['goalId', 'type'])
export class GoalTransaction extends BaseEntity {
  @Column({ name: 'goal_id', type: 'uuid' })
  goalId: string;

  @ManyToOne(() => Goal, (goal) => goal.goalTransactions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'goal_id' })
  goal: Goal;

  @Column({ name: 'transaction_id', type: 'uuid' })
  transactionId: string;

  @ManyToOne(() => Transaction, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'transaction_id' })
  transaction: Transaction;

  /**
   * Type of transaction relative to goal
   * - ALLOCATION: Money moved into goal (increases goal balance)
   * - WITHDRAWAL: Money taken from goal (decreases goal balance)
   */
  @Column({ name: 'type', type: 'text' })
  type: GoalTransactionType;

  /**
   * Amount contributed/withdrawn (in cents)
   * Always positive; type determines +/- semantics
   *
   * Example:
   * - ALLOCATION with 100M cents → goal += 100M
   * - WITHDRAWAL with 100M cents → goal -= 100M
   */
  @Column({ name: 'amount_cents', type: 'bigint' })
  amountCents: number;

  /**
   * When this transaction was recorded relative to goal
   * Used for goal analytics:
   * - Timeline of contributions
   * - Velocity calculation: SUM(allocation amounts) / days
   * - Completion date estimation based on recent velocity
   */
  @CreateDateColumn({ name: 'recorded_at', type: 'timestamptz' })
  recordedAt: Date;

  /**
   * Optional notes about this transaction
   * Example: "Monthly contribution", "Used for renovation", "Emergency withdrawal"
   */
  @Column({ name: 'note', type: 'text', nullable: true })
  note?: string;
}
