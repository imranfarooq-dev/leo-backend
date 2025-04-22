import { Provides, Tables } from '@/src/shared/constant';
import { Inject, Logger } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  SearchDocumentByDate,
  SearchDocumentAndList,
  SearchTranscription,
  SearchUserNote,
} from '@/types/search';

export class SearchRepository {
  private readonly logger: Logger = new Logger(SearchRepository.name);

  constructor(
    @Inject(Provides.Supabase) private readonly supabase: SupabaseClient,
  ) {}

  async searchListAndDocument(
    searchKeyword: string,
    userId: string,
  ): Promise<SearchDocumentAndList[]> {
    try {
      const { data, error } = await this.supabase.rpc(
        'search_documents_and_lists',
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

  async searchUserTranscription(
    searchKeyword: string,
    userId: string,
  ): Promise<SearchTranscription[]> {
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

      const transformedData: SearchTranscription[] = (data as any[]).map(
        (transcript) => ({
          document_id: transcript.image.document.id,
          document_name: transcript.image.document.document_name,
          image_id: transcript.image.id,
          image_name: transcript.image.image_name,
          current_transcription_text: transcript.current_transcription_text,
          ai_transcription_text: transcript.ai_transcription_text,
          transcription_status: transcript.transcription_status,
        }),
      );

      return transformedData;
    } catch (error) {
      this.logger.error(error.message ?? 'Failed to search user transcription');
    }
  }

  async searchUserNote(
    searchKeyword: string,
    userId: string,
  ): Promise<SearchUserNote[]> {
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

      const transformedData: SearchUserNote[] = (data as any[]).map((note) => ({
        document_id: note.image.document.id,
        document_name: note.image.document.document_name,
        image_id: note.image.id,
        image_name: note.image.image_name,
        notes_text: note.notes_text,
      }));

      return transformedData;
    } catch (error) {
      this.logger.error(error.message ?? 'Failed to search user notes');
    }
  }

  async searchDocumentByDate(
    searchKeyword: string,
    userId: string,
  ): Promise<SearchDocumentByDate[]> {
    try {
      return;
    } catch (error) {
      this.logger.error(error.message ?? 'Failed to search user notes');
    }
  }
}
