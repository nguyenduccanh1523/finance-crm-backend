import { Column, Entity, Index, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { PersonalWorkspace } from './personal-workspace.entity';

@Entity({ name: 'budgets' })
@Index(['workspaceId', 'periodMonth', 'categoryId'], { unique: true })
export class Budget extends BaseEntity {
  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @ManyToOne(() => PersonalWorkspace, { onDelete: 'CASCADE' })
  workspace: PersonalWorkspace;

  @Column({ name: 'period_month', type: 'date' })
  periodMonth: string;

  @Column({ name: 'category_id', type: 'uuid', nullable: true })
  categoryId?: string;

  @Column({ name: 'amount_limit_cents', type: 'bigint' })
  amountLimitCents: number;

  @Column({ name: 'alert_threshold_percent', type: 'integer', default: 80 })
  alertThresholdPercent: number;
}
