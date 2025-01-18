import { IsInt, IsNotEmpty } from 'class-validator';

export class DeleteImageDto {
  @IsNotEmpty()
  @IsInt()
  id: number;

  @IsNotEmpty()
  @IsInt()
  document_id: number;
}
