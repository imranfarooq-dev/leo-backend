import { IsNotEmpty, IsString } from 'class-validator';

export class FetchDocumentListDto {
  @IsString()
  @IsNotEmpty()
  document_id: string;
}
