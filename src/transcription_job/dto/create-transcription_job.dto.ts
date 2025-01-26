import {
  IsUUID,
  IsNotEmpty,
  IsEnum,
  IsString,
  IsOptional,
} from 'class-validator';

// Define the status enum to match the database enum
export enum TranscriptionJobStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export class CreateTranscriptionJobDto {
  @IsNotEmpty()
  @IsUUID()
  image_id: string;

  @IsNotEmpty()
  @IsString()
  external_job_id: string;

  @IsNotEmpty()
  @IsEnum(TranscriptionJobStatus)
  status: TranscriptionJobStatus;

  @IsOptional()
  @IsString()
  transcript_text?: string;

  @IsOptional()
  created_at?: Date;

  @IsOptional()
  updated_at?: Date;
}