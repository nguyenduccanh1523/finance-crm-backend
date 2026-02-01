import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Subscription } from './entities/subscription.entity';
import { SubscriptionScope } from '../../common/enums/subscription-scope.enum';
import { SubscriptionStatus } from '../../common/enums/subscription-status.enum';

@Injectable()
export class SubscriptionService {
  constructor(
    @InjectRepository(Subscription)
    private readonly subRepo: Repository<Subscription>,
  ) {}

  async getActiveSubscription(
    userId: string,
    scope: SubscriptionScope,
    orgId?: string,
  ) {
    const where: any = {
      scope,
      status: In([SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING]),
    };
    if (scope === SubscriptionScope.PERSONAL) where.userId = userId;
    if (scope === SubscriptionScope.ORG) where.orgId = orgId;

    return this.subRepo.findOne({
      where,
      relations: { plan: true },
    });
  }
}
