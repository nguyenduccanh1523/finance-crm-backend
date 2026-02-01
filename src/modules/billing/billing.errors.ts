import { HttpStatus } from '@nestjs/common';
import { AppException } from '../../common/exceptions/app.exception';
import { AppErrorCode } from '../../common/errors/app-error-codes';

export const billingErrors = {
  planNotFound: () =>
    new AppException(AppErrorCode.BILLING_PLAN_NOT_FOUND, HttpStatus.NOT_FOUND),

  stripePriceNotConfigured: () =>
    new AppException(
      AppErrorCode.BILLING_STRIPE_PRICE_NOT_CONFIGURED,
      HttpStatus.BAD_REQUEST,
    ),

  subscriptionRequired: () =>
    new AppException(
      AppErrorCode.BILLING_SUBSCRIPTION_REQUIRED,
      HttpStatus.PAYMENT_REQUIRED,
    ),

  featureNotAllowed: () =>
    new AppException(
      AppErrorCode.BILLING_FEATURE_NOT_ALLOWED,
      HttpStatus.PAYMENT_REQUIRED,
    ),

  invalidWebhookSignature: () =>
    new AppException(
      AppErrorCode.BILLING_INVALID_WEBHOOK_SIGNATURE,
      HttpStatus.BAD_REQUEST,
    ),
};
