import { Inject, Logger } from '@nestjs/common';
import { DBFunctions, Provides, Tables } from '@/src/shared/constant';
import { SupabaseClient } from '@supabase/supabase-js';

export class SearchRepository {
  private readonly logger: Logger = new Logger(SearchRepository.name);

  constructor(
    @Inject(Provides.Supabase) private readonly supabase: SupabaseClient,
  ) {}

  async searchListAndDocument(searchKeyword: string, userId: string) {
    try {
      const { data, error } = await this.supabase.rpc(
        DBFunctions.searchDocumentAndList,
        { search_term: searchKeyword, user_id_param: userId },
      );

      if (error) {
        throw new Error(error.message ?? 'Failed to search document and list');
      }

      return data;
    } catch (error) {
      this.logger.error(error.message ?? 'Failed to search document and list');
    }
  }

  async searchUserTranscription(searchKeyword: string, userId: string) {
    try {
      const { data, error } = await this.supabase
        .from(Tables.Transcriptions)
        .select(
          `
          id,
          current_transcription_text,
          ai_transcription_text,
          transcription_status,
          image: images!inner (
            id,
            image_name,
            image_url,
            document: documents!inner (
              id,
              document_name
            )
          )
        `,
        )
        .or(
          `and(current_transcription_text.neq.null,current_transcription_text.ilike.%${searchKeyword}%),` +
            `and(current_transcription_text.is.null,ai_transcription_text.ilike.%${searchKeyword}%)`,
        )
        .eq('images.documents.user_id', userId);

      if (error) {
        throw new Error(error.message ?? 'Failed to search user transcription');
      }

      return data;
    } catch (error) {
      this.logger.error(error.message ?? 'Failed to search user transcription');
    }
  }

  async searchUserNote(searchKeyword: string, userId: string) {
    try {
      const { data, error } = await this.supabase
        .from(Tables.Notes)
        .select(
          `
          id,
          notes_text,
          image: images!inner (
            id,
            image_name,
            image_url,
            document: documents!inner (
              id,
              document_name
            )
          )
        `,
        )
        .ilike('notes_text', `%${searchKeyword}%`)
        .eq('images.documents.user_id', userId);

      if (error) {
        throw new Error(error.message ?? 'Failed to search user notes');
      }

      return data;
    } catch (error) {
      this.logger.error(error.message ?? 'Failed to search user notes');
    }
  }
}
