import { Database } from '@/database.types';

export type List = Database['public']['Tables']['lists']['Row'];

export type ListTree = {
  id: string;
  title: string;
  children: ListTree[];
};
