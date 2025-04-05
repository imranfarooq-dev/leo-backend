import {
  CanActivate,
  ExecutionContext,
  Injectable,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Webhook } from 'svix';
import { Inject } from '@nestjs/common';
import { Provides } from '@/src/shared/constant';
import { ClerkEvent } from '@/types/clerkEvent';

@Injectable()
export class WebhookGuard implements CanActivate {
  private readonly logger = new Logger(WebhookGuard.name);

  constructor(@Inject(Provides.Svix) private readonly webhook: Webhook) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const headers = {
      'svix-id': request.headers['svix-id'] as string,
      'svix-timestamp': request.headers['svix-timestamp'] as string,
      'svix-signature': request.headers['svix-signature'] as string,
    };

    // Check if required headers are present
    if (
      !headers['svix-id'] ||
      !headers['svix-timestamp'] ||
      !headers['svix-signature']
    ) {
      this.logger.error('Missing required Svix headers');
      throw new HttpException(
        'Missing required Svix headers',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Check if rawBody is available
    if (!request.rawBody) {
      this.logger.error('Missing raw body for Svix webhook');
      throw new HttpException(
        'Missing raw body for Svix webhook',
        HttpStatus.BAD_REQUEST,
      );
    }

    const payload = (request as any).rawBody.toString('utf8');

    try {
      const event: ClerkEvent = this.webhook.verify(
        payload,
        headers,
      ) as ClerkEvent;
      request.webhookEvent = event;

      return true;
    } catch (error) {
      this.logger.error(`Invalid Svix webhook signature: ${error.message}`);
      throw new HttpException(
        `Invalid Svix webhook signature: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
