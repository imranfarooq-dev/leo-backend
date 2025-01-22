import { IsNotEmpty, IsString } from 'class-validator';

export class CreateNoteDto {
  @IsString()
  @IsNotEmpty()
  image_id: string;

  @IsNotEmpty()
  @IsString()
  notes_text: string;
}
