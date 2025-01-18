import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateListDto {
  @IsString()
  @IsNotEmpty()
  list_name: string;

  @IsNumber()
  @IsOptional()
  parent_list_id?: number;
}
