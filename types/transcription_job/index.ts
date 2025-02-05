import { Database } from '@/database.types';

export type TranscriptionJobDB = Database['public']['Tables']['transcription_jobs']['Row'];

export type TranscriptionJobStatus =
  Database['public']['Enums']['transcription_job_status'];

export enum APITranscriptionJobStatus {
  InProgress = 'IN_PROGRESS',
  Completed = 'COMPLETED',
  Failed = 'FAILED',
}