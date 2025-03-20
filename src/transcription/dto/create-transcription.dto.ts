import { IsOptional, IsEnum, IsString, IsNotEmpty } from 'class-validator';
import { TranscriptionStatus } from '@/types/transcription';

const VALID_TRANSCRIPTION_STATUSES: TranscriptionStatus[] = [
  'draft',
  'finalised',
  'transcribed',
];

export class CreateTranscriptionDto {
  @IsNotEmpty()
  @IsString()
  image_id: string;

  @IsOptional()
  @IsEnum(VALID_TRANSCRIPTION_STATUSES)
  transcription_status?: string;

  @IsOptional()
  @IsString()
  ai_transcription_text?: string;

  @IsOptional()
  @IsString()
  current_transcription_text?: string;
}
