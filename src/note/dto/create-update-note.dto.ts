import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateUpdateNoteDto {
  @IsNotEmpty()
  @IsString()
  image_id: string;

  @IsOptional()
  @IsString()
  notes_text: string | null;
}
