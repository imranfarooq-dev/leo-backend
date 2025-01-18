import { Database } from '@/database.types';

export type TranscriptionStatus =
  Database['public']['Enums']['transcription_status_enum'];

export type Transcription =
  Database['public']['Tables']['transcriptions']['Row'];

export enum APITranscriptionStatus {
  Success = 'Success',
  Failed = 'Failed',
}
