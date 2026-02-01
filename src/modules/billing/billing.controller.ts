import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../core/auth/decorators/current-user.decorator';
import { BillingService } from './billing.service';
import { CreateSetupIntentDto } from './dto/create-setup-intent.dto';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';

@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  // Custom UI step 1
  @UseGuards(JwtAuthGuard)
  @Post('stripe/setup-intent')
  createSetupIntent(
    @CurrentUser() user: any,
    @Body() dto: CreateSetupIntentDto,
  ) {
    return this.billingService.createSetupIntent(user, dto.scope, dto.orgId);
  }

  // Custom UI step 2
  @UseGuards(JwtAuthGuard)
  @Post('subscriptions')
  createSubscription(
    @CurrentUser() user: any,
    @Body() dto: CreateSubscriptionDto,
  ) {
    return this.billingService.createSubscription(user, dto);
  }

  // (giữ lại nếu bạn muốn fallback checkout)
  // @Post('checkout-session') ...
}
