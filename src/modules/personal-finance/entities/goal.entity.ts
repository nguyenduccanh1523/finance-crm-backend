import { Column, Entity, ManyToOne } from 'typeorm';
import { SoftDeleteEntity } from '../../../common/entities/soft-delete.entity';
import { PersonalWorkspace } from './personal-workspace.entity';
import { GoalStatus } from '../../../common/enums/goal-status.enum';

@Entity({ name: 'goals' })
export class Goal extends SoftDeleteEntity {
  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @ManyToOne(() => PersonalWorkspace, { onDelete: 'CASCADE' })
  workspace: PersonalWorkspace;

  @Column({ type: 'text' })
  name: string;

  @Column({ name: 'target_amount_cents', type: 'bigint' })
  targetAmountCents: number;

  @Column({ name: 'target_date', type: 'date' })
  targetDate: string;

  @Column({ name: 'current_amount_cents', type: 'bigint', default: 0 })
  currentAmountCents: number;

  @Column({ type: 'text' })
  status: GoalStatus;
}
