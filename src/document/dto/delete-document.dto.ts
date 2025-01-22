import { IsNotEmpty, IsString } from 'class-validator';

export class DeleteDocumentDto {
  @IsNotEmpty()
  @IsString()
  id: string;
}
