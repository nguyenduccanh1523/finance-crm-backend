import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../../common/entities/base.entity';

@Entity({ name: 'work_types' })
@Index(['orgId', 'name'], { unique: true })
export class WorkType extends BaseEntity {
  @Column({ name: 'org_id', type: 'uuid' })
  orgId: string;

  @Column() name: string;

  @Column({ default: true })
  billable: boolean;

  @Column({ nullable: true })
  color?: string;
}
