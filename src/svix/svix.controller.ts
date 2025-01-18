import {
  Controller,
  HttpException,
  HttpStatus,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { SvixService } from '@/src/svix/svix.service';
import { Public } from '@/src/comon/decorators/public.decorator';
import { ClerkEvent as ClerkEventType } from '@/types/clerkEvent';
import { Response } from 'express';
import { WebhookGuard } from '@/src/comon/guards/svix.auth.guard';
import { WebhookEvent } from '@/src/comon/decorators/webhook-event.decorator';

@Controller('clerk')
@UseGuards(WebhookGuard)
export class SvixController {
  constructor(private svixService: SvixService) {}

  @Post('webhooks')
  @Public()
  async handleClerkWebhook(
    @WebhookEvent() event: ClerkEventType,
    @Res() res: Response,
  ) {
    try {
      await this.svixService.handleClerkEvent(event);

      return res.status(200).json({ message: 'Webhook data received' });
    } catch (error) {
      throw new HttpException(
        'Invalid webhook signature',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
