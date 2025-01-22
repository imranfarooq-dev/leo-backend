import { IsNotEmpty, IsString } from 'class-validator';

export class CreateImageDto {
  @IsNotEmpty()
  @IsString()
  document_id: string;
}
