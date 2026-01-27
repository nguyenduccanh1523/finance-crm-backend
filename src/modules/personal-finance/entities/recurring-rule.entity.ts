import { Column, Entity, Index, ManyToOne } from 'typeorm';
import { SoftDeleteEntity } from '../../../common/entities/soft-delete.entity';
import { PersonalWorkspace } from './personal-workspace.entity';

@Entity({ name: 'recurring_rules' })
@Index(['nextRunAt'])
export class RecurringRule extends SoftDeleteEntity {
  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @ManyToOne(() => PersonalWorkspace, { onDelete: 'CASCADE' })
  workspace: PersonalWorkspace;

  @Column({ type: 'text' })
  type: string;

  @Column({ name: 'amount_cents', type: 'bigint' })
  amountCents: number;

  @Column({ type: 'char', length: 3 })
  currency: string;

  @Column({ type: 'text' })
  rrule: string;

  @Column({ name: 'next_run_at', type: 'timestamptz' })
  nextRunAt: Date;

  @Column({ name: 'end_at', type: 'timestamptz', nullable: true })
  endAt?: Date;
}
