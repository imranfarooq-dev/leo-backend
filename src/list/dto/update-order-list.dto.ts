import { IsNotEmpty, IsString, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type as TransformType } from 'class-transformer';

class OrderItem {
  @IsNotEmpty()
  @IsString()
  id: string;

  @IsNotEmpty()
  @IsNumber()
  order: number;
}

export class UpdateOrderListDto {
  @IsArray()
  @ValidateNested({ each: true })
  @TransformType(() => OrderItem)
  updates: OrderItem[];
}