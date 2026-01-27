import { Column, Entity, Index, ManyToOne } from 'typeorm';
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
  organization: Organization;

  @Column() name: string;

  @Column({ type: 'text' })
  type: CustomerType;

  @Column({ nullable: true }) industry?: string;
  @Column({ nullable: true }) website?: string;
  @Column({ nullable: true }) phone?: string;
  @Column({ nullable: true }) email?: string;
  @Column({ nullable: true }) address?: string;

  @Column() stage: string;

  @Column({ name: 'owner_membership_id', type: 'uuid' })
  ownerMembershipId: string;

  @ManyToOne(() => Membership)
  owner: Membership;
}
