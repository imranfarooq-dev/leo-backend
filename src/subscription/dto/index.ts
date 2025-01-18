import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { StripeCheckoutMode } from '@/src/shared/constant';

export class CreateCheckoutSessionDto {
  @IsNotEmpty()
  @IsString()
  priceId: string;

  @IsNotEmpty()
  @IsEnum(StripeCheckoutMode)
  mode: StripeCheckoutMode;
}

export class ChangeSubscriptionPlanDto {
  @IsNotEmpty()
  @IsString()
  priceId: string;
}
