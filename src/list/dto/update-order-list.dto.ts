import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

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
  @Type(() => OrderItem)
  updates: OrderItem[];
}
