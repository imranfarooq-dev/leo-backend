import { Inject, Injectable, Logger } from '@nestjs/common';
import { Provides, Tables } from '@/src/shared/constant';
import { SupabaseClient } from '@supabase/supabase-js';
import { Document } from '@/types/document';
import { CreateDocumentDto } from '@/src/document/dto/create-document.dto';
import { UpdateDocumentDto } from '@/src/document/dto/update-document.dto';
import { Image } from '@/types/image';
import { ImageRepository } from './image.repository';

@Injectable()
export class DocumentRepository {
  private readonly logger: Logger = new Logger(DocumentRepository.name);

  constructor(
    @Inject(Provides.Supabase) private readonly supabase: SupabaseClient,
    private readonly imageRepository: ImageRepository,
  ) { }

  async createDocument(
    userId: string,
    createDocument: CreateDocumentDto,
  ): Promise<Document> {
    try {
      // Delete list_ids from object
      delete createDocument.list_ids;

      const { data, error } = await this.supabase
        .from(Tables.Documents)
        .insert({ ...createDocument, user_id: userId })
        .select()
        .single();

      if (error) {
        throw new Error(error.message ?? 'Failed to create document.');
      }

      return data;
    } catch (error) {
      this.logger.error(error.message ?? 'Failed to create document');
    }
  }

  async fetchDocumentById(
    documentId: string,
    attributes?: keyof Document,
  ): Promise<Document | null> {
    try {
      const { data } = await this.supabase
        .from(Tables.Documents)
        .select(attributes as '*')
        .eq('id', documentId)
        .maybeSingle();

      return data;
    } catch (error) {
      this.logger.error('Failed to fetch document by id');
    }
  }

  async fetchDocumentByUserId(
    userId: string,
    pagination?: { from: number; to: number },
    attributes?: keyof Document,
  ): Promise<{ documents: Document[]; count: number }> {
    try {
      let query = this.supabase
        .from(Tables.Documents)
        .select(attributes as '*', { count: 'exact' })
        .eq('user_id', userId);

      if (pagination) {
        query = query.range(pagination.from, pagination.to);
      }

      const { data: documents, count } = await query;

      return { documents, count };
    } catch (error) {
      this.logger.error('Failed to fetch document by user_id');
    }
  }

  async fetchDocumentsByIds(
    documentIds: Array<string>,
    includeImageTranscriptionAndNotes: boolean = false,
    attributes?: keyof Image,
  ): Promise<Document[] | undefined> {
    try {
      let query = this.supabase
        .from(Tables.Documents)
        .select(
          `
        *,
        ${includeImageTranscriptionAndNotes
            ? `
        images (
          *,
          transcriptions (
            id,
            current_transcription_text,
            ai_transcription_text,
            transcription_status,
            image_id,
            created_at,
            updated_at
          ),
          notes (
            id,
            notes_text,
            image_id,
            created_at,
            updated_at
          )
        )
        `
            : ''
          }`,
        )
        .in('id', documentIds);

      if (attributes) {
        query = this.supabase
          .from(Tables.Documents)
          .select(
            `
          ${attributes},
          ${includeImageTranscriptionAndNotes
              ? `
          images (
            *,
            transcriptions (
              id,
              current_transcription_text,
              ai_transcription_text,
              transcription_status,
              image_id,
              created_at,
              updated_at
            ),
            notes (
              id,
              notes_text,
              image_id,
              created_at,
              updated_at
            )
          )
          `
              : ''
            }`,
          )
          .in('id', documentIds);
      }

      const { data, error } = await query;

      if (error) {
        this.logger.error('Failed to fetch documents', { error });
        throw new Error('Failed to fetch documents');
      }

      if (includeImageTranscriptionAndNotes) {
        // Add image URLs to images.
        const imagesWithUrls = await this.imageRepository.addPresignedUrlsToImages(data.images);
        return { ...data, images: imagesWithUrls };
      }

      return data;
    } catch (error) {
      this.logger.error('Failed to fetch document by id');
    }
  }

  async updateDocument(
    documentId: string,
    updateDocument: UpdateDocumentDto,
  ): Promise<Document> {
    try {
      const { data, error } = await this.supabase
        .from(Tables.Documents)
        .update(updateDocument)
        .eq('id', documentId)
        .select()
        .single();

      if (error) {
        throw new Error('Failed to update document}');
      }

      return data;
    } catch (error) {
      this.logger.error(error.message ?? 'Failed to update document');
    }
  }

  async deleteDocument(documentId: string): Promise<Document | null> {
    try {
      const { data, error } = await this.supabase
        .from(Tables.Documents)
        .delete()
        .eq('id', documentId)
        .select()
        .maybeSingle();

      if (error) {
        throw new Error('Faied to delete document.');
      }

      return data;
    } catch (error) {
      this.logger.error(error.message ?? 'Failed to delete document');
    }
  }
}
