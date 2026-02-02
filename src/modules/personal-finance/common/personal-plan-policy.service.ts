import { Injectable } from '@nestjs/common';
import { SubscriptionService } from '../../billing/subscription.service';
import { SubscriptionScope } from '../../../common/enums/subscription-scope.enum';
import { FREE_FEATURES } from '../../billing/features/free-features';
import { personalErrors } from './personal.errors';
import { PersonalQuotaKey } from './personal.constants';

/**
 * Central place to get flags/quotas for PERSONAL scope.
 * - If user has active PERSONAL subscription -> use plan.features
 * - If not -> fallback to FREE_FEATURES (limits only, not blocking everything)
 */
@Injectable()
export class PersonalPlanPolicyService {
  constructor(private readonly subService: SubscriptionService) {}

  async getPersonalFeatures(user: { id: string; role?: string }) {
    // SUPER_ADMIN: unlimited
    if (user?.role === 'SUPER_ADMIN') {
      return {
        flags: {
          ...FREE_FEATURES.flags,
          'finance.report': true,
          'report.export': true,
          'finance.ai_advice': true,
        },
        quotas: {
          // null / big values indicate unlimited, choose big numbers
          'personal.accounts.max': 999999,
          'personal.categories.max': 999999,
          'personal.tags.max': 999999,
          'personal.transactions.monthly': 999999999,
          'personal.recurring_rules.max': 999999,
          'personal.attachments.max': 999999,
        },
        planCode: 'super_admin',
      };
    }

    const sub = await this.subService.getActiveSubscription(
      user.id,
      SubscriptionScope.PERSONAL,
      undefined,
    );

    const features = sub?.plan?.features;
    const flags = (features?.flags ?? {}) as Record<string, boolean>;
    const quotas = (features?.quotas ?? {}) as Record<string, number>;

    if (!sub) {
      return {
        flags: FREE_FEATURES.flags,
        quotas: FREE_FEATURES.quotas,
        planCode: 'free',
      };
    }

    return { flags, quotas, planCode: sub.plan?.code ?? 'unknown' };
  }

  async assertQuota(
    user: { id: string; role?: string },
    key: PersonalQuotaKey,
    used: number,
  ) {
    const { quotas } = await this.getPersonalFeatures(user);
    const limit = quotas?.[key];
    if (limit === undefined || limit === null) return; // treat as unlimited
    if (used >= limit) throw personalErrors.quotaExceeded(key);
  }
}
