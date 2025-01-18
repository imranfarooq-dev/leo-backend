import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateNoteDto {
  @IsNumber()
  @IsNotEmpty()
  image_id: number;

  @IsNotEmpty()
  @IsString()
  notes_text: string;
}
