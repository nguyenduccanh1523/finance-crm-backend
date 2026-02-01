import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { SubscriptionScope } from '../../../common/enums/subscription-scope.enum';

@Entity({ name: 'payment_customers' })
@Index(['provider', 'scope', 'userId', 'orgId'], { unique: true })
export class PaymentCustomer extends BaseEntity {
  @Column({ type: 'text' })
  provider: string; // 'stripe'

  @Column({ type: 'text' })
  scope: SubscriptionScope; // PERSONAL | ORG

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId?: string;

  @Column({ name: 'org_id', type: 'uuid', nullable: true })
  orgId?: string;

  @Column({ name: 'external_customer_id', type: 'text' })
  externalCustomerId: string; // cus_xxx
}
