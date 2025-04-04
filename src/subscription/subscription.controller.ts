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
  UseGuards,
} from '@nestjs/common';
import { UserType } from '@/src/comon/decorators/user.decorator';
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
import { ApiKeyAuthGuard } from '@/src/auth/guards/api-key-auth.guard';

@Controller('subscription')
export class SubscriptionController {
  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly configService: ConfigService,
  ) {}

  @Post('checkout-session')
  async createCheckoutSession(
    @User() user: UserType,
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
        message: 'Checkout session created',
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
  async cancelSubscription(@User() clerkUser: UserType) {
    try {
      const cancelSubscription =
        await this.subscriptionService.cancelSubscription(clerkUser);
      return {
        statusCode: HttpStatus.CREATED,
        message: 'Subscription cancelled',
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
    @User() clerkUser: UserType,
    @Body() data: ChangeSubscriptionPlanDto,
  ) {
    try {
      const changePlan = await this.subscriptionService.changeSubscriptionPlan(
        clerkUser,
        data.priceId,
      );
      return {
        statusCode: HttpStatus.CREATED,
        message: 'Subscription plan updated',
        changePlan,
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
          message:
            error.message ??
            'An error occurred while updating subscription plan',
        },
        error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('free-plan')
  async selectFreePlan(@User() clerkUser: UserType) {
    try {
      await this.subscriptionService.selectFreePlan(clerkUser);
      return {
        statusCode: HttpStatus.CREATED,
        message: 'Free plan selected',
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

  @Get('pricings')
  async fetchPricingAndPlans(@User() user: UserType) {
    try {
      const pricingAndPlans =
        await this.subscriptionService.fetchPricingAndPlans();
      return {
        statusCode: HttpStatus.OK,
        message: 'Product list fetched',
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
  async fetchSubscriptionStatusAndCredits(@User() user: UserType) {
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
      } | null = await this.subscriptionService.fetchStatusAndCredits(user);

      if (!statusAndCredits) {
        return {
          statusCode: HttpStatus.NOT_FOUND,
          message: 'No user found',
        };
      }

      return {
        statusCode: HttpStatus.OK,
        message: 'Subscription status fetched',
        statusAndCredits,
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
          message:
            error.message ??
            'An error occurred while fetching subscription status',
        },
        error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('payment-method')
  async fetchPaymentMethods(@User() user: UserType) {
    try {
      const paymentMethods =
        await this.subscriptionService.fetchPaymentMethods(user);
      return {
        statusCode: HttpStatus.OK,
        message: 'Payment methods fetched',
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
  async fetchCustomerInvoice(@User() user: UserType) {
    try {
      const invoices = await this.subscriptionService.fetchInvoices(user);
      return {
        statusCode: HttpStatus.OK,
        message: 'Invoices fetched',
        invoices,
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
          message: error.message ?? 'An error occurred while fetching invoices',
        },
        error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Public()
  @Post('beta/replenish')
  @UseGuards(ApiKeyAuthGuard)
  async replenishBetaCredits() {
    try {
      await this.subscriptionService.replenishBetaCredits();
      return {
        statusCode: HttpStatus.OK,
        message: 'Beta credits replenished successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
          message:
            error.message ??
            'An error occurred while replenishing beta credits',
        },
        error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
