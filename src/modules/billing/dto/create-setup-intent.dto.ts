import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { SubscriptionScope } from '../../../common/enums/subscription-scope.enum';

export class CreateSetupIntentDto {
  @IsEnum(SubscriptionScope)
  scope: SubscriptionScope;

  @IsOptional()
  @IsUUID()
  orgId?: string;
}
