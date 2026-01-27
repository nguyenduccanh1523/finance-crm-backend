import { Column, Entity, Index } from 'typeorm';
import { SoftDeleteEntity } from '../../../../common/entities/soft-delete.entity';

@Entity({ name: 'invoices' })
@Index(['orgId', 'number'], { unique: true })
export class Invoice extends SoftDeleteEntity {
  @Column({ name: 'org_id', type: 'uuid' })
  orgId: string;

  @Column({ name: 'customer_id', type: 'uuid' })
  customerId: string;

  @Column() number: string;

  @Column({ name: 'issue_date', type: 'date' })
  issueDate: string;

  @Column({ name: 'due_date', type: 'date' })
  dueDate: string;

  @Column({ name: 'status_id', type: 'uuid' })
  statusId: string;

  @Column({ name: 'subtotal_cents', type: 'bigint' })
  subtotalCents: number;

  @Column({ name: 'tax_cents', type: 'bigint', default: 0 })
  taxCents: number;

  @Column({ name: 'total_cents', type: 'bigint' })
  totalCents: number;

  @Column({ type: 'char', length: 3 })
  currency: string;
}
