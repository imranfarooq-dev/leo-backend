import { Database } from '@/database.types';

export type TranscriptionJobDB = Database['public']['Tables']['transcription_jobs']['Row'];

export type TranscriptionJobStatus =
  Database['public']['Enums']['transcription_job_status'];