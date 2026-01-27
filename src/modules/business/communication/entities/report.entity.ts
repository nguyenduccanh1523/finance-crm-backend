import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../../common/entities/base.entity';

@Entity({ name: 'reports' })
@Index(['orgId', 'generatedAt'])
export class Report extends BaseEntity {
  @Column({ name: 'org_id', type: 'uuid', nullable: true })
  orgId?: string;

  @Column() type: string;

  @Column({ type: 'jsonb' })
  params: Record<string, any>;

  @Column({ name: 'file_url' })
  fileUrl: string;

  @Column({ name: 'generated_by_user_id', type: 'uuid' })
  generatedByUserId: string;

  @Column({ name: 'generated_at', type: 'timestamptz' })
  generatedAt: Date;
}
