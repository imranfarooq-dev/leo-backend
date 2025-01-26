import { IsOptional, IsEnum, IsString } from 'class-validator';

export enum TranscriptionJobStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export class UpdateTranscriptionJobDto {
  @IsOptional()
  @IsEnum(TranscriptionJobStatus)
  status?: TranscriptionJobStatus;

  @IsOptional()
  @IsString()
  transcript_text?: string;

  @IsOptional()
  @IsString()
  external_job_id?: string;
}