import { Database } from '@/database.types';
import { Image, BaseImage } from '@/types/image';

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
  archive: string | null;
  box: string | null;
  collection: string | null;
  folder: string | null;
  rights: string | null;
  type: string | null;
  images: (Image | BaseImage)[];
};