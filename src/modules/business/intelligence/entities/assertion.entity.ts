import { Entity, Column } from 'typeorm';

import { BaseEntity } from '../../../../common/entities/base.entity';

@Entity({ name: 'assertions' })
export class AssertionEntity extends BaseEntity {
  @Column({ name: 'workflow_run_id', type: 'uuid' })
  workflowRunId!: string;

  @Column({ name: 'workflow_task_id', type: 'uuid', nullable: true })
  workflowTaskId?: string | null;

  @Column({ name: 'assertion_type' })
  assertionType!: string;

  @Column({ name: 'assertion_text', type: 'text' })
  assertionText!: string;

  @Column({ nullable: true })
  severity?: string | null;

  @Column({
    name: 'confidence_score',
    type: 'numeric',
    precision: 5,
    scale: 4,
    nullable: true,
  })
  confidenceScore?: number | null;

  @Column({
    name: 'source_record_ids',
    type: 'jsonb',
    default: () => "'[]'::jsonb",
  })
  sourceRecordIds!: string[];
}
