import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

import { BaseEntity } from '../../../../common/entities/base.entity';

@Entity({ name: 'agent_runs' })
export class AgentRunEntity extends BaseEntity {
  @Column({ name: 'workflow_run_id', type: 'uuid' })
  workflowRunId!: string;

  @Column({ name: 'workflow_task_id', type: 'uuid' })
  workflowTaskId!: string;

  @Column({ name: 'workspace_id', type: 'uuid', nullable: true })
  workspaceId?: string | null;

  @Column({ name: 'org_id', type: 'uuid', nullable: true })
  orgId?: string | null;

  @Column({ name: 'agent_name' })
  agentName!: string;

  @Column()
  status!: string;

  @Column({ name: 'context_json', type: 'jsonb', default: () => "'{}'::jsonb" })
  contextJson!: Record<string, any>;

  @Column({ name: 'result_json', type: 'jsonb', nullable: true })
  resultJson?: Record<string, any> | null;

  @Column({ name: 'metrics_json', type: 'jsonb', nullable: true })
  metricsJson?: Record<string, any> | null;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt?: Date | null;

  @Column({ name: 'finished_at', type: 'timestamptz', nullable: true })
  finishedAt?: Date | null;
}
