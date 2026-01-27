import {
  Column,
  Entity,
  Index,
  ManyToOne,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Subscription } from './subscription.entity';

@Entity({ name: 'payment_transactions' })
export class PaymentTransaction extends BaseEntity {
  @Column({ name: 'subscription_id', type: 'uuid' })
  subscriptionId: string;

  @ManyToOne(() => Subscription, { onDelete: 'CASCADE' })
  subscription: Subscription;

  @Column({ type: 'text' })
  provider: string;

  @Column({ name: 'amount_cents', type: 'integer' })
  amountCents: number;

  @Column({ type: 'char', length: 3 })
  currency: string;

  @Index()
  @Column({ type: 'text' })
  status: string; // SUCCEEDED / FAILED / PENDING

  @Index()
  @Column({ name: 'external_payment_id', type: 'text', nullable: true })
  externalPaymentId?: string;

  @Column({ name: 'external_invoice_id', type: 'text', nullable: true })
  externalInvoiceId?: string;

  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt?: Date;

  @Column({ name: 'failure_reason', type: 'text', nullable: true })
  failureReason?: string;

  @Column({ name: 'raw_payload', type: 'jsonb', default: () => `'{}'::jsonb` })
  rawPayload: Record<string, any>;
}
