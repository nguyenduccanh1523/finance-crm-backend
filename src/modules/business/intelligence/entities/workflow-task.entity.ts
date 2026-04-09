import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

import { BaseEntity } from '../../../../common/entities/base.entity';

@Entity({ name: 'workflow_tasks' })
export class WorkflowTaskEntity extends BaseEntity {
  @Column({ name: 'workflow_run_id', type: 'uuid' })
  workflowRunId!: string;

  @Column({ name: 'task_order', type: 'int' })
  taskOrder!: number;

  @Column({ name: 'task_type' })
  taskType!: string;

  @Column({ name: 'agent_name' })
  agentName!: string;

  @Column({ name: 'queue_name' })
  queueName!: string;

  @Column({ name: 'routing_key' })
  routingKey!: string;

  @Column({
    name: 'depends_on_task_ids',
    type: 'jsonb',
    default: () => "'[]'::jsonb",
  })
  dependsOnTaskIds!: string[];

  @Column({
    name: 'input_payload',
    type: 'jsonb',
    default: () => "'{}'::jsonb",
  })
  inputPayload!: Record<string, any>;

  @Column()
  status!: string;

  @Column({ name: 'attempt_count', default: 0 })
  attemptCount!: number;

  @Column({ name: 'max_attempts', default: 3 })
  maxAttempts!: number;

  @Column({ name: 'timeout_seconds', default: 60 })
  timeoutSeconds!: number;

  @Column({ name: 'cost_budget_cents', type: 'int', nullable: true })
  costBudgetCents?: number | null;

  @Column({
    name: 'confidence_threshold',
    type: 'numeric',
    precision: 5,
    scale: 4,
    nullable: true,
  })
  confidenceThreshold?: number | null;

  @Column({ name: 'visibility_scope', nullable: true })
  visibilityScope?: string | null;

  @Column({ name: 'assigned_worker', nullable: true })
  assignedWorker?: string | null;

  @Column({ name: 'locked_at', type: 'timestamptz', nullable: true })
  lockedAt?: Date | null;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt?: Date | null;

  @Column({ name: 'finished_at', type: 'timestamptz', nullable: true })
  finishedAt?: Date | null;

  @Column({ name: 'output_payload', type: 'jsonb', nullable: true })
  outputPayload?: Record<string, any> | null;

  @Column({ name: 'error_code', nullable: true })
  errorCode?: string | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage?: string | null;
}
