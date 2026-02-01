import { Inject, Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { STRIPE_CLIENT } from './stripe.client';
import { PaymentProviderEvent } from '../entities/payment-provider-event.entity';
import { Subscription as SubscriptionEntity } from '../entities/subscription.entity';
import { PaymentTransaction } from '../entities/payment-transaction.entity';
import { SubscriptionStatus } from '../../../common/enums/subscription-status.enum';
import { billingErrors } from '../billing.errors';
import { AppException } from '../../../common/exceptions/app.exception';
import { HttpStatus } from '@nestjs/common';
import { AppErrorCode } from '../../../common/errors/app-error-codes';

// ===== fallback types (để TS không báo sai dù stripe types bị lệch) =====
type StripeInvoiceLike = Stripe.Invoice & {
  subscription?: string | { id: string } | null;
  payment_intent?: string | { id: string } | null;
  amount_paid?: number | null;
  amount_due?: number | null;
  currency?: string | null;
};

type StripeSubscriptionLike = Stripe.Subscription & {
  current_period_start?: number | null;
  current_period_end?: number | null;
  cancel_at_period_end?: boolean | null;
  canceled_at?: number | null;
};

@Injectable()
export class StripeWebhookService {
  constructor(
    @Inject(STRIPE_CLIENT) private readonly stripe: Stripe,

    @InjectRepository(PaymentProviderEvent)
    private readonly eventRepo: Repository<PaymentProviderEvent>,

    @InjectRepository(SubscriptionEntity)
    private readonly subRepo: Repository<SubscriptionEntity>,

    @InjectRepository(PaymentTransaction)
    private readonly txRepo: Repository<PaymentTransaction>,
  ) {}

  async handleWebhook(rawBody: Buffer, signature?: string) {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) {
      throw new AppException(
        AppErrorCode.INTERNAL_ERROR,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    if (!signature) {
      throw billingErrors.invalidWebhookSignature();
    }

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, secret);
    } catch (e) {
      throw billingErrors.invalidWebhookSignature();
    }

    const provider = 'stripe';
    const existed = await this.eventRepo.findOne({
      where: { provider, eventId: event.id },
    });
    if (existed) return { received: true, duplicated: true };

    const saved = await this.eventRepo.save(
      this.eventRepo.create({
        provider,
        eventId: event.id,
        eventType: event.type,
        payload: event as any,
      }),
    );

    await this.processEvent(event);

    await this.eventRepo.update({ id: saved.id }, { processedAt: new Date() });
    return { received: true };
  }

  private async processEvent(event: Stripe.Event) {
    switch (event.type) {
      case 'checkout.session.completed':
        return this.onCheckoutSessionCompleted(
          event.data.object as Stripe.Checkout.Session,
        );

      case 'invoice.paid':
        return this.onInvoicePaid(
          event.data.object as unknown as StripeInvoiceLike,
        );

      case 'invoice.payment_failed':
        return this.onInvoiceFailed(
          event.data.object as unknown as StripeInvoiceLike,
        );

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        return this.onSubscriptionChanged(
          event.data.object as unknown as StripeSubscriptionLike,
        );

      default:
        return;
    }
  }

  private stripeSubStatusToLocal(
    status: Stripe.Subscription.Status,
  ): SubscriptionStatus {
    switch (status) {
      case 'trialing':
        return SubscriptionStatus.TRIALING;
      case 'active':
        return SubscriptionStatus.ACTIVE;
      case 'past_due':
      case 'unpaid':
        return SubscriptionStatus.PAST_DUE;
      case 'canceled':
        return SubscriptionStatus.CANCELED;
      case 'incomplete_expired':
      case 'incomplete':
      case 'paused':
      default:
        return SubscriptionStatus.EXPIRED;
    }
  }

  private async onCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
    const externalSubId =
      typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id;

    if (!externalSubId) return;

    const planId = session.metadata?.planId;
    const scope = session.metadata?.scope;
    const userId = session.metadata?.userId;
    const orgId = session.metadata?.orgId || undefined;

    let sub = await this.subRepo.findOne({
      where: { externalSubscriptionId: externalSubId },
    });

    if (!sub) {
      sub = this.subRepo.create({
        scope: scope as any,
        userId: userId || undefined,
        orgId,
        planId: planId!,
        provider: 'stripe',
        externalSubscriptionId: externalSubId,
        status: SubscriptionStatus.ACTIVE,
        cancelAtPeriodEnd: false,
      });
      await this.subRepo.save(sub);
    } else {
      await this.subRepo.update(
        { id: sub.id },
        { status: SubscriptionStatus.ACTIVE },
      );
    }
  }

  private async onInvoicePaid(invoice: StripeInvoiceLike) {
    const externalSubId =
      typeof invoice.subscription === 'string'
        ? invoice.subscription
        : invoice.subscription?.id;

    if (!externalSubId) return;

    const sub = await this.subRepo.findOne({
      where: { externalSubscriptionId: externalSubId },
    });
    if (!sub) return;

    const paymentIntentId =
      typeof invoice.payment_intent === 'string'
        ? invoice.payment_intent
        : invoice.payment_intent?.id;

    await this.txRepo.save(
      this.txRepo.create({
        subscriptionId: sub.id,
        provider: 'stripe',
        amountCents: invoice.amount_paid ?? 0,
        currency: (invoice.currency || 'usd').toUpperCase(),
        status: 'SUCCEEDED',
        externalInvoiceId: invoice.id,
        externalPaymentId: paymentIntentId,
        paidAt: new Date(),
        rawPayload: invoice as any,
      }),
    );

    await this.subRepo.update(
      { id: sub.id },
      { status: SubscriptionStatus.ACTIVE },
    );
  }

  private async onInvoiceFailed(invoice: StripeInvoiceLike) {
    const externalSubId =
      typeof invoice.subscription === 'string'
        ? invoice.subscription
        : invoice.subscription?.id;

    if (!externalSubId) return;

    const sub = await this.subRepo.findOne({
      where: { externalSubscriptionId: externalSubId },
    });
    if (!sub) return;

    const paymentIntentId =
      typeof invoice.payment_intent === 'string'
        ? invoice.payment_intent
        : invoice.payment_intent?.id;

    await this.txRepo.save(
      this.txRepo.create({
        subscriptionId: sub.id,
        provider: 'stripe',
        amountCents: invoice.amount_due ?? 0,
        currency: (invoice.currency || 'usd').toUpperCase(),
        status: 'FAILED',
        externalInvoiceId: invoice.id,
        externalPaymentId: paymentIntentId,
        failureReason: 'Payment failed',
        rawPayload: invoice as any,
      }),
    );

    await this.subRepo.update(
      { id: sub.id },
      { status: SubscriptionStatus.PAST_DUE },
    );
  }

  private async onSubscriptionChanged(s: StripeSubscriptionLike) {
    let sub = await this.subRepo.findOne({
      where: { externalSubscriptionId: s.id },
    });

    // nếu chưa có → create từ metadata
    if (!sub) {
      const md: any = (s as any).metadata || {};
      sub = this.subRepo.create({
        scope: md.scope,
        userId: md.userId || undefined,
        orgId: md.orgId || undefined,
        planId: md.planId,
        provider: 'stripe',
        externalSubscriptionId: s.id,
        status: this.stripeSubStatusToLocal(s.status),
        cancelAtPeriodEnd: !!(s as any).cancel_at_period_end,
        periodStart: (s as any).current_period_start
          ? new Date((s as any).current_period_start * 1000)
          : undefined,
        periodEnd: (s as any).current_period_end
          ? new Date((s as any).current_period_end * 1000)
          : undefined,
        canceledAt: (s as any).canceled_at
          ? new Date((s as any).canceled_at * 1000)
          : undefined,
      });
      await this.subRepo.save(sub);
      return;
    }

    // nếu có rồi → update như bạn đang làm
    await this.subRepo.update(
      { id: sub.id },
      {
        status: this.stripeSubStatusToLocal(s.status),
        periodStart: (s as any).current_period_start
          ? new Date((s as any).current_period_start * 1000)
          : undefined,
        periodEnd: (s as any).current_period_end
          ? new Date((s as any).current_period_end * 1000)
          : undefined,
        cancelAtPeriodEnd: !!(s as any).cancel_at_period_end,
        canceledAt: (s as any).canceled_at
          ? new Date((s as any).canceled_at * 1000)
          : undefined,
      },
    );
  }
}
