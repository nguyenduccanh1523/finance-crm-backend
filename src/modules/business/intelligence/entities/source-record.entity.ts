import { Entity, Column } from 'typeorm';

import { BaseEntity } from '../../../../common/entities/base.entity';

@Entity({ name: 'source_records' })
export class SourceRecordEntity extends BaseEntity {
  @Column({ name: 'workflow_run_id', type: 'uuid' })
  workflowRunId!: string;

  @Column({ name: 'workflow_task_id', type: 'uuid', nullable: true })
  workflowTaskId?: string | null;

  @Column({ name: 'agent_run_id', type: 'uuid', nullable: true })
  agentRunId?: string | null;

  @Column({ name: 'source_type' })
  sourceType!: string;

  @Column({ name: 'source_uri', type: 'text', nullable: true })
  sourceUri?: string | null;

  @Column({ name: 'source_ref', type: 'text', nullable: true })
  sourceRef?: string | null;

  @Column({ type: 'text', nullable: true })
  title?: string | null;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  content!: Record<string, any>;

  @Column({ name: 'visibility_scope', type: 'text', nullable: true })
  visibilityScope?: string | null;
}
