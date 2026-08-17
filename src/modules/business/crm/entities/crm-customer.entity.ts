import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { SoftDeleteEntity } from '../../../../common/entities/soft-delete.entity';
import { Organization } from '../../../core/organizations/organization.entity';
import { Membership } from '../../../core/rbac/membership.entity';
import { CustomerType } from '../../../../common/enums/business.enums';



@Entity({ name: 'crm_customers' })
@Index(['orgId', 'stage'])
export class CrmCustomer extends SoftDeleteEntity {
  @Column({ name: 'org_id', type: 'uuid' })
  orgId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'org_id' })
  organization!: Organization;

  @Column() name: string;

  @Column({ type: 'text' })
  type: CustomerType;

  @Column({ type: 'varchar', nullable: true }) industry?: string | null;
  @Column({ type: 'varchar', nullable: true }) website?: string | null;
  @Column({ type: 'varchar', nullable: true }) phone?: string | null;
  @Column({ type: 'varchar', nullable: true }) email?: string | null;
  @Column({ type: 'varchar', nullable: true }) address?: string | null;

  @Column() stage: string;

  @Column({ name: 'estimated_value_cents', type: 'bigint', default: '0' })
  estimatedValueCents: string;

  @Column({ name: 'owner_membership_id', type: 'uuid' })
  ownerMembershipId: string;

  @ManyToOne(() => Membership)
  @JoinColumn({ name: 'owner_membership_id' })
  owner: Membership;
}
