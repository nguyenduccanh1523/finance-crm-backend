import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { BillingInterval } from '../../../common/enums/billing-interval.enum';
import { SubscriptionScope } from '../../../common/enums/subscription-scope.enum';

export class CreateCheckoutSessionDto {
  @IsString()
  planCode: string; // starter/pro/enterprise

  @IsEnum(BillingInterval)
  interval: BillingInterval; // MONTH/YEAR

  @IsEnum(SubscriptionScope)
  scope: SubscriptionScope; // PERSONAL/ORG

  @IsOptional()
  @IsUUID()
  orgId?: string; // bắt buộc nếu scope=ORG
}
