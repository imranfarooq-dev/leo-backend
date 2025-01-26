import { Database } from '@/database.types';

// TODO: Update this file to use the database types

export enum TranscriptionJobStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

export interface TranscriptionJob {
  id: string;
  transcription_id: string;
  external_job_id: string;
  status: TranscriptionJobStatus;
  transcript_text: string | null;
  created_at: string;
  updated_at: string;
}