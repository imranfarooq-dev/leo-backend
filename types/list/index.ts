import { Database } from '@/database.types';

export type List = Database['public']['Tables']['lists']['Row'];

export type ListTree = {
  id: number;
  title: string;
  children: ListTree[];
};
