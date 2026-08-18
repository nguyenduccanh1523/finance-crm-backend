import { Column, Entity, Index } from 'typeorm';
import { SoftDeleteEntity } from '../../../../common/entities/soft-delete.entity';


@Entity({ name: 'tasks' })
@Index(['orgId', 'statusId', 'dueAt'])
export class Task extends SoftDeleteEntity {
  @Column({ name: 'org_id', type: 'uuid' })
  orgId: string;

  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @Column() title: string;
  @Column({ type: 'varchar', nullable: true }) description?: string | null;

  @Column({ name: 'status_id', type: 'uuid' })
  statusId: string;

  @Column({ name: 'work_type_id', type: 'uuid' })
  workTypeId: string;

  @Column({ default: 0 })
  priority: number;

  @Column({ name: 'due_at', type: 'timestamptz', nullable: true })
  dueAt?: Date | null;

  @Column({ name: 'estimate_minutes', type: 'integer', nullable: true })
  estimateMinutes?: number | null;

  @Column({ name: 'actual_minutes', type: 'integer', default: 0 })
  actualMinutes: number;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  @Column({ name: 'assigned_by', type: 'uuid', nullable: true })
  assignedBy?: string | null;
}
