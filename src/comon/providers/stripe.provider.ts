import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Provides } from '@/src/shared/constant';
import Stripe from 'stripe';

export const StripeProvider: Provider = {
  provide: Provides.Stripe,
  useFactory: (configService: ConfigService): Stripe => {
    const stripePublishableKey = configService.get<string>(
      'stripe.stripePublishableKey',
    );
    const stripeSecretKey = configService.get<string>('stripe.stripeSecretKey');

    if (!stripePublishableKey || !stripeSecretKey) {
      throw new Error('Stripe secret is not defined');
    }

    return new Stripe(stripeSecretKey);
  },
  inject: [ConfigService],
};
