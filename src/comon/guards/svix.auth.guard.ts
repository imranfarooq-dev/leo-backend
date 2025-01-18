import {
  CanActivate,
  ExecutionContext,
  Injectable,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Webhook } from 'svix';
import { Inject } from '@nestjs/common';
import { Provides } from '@/src/shared/constant';
import { ClerkEvent } from '@/types/clerkEvent';

@Injectable()
export class WebhookGuard implements CanActivate {
  constructor(@Inject(Provides.Svix) private readonly webhook: Webhook) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const headers = {
      'svix-id': request.headers['svix-id'] as string,
      'svix-timestamp': request.headers['svix-timestamp'] as string,
      'svix-signature': request.headers['svix-signature'] as string,
    };
    const payload = (request as any).rawBody.toString('utf8');

    try {
      const event: ClerkEvent = this.webhook.verify(
        payload,
        headers,
      ) as ClerkEvent;
      request.webhookEvent = event;

      return true;
    } catch (error) {
      throw new HttpException(
        'Invalid webhook signature',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
