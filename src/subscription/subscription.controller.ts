import {
  BadRequestException,
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Post,
  RawBodyRequest,
  Headers,
  Req,
  Get,
} from '@nestjs/common';
import { User as ClerkUser } from '@clerk/clerk-sdk-node';
import { User } from '@/src/comon/decorators/user.decorator';
import {
  ChangeSubscriptionPlanDto,
  CreateCheckoutSessionDto,
} from '@/src/subscription/dto';
import { SubscriptionService } from '@/src/subscription/subscription.service';
import { ConfigService } from '@nestjs/config';
import { Public } from '@/src/comon/decorators/public.decorator';
import { FreePlanStatus } from '@/types/subscription';
import { SubscriptionStatus } from '../shared/constant';

@Controller('subscription')
export class SubscriptionController {
  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly configService: ConfigService,
  ) { }

  @Post('checkout-session')
  async createCheckoutSession(
    @User() user: ClerkUser,
    @Body() { priceId, mode }: CreateCheckoutSessionDto,
  ) {
    try {
      const sessionToken = await this.subscriptionService.createCheckoutSession(
        user,
        priceId,
        mode,
      );
      return {
        statusCode: HttpStatus.CREATED,
        message: 'Checkout Session created successfully',
        sessionToken,
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
          message:
            error.message ??
            'An error occurred while creating the checkout session',
        },
        error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Public()
  @Post('webhook')
  async handleWebhook(
    @Req() request: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    try {
      if (!request.rawBody) {
        throw new BadRequestException('Invalid request body');
      }

      const webhookSecret = this.configService.get<string>(
        'stripe.webhookSecret',
      );

      if (!webhookSecret) {
        throw new Error('Webhook secret is not configured');
      }

      const event = await this.subscriptionService.constructWebhookEvent(
        request.rawBody,
        signature,
        webhookSecret,
      );

      await this.subscriptionService.handleStripeWebhook(event);

      return { received: true };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
          message: error.message ?? 'An error occurred handling webhook',
        },
        error.status ?? HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('cancel')
  async cancelSubscription(@User() clerkUser: ClerkUser) {
    try {
      const cancelSubscription =
        await this.subscriptionService.cancelSubscription(clerkUser);
      return {
        statusCode: HttpStatus.CREATED,
        message: 'Subscription cancelled successfully',
        cancelSubscription,
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
          message:
            error.message ?? 'An error occurred while cancelling subscription',
        },
        error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('change-plan')
  async changeSubscriptionPlan(
    @User() clerkUser: ClerkUser,
    @Body() data: ChangeSubscriptionPlanDto,
  ) {
    try {
      const changePlan = await this.subscriptionService.changeSubscriptionPlan(
        clerkUser,
        data.priceId,
      );
      return {
        statusCode: HttpStatus.CREATED,
        message: 'Subscription plan changed successfully',
        changePlan,
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
          message:
            error.message ??
            'An error occurred while changing subscription plan',
        },
        error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('free-plan')
  async selectFreePlan(@User() clerkUser: ClerkUser) {
    try {
      const freePlan = await this.subscriptionService.selectFreePlan(clerkUser);
      return {
        statusCode: HttpStatus.CREATED,
        message: 'Free plan selected successfully',
        freePlan,
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
          message:
            error.message ?? 'An error occurred while selecting free plan',
        },
        error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Public()
  @Get('pricings')
  async fetchPricingAndPlans() {
    try {
      const pricingAndPlans =
        await this.subscriptionService.fetchPricingAndPlans();
      return {
        statusCode: HttpStatus.OK,
        message: 'Product list fetched successfully',
        pricingAndPlans,
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
          message:
            error.message ??
            'An error occurred while creating the checkout session',
        },
        error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('status')
  async fetchSubscriptionStatusAndCredits(@User() user: ClerkUser) {
    try {
      const statusAndCredits: {
        image_limits: number;
        lifetime_credits: number;
        monthly_credits: number;
        free_plan_status: FreePlanStatus;
        numberOfImages: number;
        status: SubscriptionStatus | null;
        stripe_price_id: string | null;
        current_period_end: string | null;
        price: string | null;
      } =
        await this.subscriptionService.fetchStatusAndCredits(user);

      return {
        statusCode: HttpStatus.OK,
        message: 'Subscription Status and Credits fetched successfully',
        statusAndCredits,
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
          message:
            error.message ??
            'An error occurred while fetching subscription status and credits',
        },
        error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('payment-method')
  async fetchPaymentMethods(@User() user: ClerkUser) {
    try {
      const paymentMethods =
        await this.subscriptionService.fetchPaymentMethods(user);
      return {
        statusCode: HttpStatus.OK,
        message: 'Payment Methods fetched successfully',
        paymentMethods,
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
          message:
            error.message ?? 'An error occurred while fetching payment methods',
        },
        error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('invoice')
  async fetchCustomerInvoice(@User() user: ClerkUser) {
    try {
      const invoices = await this.subscriptionService.fetchInvoices(user);
      return {
        statusCode: HttpStatus.OK,
        message: 'Invoices fetched successfully',
        invoices,
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
          message: error.message ?? 'An error occurred while fetching Invoices',
        },
        error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
