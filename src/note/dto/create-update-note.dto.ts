import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateUpdateNoteDto {
  @IsOptional()
  @IsString()
  notes_text: string | null;
}
