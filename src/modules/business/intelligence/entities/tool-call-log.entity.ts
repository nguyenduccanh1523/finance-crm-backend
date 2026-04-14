import { Entity, Column } from 'typeorm';

import { BaseEntity } from '../../../../common/entities/base.entity';

@Entity({ name: 'tool_call_logs' })
export class ToolCallLogEntity extends BaseEntity {
  @Column({ name: 'workflow_run_id', type: 'uuid' })
  workflowRunId!: string;

  @Column({ name: 'workflow_task_id', type: 'uuid' })
  workflowTaskId!: string;

  @Column({ name: 'agent_run_id', type: 'uuid', nullable: true })
  agentRunId?: string | null;

  @Column({ name: 'tool_name' })
  toolName!: string;

  @Column({ name: 'tool_provider', default: 'archestra' })
  toolProvider!: string;

  @Column({
    name: 'request_payload',
    type: 'jsonb',
    default: () => "'{}'::jsonb",
  })
  requestPayload!: Record<string, any>;

  @Column({ name: 'response_payload', type: 'jsonb', nullable: true })
  responsePayload?: Record<string, any> | null;

  @Column()
  status!: string;

  @Column({ name: 'latency_ms', type: 'int', nullable: true })
  latencyMs?: number | null;

  @Column({ name: 'token_usage', type: 'jsonb', nullable: true })
  tokenUsage?: Record<string, any> | null;

  @Column({ name: 'cost_cents', type: 'int', nullable: true })
  costCents?: number | null;

  @Column({
    name: 'confidence_score',
    type: 'numeric',
    precision: 5,
    scale: 4,
    nullable: true,
  })
  confidenceScore?: number | null;

  @Column({ name: 'blocked_reason', type: 'text', nullable: true })
  blockedReason?: string | null;

  @Column({ name: 'finished_at', type: 'timestamptz', nullable: true })
  finishedAt?: Date | null;
}
