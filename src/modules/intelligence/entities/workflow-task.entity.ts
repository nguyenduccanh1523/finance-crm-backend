import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';

import { BaseEntity } from '../../../common/entities/base.entity';
import {
  AgentName,
  WorkflowTaskStatus,
  WorkflowTaskType,
} from '../workflow/workflow.enums';
import { WorkflowRunEntity } from './workflow-run.entity';
import { AgentRunEntity } from './agent-run.entity';

@Index('idx_workflow_tasks_run_id', ['workflowRunId'])
@Index('idx_workflow_tasks_run_order', ['workflowRunId', 'taskOrder'])
@Index('idx_workflow_tasks_status', ['status'])
@Index('idx_workflow_tasks_queue_status', ['queueName', 'status'])
@Entity({ name: 'workflow_tasks' })
export class WorkflowTaskEntity extends BaseEntity {
  @Column({ name: 'workflow_run_id', type: 'uuid' })
  workflowRunId!: string;

  @ManyToOne(() => WorkflowRunEntity, (run) => run.tasks, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'workflow_run_id' })
  workflowRun!: WorkflowRunEntity;

  @Column({ name: 'task_order', type: 'int' })
  taskOrder!: number;

  @Column({
    name: 'task_type',
    type: 'varchar',
    length: 100,
  })
  taskType!: WorkflowTaskType;

  @Column({
    name: 'agent_name',
    type: 'varchar',
    length: 100,
  })
  agentName!: AgentName;

  @Column({
    name: 'queue_name',
    type: 'varchar',
    length: 150,
  })
  queueName!: string;

  @Column({
    name: 'routing_key',
    type: 'varchar',
    length: 150,
  })
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

  @Column({
    name: 'output_payload',
    type: 'jsonb',
    nullable: true,
  })
  outputPayload?: Record<string, any> | null;

  @Column({
    type: 'varchar',
    length: 50,
  })
  status!: WorkflowTaskStatus;

  @Column({ name: 'attempt_count', type: 'int', default: 0 })
  attemptCount!: number;

  @Column({ name: 'max_attempts', type: 'int', default: 3 })
  maxAttempts!: number;

  @Column({ name: 'timeout_seconds', type: 'int', default: 60 })
  timeoutSeconds!: number;

  @Column({ name: 'cost_budget_cents', type: 'int', nullable: true })
  costBudgetCents?: number | null;

  @Column({
    name: 'confidence_threshold',
    type: 'double precision',
    nullable: true,
  })
  confidenceThreshold?: number | null;

  @Column({ name: 'visibility_scope', type: 'text', nullable: true })
  visibilityScope?: string | null;

  @Column({ name: 'assigned_worker', type: 'text', nullable: true })
  assignedWorker?: string | null;

  @Column({ name: 'locked_at', type: 'timestamptz', nullable: true })
  lockedAt?: Date | null;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt?: Date | null;

  @Column({ name: 'finished_at', type: 'timestamptz', nullable: true })
  finishedAt?: Date | null;

  @Column({ name: 'error_code', type: 'text', nullable: true })
  errorCode?: string | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage?: string | null;

  @OneToMany(() => AgentRunEntity, (agentRun) => agentRun.workflowTask)
  agentRuns!: AgentRunEntity[];
}
