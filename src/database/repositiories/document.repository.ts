import { CreateDocumentDto } from '@/src/document/dto/create-document.dto'
import { UpdateDocumentDto } from '@/src/document/dto/update-document.dto'
import { Provides, Tables } from '@/src/shared/constant'
import { SupabaseService } from '@/src/supabase/supabase.service'
import { Document, DocumentFromRPC, DocumentSummary, DocumentExtra } from '@/types/document'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { SupabaseClient } from '@supabase/supabase-js'
import { ImageRepository } from './image.repository'

@Injectable()
export class DocumentRepository {
  private readonly logger: Logger = new Logger(DocumentRepository.name);

  constructor(
    @Inject(Provides.Supabase) private readonly supabase: SupabaseClient,
    private readonly imageRepository: ImageRepository,
    private readonly supabaseService: SupabaseService,
  ) { }

  async createDocument(
    userId: string,
    createDocument: CreateDocumentDto,
  ): Promise<string | null> {
    try {
      delete createDocument.list_ids;
      const { data, error } = await this.supabase
        .from(Tables.Documents)
        .insert({ ...createDocument, user_id: userId })
        .select("id")
        .single();

      if (error) {
        throw new Error(error.message ?? 'Failed to create item');
      }

      return data.id;

    } catch (error) {
      this.logger.error(error.message ?? 'Failed to create item');
    }
  }

  async fetchDocumentSummaryById(
    documentId: string,
  ): Promise<DocumentSummary | null> {
    try {
      const { data } = await this.supabase
        .rpc('get_document_by_id', { p_document_id: documentId })
        .maybeSingle();

      if (!data) {
        return null;
      }

      const {
        first_image_path,
        archive,
        box,
        collection,
        folder,
        rights,
        type,
        ...rest
      } = data as DocumentFromRPC;

      const documentSummary: DocumentSummary = {
        ...rest,
        thumbnail_url: first_image_path ? await this.supabaseService.getPresignedThumbnailUrl(first_image_path) : null,
      };
      return documentSummary;

    } catch (error) {
      this.logger.error('Failed to fetch item by id');
    }
  }

  async fetchDocumentById(
    documentId: string,
  ): Promise<Document | null> {
    try {
      const { data } = await this.supabase
        .rpc('get_document_by_id', { p_document_id: documentId })
        .maybeSingle();

      if (!data) {
        return null;
      }

      const { first_image_path, ...rest } = data as DocumentFromRPC;

      const document: Document = {
        ...rest,
        thumbnail_url: first_image_path ? await this.supabaseService.getPresignedThumbnailUrl(first_image_path) : null,
        images: await this.imageRepository.fetchImageSummariesByDocumentId(documentId),
      };

      return document;
    } catch (error) {
      this.logger.error('Failed to fetch item by id');
    }
  }

  async fetchDocumentsByUserId(
    userId: string,
    pagination: { from: number; to: number },
  ): Promise<{ documents: DocumentSummary[]; count: number }> {
    try {
      const { count } = await this.supabase.from(Tables.Documents).select('*', { count: 'exact', head: true }).eq('user_id', userId);

      const { data, error } = await this.supabase.rpc('get_documents_by_user_id', { p_user_id: userId, page_size: pagination.to, page_number: pagination.from });

      if (error) {
        throw new Error(error.message ?? 'Failed to fetch items by user id');
      }

      const documentsWithThumbnailUrls: DocumentSummary[] = await Promise.all(data.map(async (document) => {
        const { first_image_path, ...rest } = document;
        return {
          ...rest,
          thumbnail_url: first_image_path ? await this.supabaseService.getPresignedThumbnailUrl(first_image_path) : null,
        };
      }));

      return { documents: documentsWithThumbnailUrls, count };
    } catch (error) {
      this.logger.error('Failed to fetch item by user_id');
    }
  }

  async fetchDocumentsByIdsWithImages(
    documentIds: Array<string>,
  ): Promise<(DocumentExtra | null)[]> {
    // TODO: Probably update the rpc to take in an array of ids and return an array of documents.
    try {
      const documents: (Document | null)[] = await Promise.all(
        documentIds.map(id => this.fetchDocumentById(id))
      );

      // This is inefficient.
      const documentsWithImages: (DocumentExtra | null)[] = await Promise.all(documents.map(async (document) => {
        if (document) {
          const documentExtra: DocumentExtra = {
            ...document,
            images: await Promise.all(document.images.map(async (image) => {
              return await this.imageRepository.fetchImageById(image.id);
            }))
          }
          return documentExtra;
        }
        return null;
      }));

      return documentsWithImages;
    } catch (error) {
      this.logger.error('Failed to fetch item by id');
    }
  }

  async updateDocument(
    documentId: string,
    updateDocument: UpdateDocumentDto,
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from(Tables.Documents)
        .update(updateDocument)
        .eq('id', documentId);

      if (error) {
        throw new Error('Failed to update item');
      }
    } catch (error) {
      this.logger.error(error.message ?? 'Failed to update item');
    }
  }

  async deleteDocument(documentId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from(Tables.Documents)
        .delete()
        .eq('id', documentId);

      if (error) {
        throw new Error('Faied to delete item');
      }
    } catch (error) {
      this.logger.error(error.message ?? 'Failed to delete item');
    }
  }
}
