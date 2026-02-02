import {
  CanActivate,
  ExecutionContext,
  Injectable,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_FEATURES_KEY } from './require-features.decorator';
import { SubscriptionService } from '../subscription.service';
import { SubscriptionScope } from '../../../common/enums/subscription-scope.enum';
import { billingErrors } from '../billing.errors';
import { AppException } from '../../../common/exceptions/app.exception';
import { AppErrorCode } from '../../../common/errors/app-error-codes';
import { FREE_FEATURES } from '../features/free-features';

@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly subService: SubscriptionService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const required = this.reflector.getAllAndOverride<string[]>(
      REQUIRE_FEATURES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) return true;

    const req = context.switchToHttp().getRequest();
    const user = req.user;

    // bypass roles
    if (user?.role === 'ADMIN' || user?.role === 'TEST') return true;

    const orgId =
      req.headers['x-org-id'] || req.query?.orgId || req.body?.orgId;
    const scope = orgId ? SubscriptionScope.ORG : SubscriptionScope.PERSONAL;

    const sub = await this.subService.getActiveSubscription(
      user.id,
      scope,
      orgId,
    );

    // ✅ New rule:
    // - ORG scope: no sub -> subscriptionRequired (same as before)
    // - PERSONAL scope: no sub -> use FREE_FEATURES (do not block everything)
    if (!sub) {
      if (scope === SubscriptionScope.ORG) {
        throw billingErrors.subscriptionRequired();
      }

      const flags = FREE_FEATURES.flags ?? {};
      for (const f of required) {
        if (!flags[f]) {
          throw new AppException(
            AppErrorCode.BILLING_FEATURE_NOT_ALLOWED,
            HttpStatus.PAYMENT_REQUIRED,
            `Free không hỗ trợ tính năng: ${f}`,
          );
        }
      }
      return true;
    }

    const flags = sub.plan?.features?.flags ?? {};
    for (const f of required) {
      if (!flags[f]) {
        throw new AppException(
          AppErrorCode.BILLING_FEATURE_NOT_ALLOWED,
          HttpStatus.PAYMENT_REQUIRED,
          `Gói hiện tại không hỗ trợ tính năng: ${f}`,
        );
      }
    }
    return true;
  }
}
