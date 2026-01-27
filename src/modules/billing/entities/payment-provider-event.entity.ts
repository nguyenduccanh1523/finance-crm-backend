import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity({ name: 'payment_provider_events' })
@Index(['provider', 'eventId'], { unique: true })
export class PaymentProviderEvent extends BaseEntity {
  @Column({ type: 'text' })
  provider: string; // stripe

  @Column({ name: 'event_id', type: 'text' })
  eventId: string;

  @Column({ name: 'event_type', type: 'text' })
  eventType: string;

  @Column({ name: 'received_at', type: 'timestamptz', default: () => 'now()' })
  receivedAt: Date;

  @Column({ name: 'processed_at', type: 'timestamptz', nullable: true })
  processedAt?: Date;

  @Column({ type: 'jsonb' })
  payload: Record<string, any>;
}
