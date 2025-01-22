import { IsNotEmpty, IsString } from 'class-validator';

export class FetchDocumentDto {
  @IsNotEmpty()
  @IsString()
  id: string;
}
