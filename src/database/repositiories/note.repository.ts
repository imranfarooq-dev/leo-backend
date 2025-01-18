import { Inject, Logger } from '@nestjs/common';
import { Provides, Tables } from '@/src/shared/constant';
import { SupabaseClient } from '@supabase/supabase-js';
import { CreateNoteDto } from '@/src/note/dto/create-note.dto';
import { UpdateNoteDto } from '@/src/note/dto/update-note.dto';
import { Note } from '@/types/notes';

export class NoteRepository {
  private readonly logger: Logger = new Logger(NoteRepository.name);

  constructor(
    @Inject(Provides.Supabase) private readonly supabase: SupabaseClient,
  ) {}

  async createNote(createNote: CreateNoteDto): Promise<Note> {
    try {
      const { data, error } = await this.supabase
        .from(Tables.Notes)
        .insert(createNote)
        .select()
        .single();

      if (error) {
        throw new Error(error.message ?? 'Failed to create note');
      }

      return data;
    } catch (error) {
      this.logger.error(error.message ?? 'Failed to create note record');
    }
  }

  async fetchNoteById(noteId: number): Promise<Note | null> {
    try {
      const { data } = await this.supabase
        .from(Tables.Notes)
        .select()
        .eq('id', noteId)
        .maybeSingle();

      return data;
    } catch (error) {
      this.logger.error(error.message ?? 'Failed to fetch note');
    }
  }

  async fetchNoteByImageId(imageId: number): Promise<Note | null> {
    try {
      const { data } = await this.supabase
        .from(Tables.Notes)
        .select()
        .eq('image_id', imageId)
        .maybeSingle();

      return data;
    } catch (error) {
      this.logger.error(error.message ?? 'Failed to fetch note');
    }
  }

  async updateNote(notesId, updateNote: UpdateNoteDto): Promise<Note> {
    try {
      const { data, error } = await this.supabase
        .from(Tables.Notes)
        .update(updateNote)
        .eq('id', notesId)
        .select()
        .single();

      if (error) {
        throw new Error(error.message ?? 'Failed to update note');
      }

      return data;
    } catch (error) {
      this.logger.error(error.message ?? 'Failed to update note');
    }
  }
}
