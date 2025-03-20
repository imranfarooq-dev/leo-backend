import { IsOptional, IsEnum, IsString } from 'class-validator';
import { APITranscriptionJobStatus } from '@/types/transcription_job';

export class UpdateTranscriptionJobDto {
  @IsOptional()
  @IsEnum(APITranscriptionJobStatus)
  status?: APITranscriptionJobStatus;

  @IsOptional()
  @IsString()
  transcript_text?: string;

  @IsOptional()
  @IsString()
  external_job_id?: string;
}
