import { Column, Entity, Index, OneToMany } from 'typeorm';

import { BaseEntity } from '../../../common/entities/base.entity';
import {
  WorkflowName,
  WorkflowRunStatus,
  WorkflowScopeType,
  WorkflowTriggerSource,
  WorkflowVersion,
} from '../workflow/workflow.enums';
import { WorkflowTaskEntity } from './workflow-task.entity';
import { AgentRunEntity } from './agent-run.entity';

@Index('idx_workflow_runs_status', ['status'])
@Index('idx_workflow_runs_workspace_status', ['workspaceId', 'status'])
@Index('idx_workflow_runs_org_status', ['orgId', 'status'])
@Index('idx_workflow_runs_idempotency_key', ['idempotencyKey'])
@Entity({ name: 'workflow_runs' })
export class WorkflowRunEntity extends BaseEntity {
  @Column({
    name: 'workflow_name',
    type: 'varchar',
    length: 100,
  })
  workflowName!: WorkflowName;

  @Column({
    name: 'workflow_version',
    type: 'varchar',
    length: 20,
    default: WorkflowVersion.V1,
  })
  workflowVersion!: WorkflowVersion;

  @Column({
    name: 'scope_type',
    type: 'varchar',
    length: 50,
  })
  scopeType!: WorkflowScopeType;

  @Column({ name: 'workspace_id', type: 'uuid', nullable: true })
  workspaceId!: string | null;

  @Column({ name: 'org_id', type: 'uuid', nullable: true })
  orgId!: string | null;

  @Column({ name: 'requested_by_user_id', type: 'uuid', nullable: true })
  requestedByUserId?: string | null;

  @Column({
    name: 'trigger_source',
    type: 'varchar',
    length: 50,
  })
  triggerSource!: WorkflowTriggerSource;

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

  @Column({
    name: 'result_json',
    type: 'jsonb',
    nullable: true,
  })
  resultJson?: Record<string, any> | null;

  @Column({
    name: 'metrics_json',
    type: 'jsonb',
    nullable: true,
  })
  metricsJson?: Record<string, any> | null;

  @Column({
    type: 'varchar',
    length: 50,
  })
  status!: WorkflowRunStatus;

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

  @OneToMany(() => WorkflowTaskEntity, (task) => task.workflowRun)
  tasks!: WorkflowTaskEntity[];

  @OneToMany(() => AgentRunEntity, (agentRun) => agentRun.workflowRun)
  agentRuns!: AgentRunEntity[];
}
