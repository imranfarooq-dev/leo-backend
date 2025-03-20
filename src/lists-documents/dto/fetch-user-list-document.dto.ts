import { IsNotEmpty, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class FetchUserListDocumentDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  page: number;

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit: number;
}
