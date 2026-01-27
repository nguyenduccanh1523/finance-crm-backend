import { Column, Entity, Index } from 'typeorm';
import { SoftDeleteEntity } from '../../../../common/entities/soft-delete.entity';

@Entity({ name: 'projects' })
@Index(['orgId', 'statusId'])
export class Project extends SoftDeleteEntity {
  @Column({ name: 'org_id', type: 'uuid' })
  orgId: string;

  @Column() name: string;
  @Column({ nullable: true }) description?: string;

  @Column({ name: 'status_id', type: 'uuid' })
  statusId: string;

  @Column({ name: 'owner_membership_id', type: 'uuid' })
  ownerMembershipId: string;

  @Column({ name: 'budget_cents', type: 'bigint', nullable: true })
  budgetCents?: number;

  @Column({ type: 'char', length: 3 })
  currency: string;
}
