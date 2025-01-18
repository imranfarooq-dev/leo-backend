import { registerAs } from '@nestjs/config';
import * as process from 'node:process';

export default registerAs('stripe', () => ({
  stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
}));
