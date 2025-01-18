import { Database } from '@/database.types';
import { ImageWithTranscriptionAndNote } from '@/types/image';

export type Document = Database['public']['Tables']['documents']['Row'];

export type DocumentImageWithTranscriptionAndNote = Document & {
  images: Array<ImageWithTranscriptionAndNote>;
};
