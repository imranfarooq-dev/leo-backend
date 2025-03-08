import { Module } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { SubscriptionController } from './subscription.controller';
import { DatabaseModule } from '@/src/database/database.module';
import { StripeProvider } from '@/src/comon/providers/stripe.provider';

@Module({
  imports: [DatabaseModule],
  providers: [SubscriptionService, StripeProvider],
  controllers: [SubscriptionController],
})
export class SubscriptionModule { }
