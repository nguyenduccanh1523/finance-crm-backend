import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../../../common/entities/base.entity';

@Entity({ name: 'invoice_payments' })
export class InvoicePayment extends BaseEntity {
  @Column({ name: 'invoice_id', type: 'uuid' })
  invoiceId: string;

  @Column({ name: 'amount_cents', type: 'bigint' })
  amountCents: number;

  @Column({ name: 'paid_at', type: 'timestamptz' })
  paidAt: Date;

  @Column() method: string;
  @Column({ nullable: true }) reference?: string;
}
