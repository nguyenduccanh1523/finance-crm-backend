import Stripe from 'stripe';

export const STRIPE_CLIENT = 'STRIPE_CLIENT';

export const stripeClientProvider = {
  provide: STRIPE_CLIENT,
  useFactory: () => {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('Missing STRIPE_SECRET_KEY');
    return new Stripe(key, {
      apiVersion: '2026-01-28.clover', // bạn có thể đổi theo dashboard
      typescript: true,
    });
  },
};
