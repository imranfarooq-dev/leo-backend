import { Database } from '@/database.types';
import { TranscriptionStatus } from '@/types/transcription';
import { APITranscriptionJobStatus } from '@/types/transcription_job';

export type UploadedImage = {
  id: string;
  path: string;
  fileName: string;
  fullPath: string;
  publicUrl: string;
};

export type InsertImage = {
  document_id: string;
  image_name: string;
  image_path: string;
  order: number;
};

export type ImageDB = Database['public']['Tables']['images']['Row'];

export type BaseImage = {
  id: string;
  document_id: string;
  image_name: string | null;
  order: number;
  thumbnail_url: string | null;
  transcription_status: TranscriptionStatus | null;
  note_exists: boolean;
};

export type Image = BaseImage & {
  image_url?: string;
  transcription_id?: string | null;
  ai_transcription_text?: string | null;
  current_transcription_text?: string | null;
  transcription_job_status?: APITranscriptionJobStatus | null;
  note_id?: string | null;
  notes_text?: string | null;
};

export type ImageOrder = {
  id: string;
  order: number;
};


export type FileBufferDownloadResult = {
  buffer: Buffer | null;
  fileType: string | null;
  error?: string;
};
