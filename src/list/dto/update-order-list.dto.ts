import { IsNotEmpty, IsNumber } from 'class-validator';

export class UpdateOrderListDto {
  @IsNotEmpty()
  @IsNumber()
  list_id: number;

  @IsNotEmpty()
  @IsNumber()
  old_index: number;

  @IsNotEmpty()
  @IsNumber()
  new_index: number;
}
