import { IsInt, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class FetchDocumentListDto {
  @IsInt()
  @IsNotEmpty()
  @Type(() => Number)
  document_id: number;
}
