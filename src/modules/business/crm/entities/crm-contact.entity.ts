import { Column, Entity, Index, ManyToOne } from 'typeorm';
import { SoftDeleteEntity } from '../../../../common/entities/soft-delete.entity';
import { CrmCustomer } from './crm-customer.entity';


@Entity({ name: 'crm_contacts' })
@Index(['customerId'])
export class CrmContact extends SoftDeleteEntity {
  @Column({ name: 'org_id', type: 'uuid' })
  orgId: string;

  @Column({ name: 'customer_id', type: 'uuid' })
  customerId: string;

  @ManyToOne(() => CrmCustomer, { onDelete: 'CASCADE' })
  customer: CrmCustomer;

  @Column() fullName: string;
  @Column({ nullable: true }) title?: string;
  @Column({ nullable: true }) phone?: string;
  @Column({ nullable: true }) email?: string;
  @Column({ nullable: true }) notes?: string;
}
