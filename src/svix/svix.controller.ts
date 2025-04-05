import {
  Controller,
  HttpException,
  HttpStatus,
  Post,
  Res,
  UseGuards,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { SvixService } from '@/src/svix/svix.service';
import { Public } from '@/src/comon/decorators/public.decorator';
import { ClerkEvent as ClerkEventType } from '@/types/clerkEvent';
import { Response, Request } from 'express';
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
    @Req() request: RawBodyRequest<Request>,
  ) {
    try {
      if (!request.rawBody) {
        console.error('Clerk webhook error: request.rawBody is missing');
        throw new HttpException('Invalid request body', HttpStatus.BAD_REQUEST);
      }

      await this.svixService.handleClerkEvent(event);

      return res.status(200).json({ message: 'Webhook data received' });
    } catch (error) {
      console.error(`Clerk webhook error: ${error.message}`, error);
      throw new HttpException(
        {
          statusCode: error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
          message: error.message ?? 'An error occurred handling webhook',
        },
        error.status ?? HttpStatus.BAD_REQUEST,
      );
    }
  }
}
