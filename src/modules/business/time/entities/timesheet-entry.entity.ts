import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../../common/entities/base.entity';

@Entity({ name: 'timesheet_entries' })
@Index(['orgId', 'workDate'])
export class TimesheetEntry extends BaseEntity {
  @Column({ name: 'org_id', type: 'uuid' })
  orgId: string;

  @Column({ name: 'membership_id', type: 'uuid' })
  membershipId: string;

  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  projectId?: string;

  @Column({ name: 'task_id', type: 'uuid', nullable: true })
  taskId?: string;

  @Column({ name: 'work_type_id', type: 'uuid' })
  workTypeId: string;

  @Column() minutes: number;

  @Column({ name: 'work_date', type: 'date' })
  workDate: string;

  @Column({ nullable: true }) description?: string;

  @Column() status: string;

  @Column({ name: 'approved_by', type: 'uuid', nullable: true })
  approvedBy?: string;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt?: Date;
}
