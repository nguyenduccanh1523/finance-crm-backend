import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plan } from './entities/plan.entity';

type PlanCode = 'starter' | 'pro' | 'enterprise';
const PLAN_ORDER: PlanCode[] = ['starter', 'pro', 'enterprise'];

@Injectable()
export class PlanService {
  constructor(
    @InjectRepository(Plan) private readonly planRepo: Repository<Plan>,
  ) {}

  async seedDefaultPlans() {
    const defaults: Partial<Plan>[] = [
      {
        code: 'starter',
        name: 'Starter',
        interval: 'MONTH' as any,
        currency: 'USD',
        isActive: true,
        monthlyPriceCents: 1900,
        yearlyPriceCents: 19000,
        priceCents: 1900,
        features: {
          flags: {
            'crm.basic': true,
            'crm.pipeline': true,
            'report.export': false,
            'ai.insights': false,
            'work.projects': true,
            'work.tasks': true,
          },
          quotas: {
            'ai_credits.monthly': 50,
            'members.max': 3,
            'projects.max': 5,
          },
        },
      },
      {
        code: 'pro',
        name: 'Pro',
        interval: 'MONTH' as any,
        currency: 'USD',
        isActive: true,
        monthlyPriceCents: 4900,
        yearlyPriceCents: 49000,
        priceCents: 4900,
        features: {
          flags: {
            'crm.basic': true,
            'crm.pipeline': true,
            'report.export': true,
            'ai.insights': true,
            'work.projects': true,
            'work.tasks': true,
          },
          quotas: {
            'ai_credits.monthly': 500,
            'members.max': 10,
            'projects.max': 50,
          },
        },
      },
      {
        code: 'enterprise',
        name: 'Enterprise',
        interval: 'MONTH' as any,
        currency: 'USD',
        isActive: true,
        monthlyPriceCents: 9900,
        yearlyPriceCents: 99000,
        priceCents: 9900,
        features: {
          flags: {
            'crm.basic': true,
            'crm.pipeline': true,
            'report.export': true,
            'ai.insights': true,
            'work.projects': true,
            'work.tasks': true,
          },
          quotas: {
            'ai_credits.monthly': 5000,
            'members.max': 999999,
            'projects.max': 999999,
          },
        },
      },
    ];

    for (const p of defaults) {
      const exists = await this.planRepo.findOne({ where: { code: p.code! } });
      if (!exists) {
        await this.planRepo.save(this.planRepo.create(p));
      }
    }
    return { ok: true };
  }

  /**
   * Patch 1 flag và auto lan truyền theo tier khi enabled=true:
   * - starter true => starter/pro/enterprise true
   * - pro true => pro/enterprise true, starter false
   * - enterprise true => only enterprise true, starter/pro false
   */
  async patchFlagWithTier(code: string, flag: string, enabled: boolean) {
    const targetCode = code as PlanCode;
    if (!PLAN_ORDER.includes(targetCode)) return null;

    // load all 3 plans
    const plans = await this.planRepo.find({
      where: PLAN_ORDER.map((c) => ({ code: c })),
    });

    const byCode = new Map<string, Plan>();
    for (const p of plans) byCode.set(p.code, p);

    // đảm bảo đủ 3 gói (nếu thiếu thì return null để bạn biết)
    for (const c of PLAN_ORDER) {
      if (!byCode.get(c)) return null;
    }

    // helper set flag on plan
    const setFlag = (plan: Plan, value: boolean) => {
      const features = plan.features || {};
      const flags = (features.flags || {}) as Record<string, any>;
      flags[flag] = value;
      plan.features = { ...features, flags };
    };

    const idx = PLAN_ORDER.indexOf(targetCode);

    if (enabled === true) {
      // rule bạn muốn:
      // - các gói trước idx => false
      // - idx trở đi => true
      for (let i = 0; i < PLAN_ORDER.length; i++) {
        const p = byCode.get(PLAN_ORDER[i])!;
        setFlag(p, i >= idx);
      }
    } else {
      // enabled=false: chỉ set đúng gói đó false (không auto lan)
      const p = byCode.get(targetCode)!;
      setFlag(p, false);
    }

    // save all (transaction nếu bạn muốn chắc chắn)
    await this.planRepo.save([...byCode.values()]);

    return { ok: true };
  }

  // Giữ lại nếu bạn cần replace full features
  async updateFeaturesByCode(code: string, features: Record<string, any>) {
    const plan = await this.planRepo.findOne({ where: { code } });
    if (!plan) return null;
    plan.features = features;
    return this.planRepo.save(plan);
  }
}
