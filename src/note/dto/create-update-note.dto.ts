import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateUpdateNoteDto {
  @IsNotEmpty()
  @IsNumber()
  image_id: number;

  @IsOptional()
  @IsString()
  notes_text: string | null;
}
