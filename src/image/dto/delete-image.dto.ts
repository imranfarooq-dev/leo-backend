import { IsNotEmpty, IsString } from 'class-validator';

export class DeleteImageDto {
  @IsNotEmpty()
  @IsString()
  id: string;

  @IsNotEmpty()
  @IsString()
  document_id: string;
}
