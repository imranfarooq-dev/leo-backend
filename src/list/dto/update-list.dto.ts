import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateListDto {
  @IsNotEmpty()
  @IsString()
  list_name: string;
}
