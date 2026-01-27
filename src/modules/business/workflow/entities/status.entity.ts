import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../../common/entities/base.entity';


@Entity({ name: 'statuses' })
@Index(['orgId', 'entityType', 'name'], { unique: true })
export class Status extends BaseEntity {
  @Column({ name: 'org_id', type: 'uuid' })
  orgId: string;

  @Column({ name: 'entity_type', type: 'text' })
  entityType: string; // PROJECT / TASK / INVOICE

  @Column() name: string;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @Column({ name: 'is_done', default: false })
  isDone: boolean;
}
