import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { CreateUserDto } from '@/src/user/dto/create-user.dto';
import { UserRepository } from '@/src/database/repositiories/user.repository';
import { User } from '@/types/user';
import { UserJSON } from '@clerk/clerk-sdk-node';
import {
  Provides,
  SubscriptionStatus,
} from '@/src/shared/constant';
import { SupabaseService } from '@/src/supabase/supabase.service';
import Stripe from 'stripe';
import { SubscriptionRepository } from '@/src/database/repositiories/subscription.repository';
import { CreditsRepository } from '@/src/database/repositiories/credits.repository';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @Inject(Provides.Stripe) private readonly stripe: Stripe,
    private readonly supabaseService: SupabaseService,
    private readonly userRepository: UserRepository,
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly creditRepository: CreditsRepository,
  ) { }

  async create(createUserDto: CreateUserDto): Promise<User> {
    try {
      const user = await this.userRepository.createUser(createUserDto);

      const stripeUser: Stripe.Customer = await this.stripe.customers.create({
        name: `${user.first_name} ${user.last_name}`,
        email: user.email_address,
      });

      await this.subscriptionRepository.createSubscription(
        user.id,
        stripeUser.id,
      );
      await this.creditRepository.createCredits(user.id);

      return user;
    } catch (error) {
      throw new HttpException(
        'An error occurred while deleting the document record',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async update(user: UserJSON): Promise<User> {
    try {
      const {
        id,
        first_name,
        last_name,
        email_addresses,
        primary_email_address_id,
      } = user;

      const email_address = email_addresses.find(
        (email) => email.id === primary_email_address_id,
      )?.email_address;

      return await this.userRepository.updateUser(id, {
        first_name,
        last_name,
        email_address,
      });
    } catch (error) {
      throw new HttpException(
        'An error occurred while deleting the document record',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async delete(user: UserJSON): Promise<User> {
    try {
      // Note we will not by default delete users' images after they are deleted from the database
      // const userStoragePath: string = `${DocumentStoragePath}/${user.id}`;
      // await this.supabaseService.deleteFolder(userStoragePath);
      await this.cancelStripeSubscription(user.id);

      return await this.userRepository.deleteUser(user.id);
    } catch (error) {
      throw new HttpException(
        error.message ?? 'An error occurred while deleting the document record',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async cancelStripeSubscription(userId: string) {
    try {
      const userSubscription =
        await this.subscriptionRepository.getUserSubscription(userId);

      if (!userSubscription?.stripe_subscription_id) {
        return;
      }

      const subscription = await this.stripe.subscriptions.retrieve(
        userSubscription?.stripe_subscription_id,
      );

      if (subscription.status === SubscriptionStatus.Canceled) {
        return;
      }

      await this.stripe.subscriptions.cancel(
        userSubscription?.stripe_subscription_id,
        {
          invoice_now: true,
          prorate: true,
        },
      );
    } catch (error) {
      this.logger.error(
        `Error canceling stripe subscription: ${error.message}`,
      );
    }
  }
}
