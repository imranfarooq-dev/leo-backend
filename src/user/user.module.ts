import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { DatabaseModule } from '@/src/database/database.module';
import { StripeProvider } from '@/src/comon/providers/stripe.provider';
import { UserController } from '@/src/user/user.controller';

@Module({
  imports: [DatabaseModule],
  providers: [UserService, StripeProvider],
  controllers: [UserController],
  exports: [UserService],
})
export class UserModule {}
