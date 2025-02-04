import { Database } from '@/database.types';
import { ImageSummary } from '@/types/image';

export type DocumentDB = Database['public']['Tables']['documents']['Row'];

export type DocumentSummary = {
  id: string;
  user_id: string;
  document_name: string;
  creator_name: string | null;
  date: string | null;
  identifier: string | null;
  created_at: string | null;
  updated_at: string | null;
  number_of_images_draft: number;
  number_of_images_transcribed: number;
  number_of_images_finalised: number;
  thumbnail_url: string | null;
};

export type DocumentSummaryFromRPC = {
  id: string;
  user_id: string;
  document_name: string;
  creator_name: string | null;
  date: string | null;
  identifier: string | null;
  created_at: string | null;
  updated_at: string | null;
  number_of_images_draft: number;
  number_of_images_transcribed: number;
  number_of_images_finalised: number;
  first_image_path: string | null;
};

export type DocumentDetails = {
  archive: string | null;
  box: string | null;
  collection: string | null;
  folder: string | null;
  rights: string | null;
  type: string | null;
  images: ImageSummary[];
}

export type DocumentDetailsFromRPC = {
  archive: string | null;
  box: string | null;
  collection: string | null;
  folder: string | null;
  rights: string | null;
  type: string | null;
}

export type Document = DocumentSummary & DocumentDetails;
export type DocumentFromRPC = DocumentSummaryFromRPC & DocumentDetailsFromRPC;