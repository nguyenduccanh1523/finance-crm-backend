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

  // chỉ dùng làm default hiển thị (hoặc bạn đổi thành defaultInterval sau)
  @Column({ type: 'text' })
  interval: BillingInterval; // MONTH | YEAR

  // (giữ lại để tương thích cũ) - có thể bỏ sau
  @Column({ name: 'price_cents', type: 'integer', default: 0 })
  priceCents: number;

  // ===== New: monthly / yearly price =====
  @Column({ name: 'monthly_price_cents', type: 'integer', default: 0 })
  monthlyPriceCents: number;

  @Column({ name: 'yearly_price_cents', type: 'integer', default: 0 })
  yearlyPriceCents: number;

  @Column({ type: 'char', length: 3 })
  currency: string;

  @Column({ type: 'jsonb', default: () => `'{}'::jsonb` })
  features: Record<string, any>;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  // ===== Stripe mapping =====
  @Column({ name: 'stripe_product_id', type: 'text', nullable: true })
  stripeProductId?: string;

  @Column({ name: 'stripe_monthly_price_id', type: 'text', nullable: true })
  stripeMonthlyPriceId?: string;

  @Column({ name: 'stripe_yearly_price_id', type: 'text', nullable: true })
  stripeYearlyPriceId?: string;
}
