import {
  Column,
  Entity,
  Index,
  ManyToOne,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { SubscriptionScope } from '../../../common/enums/subscription-scope.enum';
import { SubscriptionStatus } from '../../../common/enums/subscription-status.enum';
import { Plan } from './plan.entity';
import { User } from '../../core/users/user.entity';
import { Organization } from '../../core/organizations/organization.entity';

@Entity({ name: 'subscriptions' })
export class Subscription extends BaseEntity {
  @Column({ type: 'text' })
  scope: SubscriptionScope; // PERSONAL | ORG

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId?: string;

  @Column({ name: 'org_id', type: 'uuid', nullable: true })
  orgId?: string;

  @ManyToOne(() => User, { nullable: true })
  user?: User;

  @ManyToOne(() => Organization, { nullable: true })
  organization?: Organization;

  @Column({ name: 'plan_id', type: 'uuid' })
  planId: string;

  @ManyToOne(() => Plan)
  plan: Plan;

  @Index()
  @Column({ type: 'text' })
  status: SubscriptionStatus;

  @Column({ type: 'text' })
  provider: string; // stripe, paypal

  @Column({ name: 'external_subscription_id', type: 'text', nullable: true })
  externalSubscriptionId?: string;

  @Column({ name: 'period_start', type: 'timestamptz', nullable: true })
  periodStart?: Date;

  @Column({ name: 'period_end', type: 'timestamptz', nullable: true })
  periodEnd?: Date;

  @Column({ name: 'cancel_at_period_end', type: 'boolean', default: false })
  cancelAtPeriodEnd: boolean;

  @Column({ name: 'canceled_at', type: 'timestamptz', nullable: true })
  canceledAt?: Date;
}
