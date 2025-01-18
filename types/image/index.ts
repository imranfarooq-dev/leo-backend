import { Database } from '@/database.types';
import { Transcription } from '@/types/transcription';
import { Note } from '@/types/notes';

export type UploadedImage = {
  id: string;
  path: string;
  fileName: string;
  fullPath: string;
  publicUrl: string;
};

export type InsertImage = {
  document_id: number;
  image_name: string;
  image_url: string;
  image_path: string;
};

export type Image = Database['public']['Tables']['images']['Row'];

export type ImageWithTranscriptionAndNote = Image & {
  transcriptions: Transcription;
  notes: Note;
};

export type FileBufferDownloadResult = {
  buffer: Buffer | null;
  fileType: string | null;
  error?: string;
};
