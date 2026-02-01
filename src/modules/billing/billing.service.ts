import { Inject, Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { STRIPE_CLIENT } from './stripe/stripe.client';
import { Plan } from './entities/plan.entity';
import { PaymentCustomer } from './entities/payment-customer.entity';

import { SubscriptionScope } from '../../common/enums/subscription-scope.enum';
import { billingErrors } from './billing.errors';
import { AppException } from '../../common/exceptions/app.exception';
import { AppErrorCode } from '../../common/errors/app-error-codes';
import { HttpStatus } from '@nestjs/common';

@Injectable()
export class BillingService {
  constructor(
    @Inject(STRIPE_CLIENT) private readonly stripe: Stripe,
    @InjectRepository(Plan) private readonly planRepo: Repository<Plan>,
    @InjectRepository(PaymentCustomer)
    private readonly customerRepo: Repository<PaymentCustomer>,
  ) {}

  private async getOrCreateStripeCustomer(
    user: any,
    scope: SubscriptionScope,
    orgId?: string,
  ) {
    if (scope === SubscriptionScope.ORG && !orgId) {
      throw new AppException(
        AppErrorCode.VALIDATION_FAILED,
        HttpStatus.BAD_REQUEST,
        'orgId is required when scope=ORG',
      );
    }

    const provider = 'stripe';
    let row = await this.customerRepo.findOne({
      where: {
        provider,
        scope,
        userId: scope === SubscriptionScope.PERSONAL ? user.id : null,
        orgId: scope === SubscriptionScope.ORG ? orgId : null,
      } as any,
    });

    if (row) return row.externalCustomerId;

    // tạo customer trên Stripe
    const customer = await this.stripe.customers.create({
      email: user.email,
      name: user.name || user.email,
      metadata: {
        scope,
        userId: user.id,
        orgId: orgId || '',
      },
    });

    row = this.customerRepo.create({
      provider,
      scope,
      userId: scope === SubscriptionScope.PERSONAL ? user.id : undefined,
      orgId: scope === SubscriptionScope.ORG ? orgId : undefined,
      externalCustomerId: customer.id,
    });

    await this.customerRepo.save(row);
    return customer.id;
  }

  // 1) SetupIntent cho custom UI
  async createSetupIntent(user: any, scope: SubscriptionScope, orgId?: string) {
    const customerId = await this.getOrCreateStripeCustomer(user, scope, orgId);

    const setupIntent = await this.stripe.setupIntents.create({
      customer: customerId,
      usage: 'off_session',
      // nếu bạn muốn bắt Stripe tự support nhiều method sau này:
      // automatic_payment_methods: { enabled: true },
    });

    return { clientSecret: setupIntent.client_secret };
  }

  // 2) Create subscription từ paymentMethodId (pm_xxx)
  async createSubscription(
    user: any,
    dto: {
      planCode: string;
      interval: 'MONTH' | 'YEAR';
      scope: SubscriptionScope;
      orgId?: string;
      paymentMethodId: string;
    },
  ) {
    const plan = await this.planRepo.findOne({
      where: { code: dto.planCode, isActive: true },
    });
    if (!plan) throw billingErrors.planNotFound();

    const priceId =
      dto.interval === 'YEAR'
        ? plan.stripeYearlyPriceId
        : plan.stripeMonthlyPriceId;

    if (!priceId) throw billingErrors.stripePriceNotConfigured();

    const customerId = await this.getOrCreateStripeCustomer(
      user,
      dto.scope,
      dto.orgId,
    );

    // attach PM + set default
    await this.stripe.paymentMethods.attach(dto.paymentMethodId, {
      customer: customerId,
    });
    await this.stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: dto.paymentMethodId },
    });

    // tạo subscription
    const sub = await this.stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription',
      },
      metadata: {
        scope: dto.scope,
        userId: user.id,
        orgId: dto.orgId || '',
        planId: plan.id,
        planCode: plan.code,
        interval: dto.interval,
      },
      expand: ['latest_invoice.payment_intent'],
    } as any);

    // lấy client_secret nếu cần SCA (3DS)
    const latestInvoice: any = (sub as any).latest_invoice;
    const paymentIntent: any = latestInvoice?.payment_intent;

    return {
      stripeSubscriptionId: sub.id,
      status: sub.status,
      paymentClientSecret: paymentIntent?.client_secret || null,
    };
  }
}
