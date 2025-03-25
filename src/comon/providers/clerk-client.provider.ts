import { createClerkClient } from '@clerk/backend';
import { ConfigService } from '@nestjs/config';

export const ClerkClientProvider = {
  provide: 'ClerkClient',
  useFactory: (config: ConfigService) => {
    return createClerkClient({
      publishableKey: config.get<string>('CLERK_PUBLISHABLE_KEY'),
      secretKey: config.get<string>('CLERK_SECRET_KEY'),
    });
  },
  inject: [ConfigService],
};
