import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../../../common/entities/base.entity';

@Entity({ name: 'invoice_items' })
export class InvoiceItem extends BaseEntity {
  @Column({ name: 'invoice_id', type: 'uuid' })
  invoiceId: string;

  @Column() name: string;
  @Column() qty: number;

  @Column({ name: 'unit_price_cents', type: 'bigint' })
  unitPriceCents: number;

  @Column({ name: 'amount_cents', type: 'bigint' })
  amountCents: number;

  @Column({ name: 'task_id', type: 'uuid', nullable: true })
  taskId?: string;
}
