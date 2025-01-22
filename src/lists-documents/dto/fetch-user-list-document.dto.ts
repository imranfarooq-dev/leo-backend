import { IsNotEmpty, IsNumber, Min, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class FetchUserListDocumentDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  page: number;

  @IsNotEmpty()
  @IsString()
  list_id: string;

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit: number;
}
