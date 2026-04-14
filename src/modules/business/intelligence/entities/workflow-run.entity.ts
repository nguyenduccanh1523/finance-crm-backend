import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

import { BaseEntity } from '../../../../common/entities/base.entity';

@Entity({ name: 'workflow_runs' })
export class WorkflowRunEntity extends BaseEntity {
  @Column({ name: 'workflow_name' })
  workflowName!: string;

  @Column({ name: 'workflow_version', default: 'v1' })
  workflowVersion!: string;

  @Column({ name: 'scope_type' })
  scopeType!: string;

  @Column({ name: 'workspace_id', type: 'uuid', nullable: true })
  workspaceId!: string | null;

  @Column({ name: 'org_id', type: 'uuid', nullable: true })
  orgId!: string | null;

  @Column({ name: 'requested_by_user_id', type: 'uuid', nullable: true })
  requestedByUserId?: string | null;

  @Column({ name: 'trigger_source' })
  triggerSource!: string;

  @Column({ name: 'trigger_event', type: 'text', nullable: true })
  triggerEvent?: string | null;

  @Column({
    name: 'request_payload',
    type: 'jsonb',
    default: () => "'{}'::jsonb",
  })
  requestPayload!: Record<string, any>;

  @Column({
    name: 'planning_snapshot',
    type: 'jsonb',
    default: () => "'{}'::jsonb",
  })
  planningSnapshot!: Record<string, any>;

  @Column()
  status!: string;

  @Column({ default: 5 })
  priority!: number;

  @Column({ name: 'idempotency_key', type: 'text', nullable: true })
  idempotencyKey?: string | null;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt?: Date | null;

  @Column({ name: 'finished_at', type: 'timestamptz', nullable: true })
  finishedAt?: Date | null;

  @Column({ name: 'error_code', type: 'text', nullable: true })
  errorCode?: string | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage?: string | null;
}
