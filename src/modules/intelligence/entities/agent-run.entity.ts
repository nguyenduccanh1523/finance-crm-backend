import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { BaseEntity } from '../../../common/entities/base.entity';
import { AgentName, AgentRunStatus } from '../workflow/workflow.enums';
import { WorkflowRunEntity } from './workflow-run.entity';
import { WorkflowTaskEntity } from './workflow-task.entity';

@Index('idx_agent_runs_workflow_run_id', ['workflowRunId'])
@Index('idx_agent_runs_workflow_task_id', ['workflowTaskId'])
@Index('idx_agent_runs_agent_status', ['agentName', 'status'])
@Entity({ name: 'agent_runs' })
export class AgentRunEntity extends BaseEntity {
  @Column({ name: 'workflow_run_id', type: 'uuid' })
  workflowRunId!: string;

  @ManyToOne(() => WorkflowRunEntity, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'workflow_run_id' })
  workflowRun!: WorkflowRunEntity;

  @Column({ name: 'workflow_task_id', type: 'uuid' })
  workflowTaskId!: string;

  @ManyToOne(() => WorkflowTaskEntity, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'workflow_task_id' })
  workflowTask!: WorkflowTaskEntity;

  @Column({ name: 'workspace_id', type: 'uuid', nullable: true })
  workspaceId?: string | null;

  @Column({ name: 'org_id', type: 'uuid', nullable: true })
  orgId?: string | null;

  @Column({
    name: 'agent_name',
    type: 'varchar',
    length: 100,
  })
  agentName!: AgentName;

  @Column({
    type: 'varchar',
    length: 50,
  })
  status!: AgentRunStatus;

  @Column({
    name: 'context_json',
    type: 'jsonb',
    default: () => "'{}'::jsonb",
  })
  contextJson!: Record<string, any>;

  @Column({ name: 'result_json', type: 'jsonb', nullable: true })
  resultJson?: Record<string, any> | null;

  @Column({ name: 'metrics_json', type: 'jsonb', nullable: true })
  metricsJson?: Record<string, any> | null;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt?: Date | null;

  @Column({ name: 'finished_at', type: 'timestamptz', nullable: true })
  finishedAt?: Date | null;

  @Column({ name: 'error_code', type: 'text', nullable: true })
  errorCode?: string | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage?: string | null;
}
