import { IsNotEmpty, IsString, IsNumber } from 'class-validator';

export class UpdateOrderListDto {
  @IsNotEmpty()
  @IsString()
  list_id: string;

  @IsNotEmpty()
  @IsNumber()
  old_index: number;

  @IsNotEmpty()
  @IsNumber()
  new_index: number;
}
