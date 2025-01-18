import { Provider } from '@nestjs/common';
import { Provides } from '@/src/shared/constant';
import { ConfigService } from '@nestjs/config';
import { Webhook } from 'svix';

export const SvixWebhookProvider: Provider = {
  provide: Provides.Svix,
  useFactory: (configService: ConfigService): Webhook => {
    const webhookSecret = configService.get<string>('WEBHOOK_SECRET');

    if (!webhookSecret) {
      throw new Error('Webhook secret is not defined');
    }

    return new Webhook(webhookSecret);
  },
  inject: [ConfigService],
};
