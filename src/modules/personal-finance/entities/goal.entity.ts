import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { SoftDeleteEntity } from '../../../common/entities/soft-delete.entity';
import { PersonalWorkspace } from './personal-workspace.entity';
import { Account } from './account.entity';
import { GoalStatus } from '../../../common/enums/goal-status.enum';
import { GoalTransaction } from './goal-transaction.entity';

@Entity({ name: 'goals' })
@Index(['accountId'])
export class Goal extends SoftDeleteEntity {
  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId!: string;

  @ManyToOne(() => PersonalWorkspace, { onDelete: 'CASCADE' })
  workspace!: PersonalWorkspace;

  @Column({ name: 'account_id', type: 'uuid' })
  accountId!: string;

  @ManyToOne(() => Account, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account!: Account;

  @Column({ type: 'text' })
  name!: string;

  @Column({ name: 'target_amount_cents', type: 'bigint' })
  targetAmountCents!: number;

  @Column({ name: 'target_date', type: 'date' })
  targetDate!: string;

  @Column({ name: 'current_amount_cents', type: 'bigint', default: 0 })
  currentAmountCents!: number;

  @Column({ type: 'char', length: 3 })
  currency!: string; // Lấy từ account.currency

  @Column({ type: 'text' })
  status!: GoalStatus;

  /**
   * Transaction history for this goal
   * Links to all GOAL_ALLOCATION and GOAL_WITHDRAWAL transactions
   * Provides complete audit trail and enables analytics
   */
  @OneToMany(() => GoalTransaction, (gt) => gt.goal, { cascade: ['remove'] })
  goalTransactions!: GoalTransaction[];
}
