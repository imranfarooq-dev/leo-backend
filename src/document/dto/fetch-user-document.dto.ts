import { IsNotEmpty, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class FetchUserDocumentDto {
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
