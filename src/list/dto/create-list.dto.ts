import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateListDto {
  @IsString()
  @IsNotEmpty()
  list_name: string;

  @IsString()
  @IsOptional()
  parent_list_id?: string;
}
