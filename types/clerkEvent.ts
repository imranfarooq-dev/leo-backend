import { UserJSON, WebhookEventType } from '@clerk/express';

export type ClerkEvent = {
  data: UserJSON;
  object: 'event';
  type: WebhookEventType;
};
