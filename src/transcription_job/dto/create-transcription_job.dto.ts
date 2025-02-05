import {
  IsUUID,
  IsNotEmpty,
  IsEnum,
  IsString,
  IsOptional,
} from 'class-validator';
import { APITranscriptionJobStatus } from '@/types/transcription_job';

export class CreateTranscriptionJobDto {
  @IsNotEmpty()
  @IsUUID()
  image_id: string;

  @IsNotEmpty()
  @IsString()
  external_job_id: string;

  @IsNotEmpty()
  @IsEnum(APITranscriptionJobStatus)
  status: APITranscriptionJobStatus;

  @IsOptional()
  @IsString()
  transcript_text?: string;

  @IsOptional()
  created_at?: Date;

  @IsOptional()
  updated_at?: Date;
}