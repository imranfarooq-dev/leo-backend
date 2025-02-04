import { Database } from '@/database.types';
import { TranscriptionJobStatus } from '@/types/transcription_job';

export type TranscriptionStatus =
  Database['public']['Enums']['transcription_status_enum'];

export type TranscriptionDB =
  Database['public']['Tables']['transcriptions']['Row'];

export type Transcription = {
  id: string;
  image_id: string;
  ai_transcription_text: string | null;
  current_transcription_text: string | null;
  transcription_status: TranscriptionStatus;
  job_status: TranscriptionJobStatus;
}

export enum APITranscriptionStatus {
  Success = 'Success',
  Failed = 'Failed',
}
