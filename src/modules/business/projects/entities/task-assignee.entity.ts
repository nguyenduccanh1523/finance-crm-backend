import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'task_assignees' })
export class TaskAssignee {
  @PrimaryColumn({ name: 'task_id', type: 'uuid' })
  taskId: string;

  @PrimaryColumn({ name: 'membership_id', type: 'uuid' })
  membershipId: string;
}
