import { UserJSON, WebhookEventType } from '@clerk/clerk-sdk-node';

export type ClerkEvent = {
  data: UserJSON;
  object: 'event';
  type: WebhookEventType;
};
