import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { BillingInterval } from '../../../common/enums/billing-interval.enum';

@Entity({ name: 'plans' })
export class Plan extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'text', unique: true })
  code: string; // starter, pro, enterprise

  @Column({ type: 'text' })
  name: string;

  @Column({ type: 'text' })
  interval: BillingInterval; // MONTH | YEAR

  @Column({ name: 'price_cents', type: 'integer' })
  priceCents: number;

  @Column({ type: 'char', length: 3 })
  currency: string;

  @Column({ type: 'jsonb', default: () => `'{}'::jsonb` })
  features: Record<string, any>;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;
}
