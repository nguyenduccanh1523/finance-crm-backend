import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Plan } from './entities/plan.entity';
import { Subscription } from './entities/subscription.entity';
import { PaymentTransaction } from './entities/payment-transaction.entity';
import { PaymentProviderEvent } from './entities/payment-provider-event.entity';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { stripeClientProvider } from './stripe/stripe.client';
import { StripeWebhookController } from './stripe/stripe-webhook.controller';
import { StripeWebhookService } from './stripe/stripe-webhook.service';
import { SubscriptionService } from './subscription.service';
import { FeatureGuard } from './guards/feature.guard';
import { PlanAdminController } from './plan.admin.controller';
import { PlanService } from './plan.service';
import { PaymentCustomer } from './entities/payment-customer.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Plan,
      Subscription,
      PaymentTransaction,
      PaymentProviderEvent,
      PaymentCustomer,
    ]),
  ],
  controllers: [
    BillingController,
    StripeWebhookController,
    PlanAdminController,
  ],
  providers: [
    BillingService,
    StripeWebhookService,
    SubscriptionService,
    FeatureGuard,
    stripeClientProvider,
    PlanService,
  ],
  exports: [SubscriptionService, PlanService],
})
export class BillingModule {}
