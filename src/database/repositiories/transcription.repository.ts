import { Inject, Injectable, Logger } from '@nestjs/common';
import { Provides, Tables } from '@/src/shared/constant';
import { SupabaseClient } from '@supabase/supabase-js';
import { UpdateTranscriptionDto } from '@/src/transcription/dto/update-transcription.dto';
import { CreateTranscriptionDto } from '@/src/transcription/dto/create-transcription.dto';
import { Transcription } from '@/types/transcription';

@Injectable()
export class TranscriptRepository {
  private readonly logger: Logger = new Logger(TranscriptRepository.name);

  constructor(
    @Inject(Provides.Supabase) private readonly supabase: SupabaseClient,
  ) { }

  async createTranscription(
    createTranscription: CreateTranscriptionDto,
  ): Promise<string> {
    try {
      const { data, error } = await this.supabase
        .from(Tables.Transcriptions)
        .insert(createTranscription)
        .select("id")
        .single();

      if (error) {
        throw new Error(error.message ?? 'Failed to create transcription');
      }

      return data.id;
    } catch (error) {
      this.logger.error(error.message ?? 'Failed to create transcription');
    }
  }

  async fetchTranscriptionById(
    transcriptionId: string,
    attributes?: string,
  ): Promise<Transcription | null> {
    try {
      const { data } = await this.supabase
        .from(Tables.Transcriptions)
        .select(attributes as '*')
        .eq('id', transcriptionId)
        .maybeSingle();

      return data;
    } catch (error) {
      this.logger.error(error.message ?? 'Failed to fetch transcription by id');
    }
  }

  async fetchTranscriptionByImageId(
    imageId: string,
    attributes?: string,
  ): Promise<Transcription | null> {
    try {
      const { data } = await this.supabase
        .from(Tables.Transcriptions)
        .select(attributes as '*')
        .eq('image_id', imageId)
        .maybeSingle();

      return data;
    } catch (error) {
      this.logger.error(error.message ?? 'Failed to fetch transcription by id');
    }
  }

  async updateTranscription(
    transcriptionId: string,
    updateTranscription: UpdateTranscriptionDto,
  ): Promise<void> {
    try {
      const { data, error } = await this.supabase
        .from(Tables.Transcriptions)
        .update(updateTranscription)
        .eq('id', transcriptionId);

      if (error) {
        throw new Error(error.message ?? 'Failed to update transcription}');
      }
    } catch (error) {
      this.logger.error(error.message ?? 'Failed to update transcription');
    }
  }

  async fetchUntranscribedImagesByDocumentIds(
    documentIds: string[],
  ): Promise<string[]> {
    try {
      if (documentIds.length === 0) {
        return [];
      }

      const { data, error } = await this.supabase.rpc('get_untranscribed_image_ids', { p_document_ids: documentIds });

      if (error) {
        throw new Error(error.message ?? 'Failed to fetch untranscribed images by document ids');
      }

      if (!data) {
        return [];
      }

      return data;
    } catch (error) {
      this.logger.error(error.message ?? 'Failed to fetch untranscribed images by document ids');
    }
  }
}

