import { Database } from '@/database.types';

export type ListDB = Database['public']['Tables']['lists']['Row'];

export type ListTree = {
  id: string;
  list_name: string;
  children: ListTree[];
};

export type ListOrder = {
  id: string;
  order: number;
};
