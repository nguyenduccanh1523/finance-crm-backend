import { Controller, Headers, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { StripeWebhookService } from './stripe-webhook.service';

@Controller('billing/stripe')
export class StripeWebhookController {
  constructor(private readonly webhookService: StripeWebhookService) {}

  @Post('webhook')
  async handle(@Req() req: Request, @Headers('stripe-signature') sig?: string) {
    // req.body là Buffer do express.raw
    return this.webhookService.handleWebhook(req.body as any, sig);
  }
}
