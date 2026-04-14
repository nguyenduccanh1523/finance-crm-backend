import { Entity, Column } from 'typeorm';

import { BaseEntity } from '../../../../common/entities/base.entity';

@Entity({ name: 'signals' })
export class SignalEntity extends BaseEntity {
  @Column({ name: 'workflow_run_id', type: 'uuid' })
  workflowRunId!: string;

  @Column({ name: 'signal_name' })
  signalName!: string;

  @Column({ name: 'signal_value' })
  signalValue!: string;

  @Column({ type: 'numeric', precision: 8, scale: 4, nullable: true })
  score?: number | null;

  @Column({
    name: 'confidence_score',
    type: 'numeric',
    precision: 5,
    scale: 4,
    nullable: true,
  })
  confidenceScore?: number | null;

  @Column({ type: 'text', nullable: true })
  explanation?: string | null;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  payload!: Record<string, any>;
}
