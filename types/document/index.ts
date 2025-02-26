import { Database } from '@/database.types';
import { Image } from '@/types/image';

export type DocumentDB = Database['public']['Tables']['documents']['Row'];

export type Document = {
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
  archive: string | null;
  box: string | null;
  collection: string | null;
  folder: string | null;
  rights: string | null;
  type: string | null;
  images: Image[];
};