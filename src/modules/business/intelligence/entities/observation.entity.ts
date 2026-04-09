import { Entity, Column } from 'typeorm';

import { BaseEntity } from '../../../../common/entities/base.entity';

@Entity({ name: 'observations' })
export class ObservationEntity extends BaseEntity {
  @Column({ name: 'workflow_run_id', type: 'uuid' })
  workflowRunId!: string;

  @Column({ name: 'workflow_task_id', type: 'uuid', nullable: true })
  workflowTaskId?: string | null;

  @Column({ name: 'observation_type' })
  observationType!: string;

  @Column({ name: 'observation_key' })
  observationKey!: string;

  @Column({ name: 'value_json', type: 'jsonb' })
  valueJson!: Record<string, any>;

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
