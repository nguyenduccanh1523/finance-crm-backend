import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { SubscriptionScope } from '../../../common/enums/subscription-scope.enum';

export class CreateSubscriptionDto {
  @IsString()
  planCode: string; // starter/pro/enterprise

  @IsEnum(['MONTH', 'YEAR'] as any)
  interval: 'MONTH' | 'YEAR';

  @IsEnum(SubscriptionScope)
  scope: SubscriptionScope;

  @IsOptional()
  @IsUUID()
  orgId?: string;

  @IsString()
  paymentMethodId: string; // pm_xxx (từ Stripe.js)
}
