import { Module } from '@nestjs/common';
import { SvixController } from '@/src/svix/svix.controller';
import { SvixService } from '@/src/svix/svix.service';
import { SvixWebhookProvider } from '@/src/comon/providers/svix.provider';
import { UserModule } from '@/src/user/user.module';

@Module({
  imports: [UserModule],
  controllers: [SvixController],
  providers: [SvixService, SvixWebhookProvider],
})
export class SvixModule {}
