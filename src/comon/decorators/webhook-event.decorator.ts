import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const WebhookEvent = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.webhookEvent;
  },
);
