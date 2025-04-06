import { CreditsRepository } from '@/src/database/repositiories/credits.repository';
import { DocumentRepository } from '@/src/database/repositiories/document.repository';
import { ImageRepository } from '@/src/database/repositiories/image.repository';
import { SubscriptionRepository } from '@/src/database/repositiories/subscription.repository';
import { UserRepository } from '@/src/database/repositiories/user.repository';
import {
  FreePlan,
  Provides,
  StripeCheckoutMode,
  SubscriptionStatus,
  Tables,
} from '@/src/shared/constant';
import { Credit } from '@/types/credit';
import { FreePlanStatus, SubscriptionDB } from '@/types/subscription';
import { UserType } from '@/src/comon/decorators/user.decorator';
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SubscriptionService {
  private readonly successUrl: string;
  private readonly logger: Logger = new Logger(SubscriptionService.name);

  constructor(
    @Inject(Provides.Stripe) private readonly stripeService: Stripe,
    private readonly userRepository: UserRepository,
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly creditRepository: CreditsRepository,
    private readonly documentRepository: DocumentRepository,
    private readonly imageRepository: ImageRepository,
    private configService: ConfigService,
    @Inject(Provides.Supabase) private readonly supabase: SupabaseClient,
  ) {
    this.successUrl = this.configService.get<string>('STRIPE_SUCCESS_URL');
  }

  async fetchPricingAndPlans() {
    try {
      const productList = await this.stripeService.products.list({
        active: true,
        expand: ['data.default_price'],
      });

      return productList.data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        error.message ??
          'An error occurred while fetching the pricing and plans',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async fetchStatusAndCredits(clerkUser: UserType): Promise<{
    image_limits: number;
    lifetime_credits: number;
    monthly_credits: number;
    free_plan_status: FreePlanStatus;
    status: SubscriptionStatus | null;
    numberOfImages: number;
    stripe_price_id: string | null;
    current_period_end: string | null;
    price: string | null;
    cancel_at_period_end?: boolean;
    scheduled_plan_change?: boolean;
    scheduled_price_id?: string | null;
    scheduled_effective_date?: string | null;
  } | null> {
    try {
      const [subscription, credits, numImages] = await Promise.all([
        this.fetchSubscription(clerkUser.id),
        this.creditRepository.fetchUserCredits(clerkUser.id),
        this.imageRepository.countImagesByUserId(clerkUser.id),
      ]);

      if (!credits) {
        return null;
      }

      return {
        image_limits: credits.image_limits,
        lifetime_credits: credits.lifetime_credits,
        monthly_credits: credits.monthly_credits,
        free_plan_status: subscription?.free_plan_status as FreePlanStatus,
        status: subscription?.status as SubscriptionStatus | null,
        numberOfImages: numImages,
        stripe_price_id: subscription?.stripe_price_id,
        current_period_end: subscription?.current_period_end,
        price: subscription?.price,
        cancel_at_period_end: subscription?.cancel_at_period_end,
        scheduled_plan_change: subscription?.scheduled_plan_change,
        scheduled_price_id: subscription?.scheduled_price_id,
        scheduled_effective_date: subscription?.scheduled_effective_date,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        error.message ??
          'An error occurred while fetching the subscription status and credits',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async fetchPaymentMethods(clerkUser: UserType) {
    try {
      const subscription: SubscriptionDB = await this.fetchSubscription(
        clerkUser.id,
      );

      // Get payment methods
      const paymentLists = await this.stripeService.paymentMethods.list({
        customer: subscription.stripe_customer_id,
        type: 'card',
      });

      return paymentLists.data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        error.message ??
          'An error occurred while fetching the subscription status and credits',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async fetchInvoices(clerkUser: UserType) {
    try {
      const subscription: SubscriptionDB = await this.fetchSubscription(
        clerkUser.id,
      );

      if (!subscription.stripe_customer_id) {
        throw new BadRequestException('Stripe customer ID not found');
      }

      const stripeInvoicelists = await this.stripeService.invoices.list({
        customer: subscription.stripe_customer_id,
      });

      return stripeInvoicelists.data.map((invoice: Stripe.Invoice) => ({
        id: invoice.id,
        status: invoice.status,
        createdAt: invoice.created,
        dueDate: invoice.due_date,
        amount: invoice.amount_due / 100,
        pdfUrl: invoice.invoice_pdf,
      }));
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        error.message ??
          'An error occurred while fetching the subscription status and credits',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async cancelSubscription(clerkUser: UserType) {
    try {
      const subscription: SubscriptionDB = await this.fetchSubscription(
        clerkUser.id,
      );

      if (!subscription.stripe_subscription_id) {
        throw new HttpException('Subscription not found', HttpStatus.NOT_FOUND);
      }

      if (subscription.status === SubscriptionStatus.Canceled) {
        throw new HttpException(
          'Subscription already cancelled',
          HttpStatus.BAD_REQUEST,
        );
      }

      // First, find and release any active subscription schedules
      const schedules = await this.stripeService.subscriptionSchedules.list({
        customer: subscription.stripe_customer_id,
      });

      // Track if we found and released any schedules
      let scheduleFound = false;

      // Release any active schedules (like pending downgrades)
      for (const schedule of schedules.data) {
        // Only release schedules associated with this subscription
        if (
          (schedule.status === 'active' || schedule.status === 'not_started') &&
          schedule.subscription === subscription.stripe_subscription_id
        ) {
          await this.stripeService.subscriptionSchedules.release(schedule.id);
          scheduleFound = true;
          this.logger.log(`Released subscription schedule ${schedule.id}`);
        }
      }

      // If we released a schedule, we need to retrieve the subscription again
      // as the release of the schedule may have modified it
      if (scheduleFound) {
        // Wait a moment for Stripe to process the schedule release
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Get the updated subscription
        const updatedStripeSubscription =
          await this.stripeService.subscriptions.retrieve(
            subscription.stripe_subscription_id,
          );

        // If the subscription was already canceled by the schedule release, return early
        if (updatedStripeSubscription.cancel_at_period_end) {
          // Still update our local database
          await this.subscriptionRepository.updateUserSubscription(
            clerkUser.id,
            {
              cancel_at_period_end: true,
              scheduled_plan_change: false,
              scheduled_price_id: null,
              scheduled_effective_date: null,
            },
          );
          return true;
        }
      }

      // Then schedule the cancellation at period end
      await this.stripeService.subscriptions.update(
        subscription.stripe_subscription_id,
        { cancel_at_period_end: true },
      );

      // Update the local database to reflect cancellation scheduled
      // Also clear any scheduled plan changes for clarity in the UI
      await this.subscriptionRepository.updateUserSubscription(clerkUser.id, {
        cancel_at_period_end: true,
        scheduled_plan_change: false,
        scheduled_price_id: null,
        scheduled_effective_date: null,
      });

      return true;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        error.message ?? 'An error occurred while cancelling the subscription',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async changeSubscriptionPlan(clerkUser: UserType, priceId?: string) {
    try {
      const subscription: SubscriptionDB = await this.fetchSubscription(
        clerkUser.id,
      );

      if (!subscription.stripe_subscription_id) {
        throw new BadRequestException('No subscription found');
      }

      const stripeSubscription =
        await this.stripeService.subscriptions.retrieve(
          subscription.stripe_subscription_id,
        );

      // Get the current price to determine if this is an upgrade or downgrade
      const currentPriceId = stripeSubscription.items.data[0].price.id;

      // Check if there's already a scheduled plan change
      const hasScheduledChange = subscription.scheduled_plan_change;

      // Even if the price is the same, we still need to clear any scheduled changes
      if (currentPriceId === priceId && !hasScheduledChange) {
        return stripeSubscription;
      }

      // Get prices to determine upgrade vs downgrade
      const [currentPrice, newPrice] = await Promise.all([
        this.stripeService.prices.retrieve(currentPriceId),
        this.stripeService.prices.retrieve(priceId),
      ]);

      // For downgrades, schedule at period end
      const isDowngrade = newPrice.unit_amount < currentPrice.unit_amount;

      let updatedSubscription;

      if (isDowngrade) {
        // For downgrades, schedule the change at period end
        updatedSubscription = await this.stripeService.subscriptions.update(
          subscription.stripe_subscription_id,
          {
            cancel_at_period_end: false, // If plan is scheduled to be cancelled but gets updated
          },
        );

        // Create a subscription schedule from the current subscription
        const schedule = await this.stripeService.subscriptionSchedules.create({
          from_subscription: subscription.stripe_subscription_id,
        });

        // Calculate the end of the current billing period in Unix timestamp format
        const currentPeriodEndTimestamp = Math.floor(
          new Date(subscription.current_period_end).getTime() / 1000,
        );

        // Now update the schedule to add the phase with the new price
        await this.stripeService.subscriptionSchedules.update(schedule.id, {
          phases: [
            {
              // Keep the current subscription settings for the current phase (until end of billing period)
              items: [
                {
                  price: currentPriceId,
                  quantity: 1,
                },
              ],
              start_date: schedule.phases[0].start_date,
              end_date: currentPeriodEndTimestamp,
            },
            {
              // After current period, switch to the new price
              items: [
                {
                  price: priceId,
                  quantity: 1,
                },
              ],
              start_date: currentPeriodEndTimestamp,
            },
          ],
        });
      } else {
        // For upgrades, apply immediately
        const prorationBehavior = 'always_invoice';

        updatedSubscription = await this.stripeService.subscriptions.update(
          subscription.stripe_subscription_id,
          {
            items: [
              { id: stripeSubscription.items.data[0].id, price: priceId },
            ],
            proration_behavior: prorationBehavior,
            cancel_at_period_end: false, // If plan is scheduled to be cancelled but gets updated
          },
        );
      }

      // If downgrade, update the local database to track scheduled change
      if (isDowngrade) {
        await this.subscriptionRepository.updateUserSubscription(clerkUser.id, {
          scheduled_plan_change: true,
          scheduled_price_id: priceId,
          scheduled_effective_date: subscription.current_period_end,
          cancel_at_period_end: false, // Clear any scheduled cancellation
        });
      }
      // If it's an upgrade or staying on same plan, clear any scheduled changes
      else {
        await this.subscriptionRepository.updateUserSubscription(clerkUser.id, {
          scheduled_plan_change: false,
          scheduled_price_id: null,
          scheduled_effective_date: null,
          cancel_at_period_end: false, // Clear any scheduled cancellation
        });
      }

      return updatedSubscription;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        error.message ??
          'An error occurred while fetching the stripe checkout session token',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async selectFreePlan(clerkUser: UserType): Promise<void> {
    try {
      const subscription: SubscriptionDB = await this.fetchSubscription(
        clerkUser.id,
      );

      // When we downgrade
      if (subscription.status === SubscriptionStatus.Active) {
        // First, find and release any active subscription schedules
        const schedules = await this.stripeService.subscriptionSchedules.list({
          customer: subscription.stripe_customer_id,
        });

        // Track if we found and released any schedules
        let scheduleFound = false;

        // Release any active schedules (like pending downgrades)
        for (const schedule of schedules.data) {
          // Only release schedules associated with this subscription
          if (
            (schedule.status === 'active' ||
              schedule.status === 'not_started') &&
            schedule.subscription === subscription.stripe_subscription_id
          ) {
            await this.stripeService.subscriptionSchedules.release(schedule.id);
            scheduleFound = true;
            this.logger.log(`Released subscription schedule ${schedule.id}`);
          }
        }

        // If we released a schedule, we need to retrieve the subscription again
        if (scheduleFound) {
          // Wait a moment for Stripe to process the schedule release
          await new Promise((resolve) => setTimeout(resolve, 1000));

          // Get the updated subscription
          const updatedStripeSubscription =
            await this.stripeService.subscriptions.retrieve(
              subscription.stripe_subscription_id,
            );

          // Check if the subscription is already canceled (not just scheduled for cancellation)
          if (updatedStripeSubscription.status === 'canceled') {
            // Subscription is already canceled, update our database and set up free plan
            await this.setUpFreePlan(clerkUser.id, subscription);
            return;
          }

          // If the subscription is already scheduled for cancellation, just update our DB
          if (updatedStripeSubscription.cancel_at_period_end) {
            await this.subscriptionRepository.updateUserSubscription(
              clerkUser.id,
              {
                cancel_at_period_end: true,
                scheduled_plan_change: false,
                scheduled_price_id: null,
                scheduled_effective_date: null,
              },
            );
            return;
          }
        }

        try {
          // Schedule the cancellation at period end
          await this.stripeService.subscriptions.update(
            subscription.stripe_subscription_id,
            { cancel_at_period_end: true },
          );

          // Also update local database to indicate cancellation
          await this.subscriptionRepository.updateUserSubscription(
            clerkUser.id,
            {
              cancel_at_period_end: true,
              scheduled_plan_change: false,
              scheduled_price_id: null,
              scheduled_effective_date: null,
            },
          );
        } catch (error) {
          // If we can't update the subscription (e.g., it's already canceled),
          // set up the free plan directly
          if (
            error.message &&
            error.message.includes('canceled subscription')
          ) {
            this.logger.warn(
              `Subscription ${subscription.stripe_subscription_id} is already canceled: ${error.message}`,
            );
            await this.setUpFreePlan(clerkUser.id, subscription);
          } else {
            throw error;
          }
        }

        return;
      }

      if (subscription.free_plan_status === FreePlanStatus.Subscribed) {
        throw new BadRequestException('Already subscribed to free plan');
      }

      await this.setUpFreePlan(clerkUser.id, subscription);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        error.message ?? 'An error occurred while selecting free plan',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Helper method to set up free plan
  private async setUpFreePlan(
    userId: string,
    subscription: SubscriptionDB,
  ): Promise<void> {
    const updatedCredits: Partial<Credit> = {
      monthly_credits: FreePlan.monthly_credits,
      image_limits: FreePlan.storage_limit,
    };

    const updatedSubscription: Partial<SubscriptionDB> = {
      free_plan_status: FreePlanStatus.Subscribed,
      // Clear any scheduled changes or cancellations just in case
      cancel_at_period_end: false,
      scheduled_plan_change: false,
      scheduled_price_id: null,
      scheduled_effective_date: null,
    };

    if (!subscription.lifetime_tokens_awarded) {
      updatedCredits.lifetime_credits = FreePlan.lifetime_credits;
      updatedSubscription.lifetime_tokens_awarded = true;
    }

    await this.creditRepository.updateCredits(userId, updatedCredits);

    await this.subscriptionRepository.updateUserSubscription(
      userId,
      updatedSubscription,
    );
  }

  async createCheckoutSession(
    user: UserType,
    priceId: string,
    mode: StripeCheckoutMode,
  ) {
    try {
      const subscription: SubscriptionDB = await this.fetchSubscription(
        user.id,
      );

      const checkoutOption: Stripe.Checkout.SessionCreateParams = {
        customer: subscription.stripe_customer_id,
        client_reference_id: user.id,
        mode,
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        metadata: { userId: user.id },
        success_url: this.successUrl,
      };

      if (mode === StripeCheckoutMode.Subscription) {
        checkoutOption.subscription_data = {
          metadata: {
            userId: user.id,
          },
        };
      }

      return await this.stripeService.checkout.sessions.create(checkoutOption);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        error.message ??
          'An error occurred while fetching the stripe checkout session token',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async constructWebhookEvent(
    payload: Buffer,
    signature: string,
    webhookSecret: string,
  ): Promise<Stripe.Event> {
    try {
      return this.stripeService.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret,
      );
    } catch (error) {
      throw new Error(
        `Webhook signature verification failed: ${error.message}`,
      );
    }
  }

  async handleStripeWebhook(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutSessionCompletedEvent(event.data.object);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.handleCustomerSubscriptionEvent(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await this.handleCustomerCancelSubscriptionEvent(event.data.object);
        break;
      case 'invoice.paid':
        await this.handleInvoicePaidEvent(event.data.object);
        break;
      default:
        this.logger.error(`Unhandled event type: ${event.type}`);
    }
  }

  private async handleCheckoutSessionCompletedEvent(
    session: Stripe.Checkout.Session,
  ) {
    try {
      const userId = session.metadata.userId;

      if (!userId) {
        throw new HttpException('UserId not found', HttpStatus.NOT_FOUND);
      }

      if (session.mode === StripeCheckoutMode.Payment) {
        const lineItems =
          await this.stripeService.checkout.sessions.listLineItems(session.id);
        const product = lineItems.data[0].price.product;

        const productInfo = (
          typeof product === 'string'
            ? await this.stripeService.products.retrieve(product)
            : product
        ) as Stripe.Product;

        const previousCredits =
          await this.creditRepository.fetchUserCredits(userId);

        const lifetimeCredits =
          parseInt(productInfo.metadata.lifetime_credit) +
          previousCredits.lifetime_credits;

        await this.creditRepository.updateCredits(userId, {
          lifetime_credits: lifetimeCredits,
        });
      }
    } catch (error) {
      this.logger.error(
        `Error handling checkout session completed event: ${error.message}`,
      );
    }
  }

  private async handleCustomerSubscriptionEvent(
    subscription: Stripe.Subscription,
  ) {
    try {
      const userId = subscription.metadata.userId;

      if (!userId) {
        throw new HttpException('UserId not found', HttpStatus.NOT_FOUND);
      }

      const priceId = subscription.items.data[0].price.id;
      const price: string = String(
        subscription.items.data[0].price.unit_amount / 100,
      );
      const currentPeriodStart = new Date(
        subscription.current_period_start * 1000,
      ).toISOString();
      const currentPeriodEnd = new Date(
        subscription.current_period_end * 1000,
      ).toISOString();

      // Get the existing subscription data
      const existingSubscription = await this.fetchSubscription(userId);

      // Check if this is a plan change taking effect
      const isPlanChangeComplete =
        existingSubscription?.scheduled_plan_change &&
        existingSubscription?.scheduled_price_id === priceId;

      // Check if cancellation has been reverted through Stripe dashboard
      const isStripeResumption =
        existingSubscription?.cancel_at_period_end === true &&
        subscription.cancel_at_period_end === false;

      // Handle complete update from Stripe
      const updateData: Partial<SubscriptionDB> = {
        status: subscription.status,
        price,
        stripe_price_id: priceId,
        current_period_start: currentPeriodStart,
        current_period_end: currentPeriodEnd,
        stripe_subscription_id: subscription.id,
        cancel_at_period_end: subscription.cancel_at_period_end,
      };

      // Clear scheduled changes if they've taken effect or if subscription has been resumed
      if (isPlanChangeComplete || isStripeResumption) {
        updateData.scheduled_plan_change = false;
        updateData.scheduled_price_id = null;
        updateData.scheduled_effective_date = null;
      }

      // If Stripe says subscription is canceled, make sure to clear all scheduling flags
      if (subscription.status === SubscriptionStatus.Canceled) {
        updateData.scheduled_plan_change = false;
        updateData.scheduled_price_id = null;
        updateData.scheduled_effective_date = null;
        updateData.cancel_at_period_end = false;
      }

      await this.subscriptionRepository.updateUserSubscription(
        userId,
        updateData,
      );
    } catch (error) {
      this.logger.error(error.message);
    }
  }

  private async handleCustomerCancelSubscriptionEvent(
    subscription: Stripe.Subscription,
  ) {
    try {
      const userId = subscription.metadata.userId;

      if (!userId) {
        throw new HttpException('UserId not found', HttpStatus.NOT_FOUND);
      }

      const subscriptionInfo: SubscriptionDB =
        await this.fetchSubscription(userId);

      const credits = await this.creditRepository.fetchUserCredits(userId);

      const updatedCredits: Partial<Credit> = {
        monthly_credits: FreePlan.monthly_credits,
        image_limits: FreePlan.storage_limit,
      };

      const updatedSubscription: Partial<SubscriptionDB> = {
        status: subscription.status,
        price: null,
        stripe_price_id: null,
        current_period_start: new Date(
          subscription.current_period_start * 1000,
        ).toISOString(),
        current_period_end: new Date(
          subscription.canceled_at * 1000,
        ).toISOString(),
        stripe_subscription_id: null,
        free_plan_status: FreePlanStatus.Subscribed,
        // Clear any scheduled changes or cancellations as subscription is now canceled
        cancel_at_period_end: false,
        scheduled_plan_change: false,
        scheduled_price_id: null,
        scheduled_effective_date: null,
      };

      if (!subscriptionInfo.lifetime_tokens_awarded) {
        updatedCredits.lifetime_credits =
          FreePlan.lifetime_credits + credits.lifetime_credits;
        updatedSubscription.lifetime_tokens_awarded = true;
      }

      await this.creditRepository.updateCredits(userId, updatedCredits);

      await this.subscriptionRepository.updateUserSubscription(
        userId,
        updatedSubscription,
      );
    } catch (error) {
      this.logger.error(error.message);
    }
  }

  private async handleInvoicePaidEvent(invoice: Stripe.Invoice) {
    try {
      if (!invoice.subscription) return;

      // Get full subscription data
      const subscription: Stripe.Subscription =
        typeof invoice.subscription === 'string'
          ? await this.stripeService.subscriptions.retrieve(
              invoice.subscription,
            )
          : invoice.subscription;

      // Validate user metadata
      const userId = subscription.metadata.userId;
      if (!userId) {
        throw new NotFoundException('User not found');
      }

      const subscriptionInfo: SubscriptionDB =
        await this.fetchSubscription(userId);

      // Get product details
      const subscriptionProduct = subscription.items.data[0].price.product;
      const product: Stripe.Product = (
        typeof subscriptionProduct === 'string'
          ? await this.stripeService.products.retrieve(subscriptionProduct)
          : subscriptionProduct
      ) as Stripe.Product;

      const creditsInfo = await this.creditRepository.fetchUserCredits(userId);

      // Extract metadata and convert to numbers with fallbacks
      const metadata = product.metadata;
      const lifetimeCredits = subscriptionInfo.lifetime_tokens_awarded
        ? creditsInfo.lifetime_credits
        : parseInt(metadata.lifetime_credit) + creditsInfo.lifetime_credits;
      const updatedCredits = {
        monthly_credits: parseInt(metadata.monthly_credit || '0'),
        lifetime_credits: lifetimeCredits,
        image_limits: parseInt(metadata.storage_limit || '0'),
      };

      // Prepare subscription update data
      const updatedSubscription: Partial<SubscriptionDB> = {
        status: subscription.status,
        price: String(subscription.items.data[0].price.unit_amount / 100),
        stripe_price_id: subscription.items.data[0].price.id,
        current_period_start: new Date(
          subscription.current_period_start * 1000,
        ).toISOString(),
        current_period_end: new Date(
          subscription.current_period_end * 1000,
        ).toISOString(),
        stripe_subscription_id: subscription.id,
      };

      if (!subscriptionInfo.lifetime_tokens_awarded) {
        updatedSubscription.lifetime_tokens_awarded = true;
      }

      if (subscriptionInfo.free_plan_status === FreePlanStatus.Subscribed) {
        updatedSubscription.free_plan_status =
          FreePlanStatus.PreviouslySubscribed;
      }

      await this.subscriptionRepository.updateUserSubscription(
        userId,
        updatedSubscription,
      );
      await this.creditRepository.updateCredits(userId, updatedCredits);
    } catch (error) {
      this.logger.error(error.message);
    }
  }

  private readonly fetchSubscription = async (
    userId: string,
  ): Promise<SubscriptionDB | null> => {
    try {
      const subscription: SubscriptionDB | null =
        await this.subscriptionRepository.getUserSubscription(userId);

      if (!subscription) {
        return null;
      }

      return subscription;
    } catch (error) {
      throw new HttpException(
        error.message ??
          'An error occurred while fetching the user and subscription info',
        error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  };

  async replenishBetaCredits(): Promise<void> {
    try {
      const { data: subscriptions, error } = await this.supabase
        .from(Tables.Subscriptions)
        .select('user_id, current_period_end, stripe_subscription_id')
        .like('stripe_subscription_id', 'beta_%')
        .eq('status', SubscriptionStatus.Active);

      if (error) {
        throw new Error(`Failed to fetch beta subscriptions: ${error.message}`);
      }

      const now = new Date();

      for (const subscription of subscriptions) {
        const periodEnd = new Date(subscription.current_period_end);

        if (now > periodEnd) {
          const newPeriodStart = periodEnd;
          const newPeriodEnd = new Date(periodEnd);
          newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);

          // Replenish credits
          await this.creditRepository.updateCredits(subscription.user_id, {
            monthly_credits: 100,
          });

          // Update subscription periods
          await this.subscriptionRepository.updateUserSubscription(
            subscription.user_id,
            {
              current_period_start: newPeriodStart.toISOString(),
              current_period_end: newPeriodEnd.toISOString(),
            },
          );

          this.logger.log(
            `Replenished credits for beta user ${subscription.user_id}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(`Error replenishing beta credits: ${error.message}`);
      throw error;
    }
  }

  async resumeSubscription(clerkUser: UserType) {
    try {
      const subscription: SubscriptionDB = await this.fetchSubscription(
        clerkUser.id,
      );

      if (!subscription.stripe_subscription_id) {
        throw new HttpException('Subscription not found', HttpStatus.NOT_FOUND);
      }

      // Check if there's a scheduled cancellation OR a scheduled plan change
      if (
        !subscription.cancel_at_period_end &&
        !subscription.scheduled_plan_change
      ) {
        throw new HttpException(
          'Subscription has no scheduled changes to resume',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Handle scheduled downgrades (subscription schedules)
      if (subscription.scheduled_plan_change) {
        // Find any active subscription schedules
        const schedules = await this.stripeService.subscriptionSchedules.list({
          customer: subscription.stripe_customer_id,
        });

        // Handle schedules - properly release instead of cancel
        for (const schedule of schedules.data) {
          // Only process schedules associated with this subscription
          if (
            (schedule.status === 'active' ||
              schedule.status === 'not_started') &&
            schedule.subscription === subscription.stripe_subscription_id
          ) {
            // Release the schedule instead of cancelling it
            // This keeps the subscription active with current plan
            await this.stripeService.subscriptionSchedules.release(schedule.id);
            this.logger.log(`Released subscription schedule ${schedule.id}`);
          }
        }
      }

      // Update Stripe to remove the scheduled cancellation (if applicable)
      if (subscription.cancel_at_period_end) {
        await this.stripeService.subscriptions.update(
          subscription.stripe_subscription_id,
          { cancel_at_period_end: false },
        );
      }

      // Update local database - clear any cancellation or scheduled plan changes
      await this.subscriptionRepository.updateUserSubscription(clerkUser.id, {
        cancel_at_period_end: false,
        scheduled_plan_change: false,
        scheduled_price_id: null,
        scheduled_effective_date: null,
      });

      return true;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        error.message ?? 'An error occurred while resuming the subscription',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
