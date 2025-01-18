import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateNoteDto {
  @IsNotEmpty()
  @IsString()
  notes_text: string;
}
