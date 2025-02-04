import { Database } from '@/database.types';

export type NoteDB = Database['public']['Tables']['notes']['Row'];

export type Note = {
    id: string;
    notes_text: string;
};
