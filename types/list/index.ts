import { Database } from '@/database.types';

export type List = Database['public']['Tables']['lists']['Row'];

export type ListTree = {
  id: string;
  list_name: string;
  children: ListTree[];
};

export type ListOrder = {
  id: string;
  order: number;
};
