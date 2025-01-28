import { Database } from '@/database.types';
import { Transcription } from '@/types/transcription';
import { Note } from '@/types/notes';
import { TranscriptionJobStatus } from '@/types/transcription_job';

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
};

export type Image = Database['public']['Tables']['images']['Row'];

export type ImageWithTranscriptionAndNote = Image & {
  transcriptions: Transcription;
  notes: Note;
  latest_transcription_job_status: TranscriptionJobStatus;
};

export type ImageWithPresignedUrl = Image & {
  image_url: string;
};

export type FileBufferDownloadResult = {
  buffer: Buffer | null;
  fileType: string | null;
  error?: string;
};
