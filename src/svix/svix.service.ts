import { Inject, Injectable, Logger } from '@nestjs/common';
import { Webhook } from 'svix';
import { Provides } from '@/src/shared/constant';
import { ClerkEvent as ClerkEventType } from '@/types/clerkEvent';
import { UserJSON } from '@clerk/clerk-sdk-node';
import { UserService } from '@/src/user/user.service';

@Injectable()
export class SvixService {
  private readonly logger: Logger = new Logger(SvixService.name);

  constructor(
    @Inject(Provides.Svix) private readonly webhook: Webhook,
    private readonly userService: UserService,
  ) { }

  async handleClerkEvent(event: ClerkEventType): Promise<void> {
    switch (event.type) {
      case 'user.created':
        try {
          const { id, first_name, last_name, email_addresses }: UserJSON =
            event.data;

          await this.userService.create({
            id,
            email_address: email_addresses[0].email_address,
            first_name,
            last_name,
          });
        } catch (error) {
          this.logger.error('Failed to create user');
        }
        break;
      case 'user.updated':
        try {
          await this.userService.update(event.data);
        } catch (error) {
          this.logger.error('Failed to update user');
        }
        break;
      case 'user.deleted':
        try {
          await this.userService.delete(event.data);
        } catch (error) {
          this.logger.error(error.message ?? 'Failed to delete user');
        }
        break;
      default:
        this.logger.error(`Unhandled event type ${event.type}`);
    }
  }
}
