import {
  Column,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { PersonalWorkspace } from './personal-workspace.entity';
import { Account } from './account.entity';
import { BudgetTransaction } from './budget-transaction.entity';

@Entity({ name: 'budgets' })
@Index(['workspaceId', 'periodMonth', 'categoryId'], { unique: true })
@Index(['accountId'])
export class Budget extends BaseEntity {
  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @ManyToOne(() => PersonalWorkspace, { onDelete: 'CASCADE' })
  workspace: PersonalWorkspace;

  @Column({ name: 'account_id', type: 'uuid' })
  accountId: string;

  @ManyToOne(() => Account, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account: Account;

  @Column({ name: 'period_month', type: 'date' })
  periodMonth: string;

  @Column({ name: 'category_id', type: 'uuid', nullable: true })
  categoryId?: string;

  @Column({ name: 'amount_limit_cents', type: 'bigint' })
  amountLimitCents: number;

  @Column({ type: 'char', length: 3 })
  currency: string; // Lấy từ account.currency

  @Column({ name: 'alert_threshold_percent', type: 'integer', default: 80 })
  alertThresholdPercent: number;

  /**
   * All transactions linked to this budget
   * Represents the actual spending against this budget
   * Instead of aggregating from transactions by category,
   * we have explicit links which are more reliable and clearer
   */
  @OneToMany(() => BudgetTransaction, (bt) => bt.budget, {
    cascade: ['remove'],
  })
  budgetTransactions: BudgetTransaction[];
}
