import { CreateDocumentDto } from '@/src/document/dto/create-document.dto'
import { UpdateDocumentDto } from '@/src/document/dto/update-document.dto'
import { Provides, Tables } from '@/src/shared/constant'
import { SupabaseService } from '@/src/supabase/supabase.service'
import { Document, DocumentFromRPC, DocumentSummary } from '@/types/document'
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
  ): Promise<DocumentSummary> {
    try {
      // Delete list_ids from object
      delete createDocument.list_ids;

      const { data, error } = await this.supabase
        .from(Tables.Documents)
        .insert({ ...createDocument, user_id: userId })
        .select("id")
        .single();

      const newDocument: DocumentSummary = await this.fetchDocumentById(data.id);

      if (error) {
        throw new Error(error.message ?? 'Failed to create document.');
      }

      return newDocument;
    } catch (error) {
      this.logger.error(error.message ?? 'Failed to create document');
    }
  }

  async fetchDocumentSummaryById(
    documentId: string,
  ): Promise<DocumentSummary | null> {
    try {
      const { data } = await this.supabase
        .rpc('get_document_by_id', { document_id: documentId })
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
      this.logger.error('Failed to fetch document by id');
    }
  }

  async fetchDocumentById(
    documentId: string,
  ): Promise<Document | null> {
    try {
      const { data } = await this.supabase
        .rpc('get_document_by_id', { document_id: documentId })
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
      this.logger.error('Failed to fetch document by id');
    }
  }

  async fetchDocumentsByUserId(
    userId: string,
    pagination: { from: number; to: number },
  ): Promise<{ documents: DocumentSummary[]; count: number }> {
    try {
      const { count } = await this.supabase.from(Tables.Documents).select('*', { count: 'exact', head: true }).eq('user_id', userId);

      const { data, error } = await this.supabase.rpc('get_documents_by_user_id', { user_id: userId, page_size: pagination.to, page_number: pagination.from });

      if (error) {
        throw new Error(error.message ?? 'Failed to fetch documents by user id');
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
      this.logger.error('Failed to fetch document by user_id');
    }
  }

  // async fetchDocumentsByIds(
  //   documentIds: Array<string>,
  //   includeImageTranscriptionAndNotes: boolean = false,
  //   attributes?: keyof Image,
  // ): Promise<DocumentDB[] | undefined> {
  //   try {
  //     let query = this.supabase
  //       .from(Tables.Documents)
  //       .select(
  //         `
  //       *,
  //       ${includeImageTranscriptionAndNotes
  //           ? `
  //       images (
  //         *,
  //         transcriptions (
  //           id,
  //           current_transcription_text,
  //           ai_transcription_text,
  //           transcription_status,
  //           image_id,
  //           created_at,
  //           updated_at
  //         ),
  //         notes (
  //           id,
  //           notes_text,
  //           image_id,
  //           created_at,
  //           updated_at
  //         )
  //       )
  //       `
  //           : ''
  //         }`,
  //       )
  //       .in('id', documentIds);

  //     if (attributes) {
  //       query = this.supabase
  //         .from(Tables.Documents)
  //         .select(
  //           `
  //         ${attributes},
  //         ${includeImageTranscriptionAndNotes
  //             ? `
  //         images (
  //           *,
  //           transcriptions (
  //             id,
  //             current_transcription_text,
  //             ai_transcription_text,
  //             transcription_status,
  //             image_id,
  //             created_at,
  //             updated_at
  //           ),
  //           notes (
  //             id,
  //             notes_text,
  //             image_id,
  //             created_at,
  //             updated_at
  //           )
  //         )
  //         `
  //             : ''
  //           }`,
  //         )
  //         .in('id', documentIds);
  //     }

  //     const { data, error } = await query;

  //     if (error) {
  //       this.logger.error('Failed to fetch documents', { error });
  //       throw new Error('Failed to fetch documents');
  //     }

  //     if (includeImageTranscriptionAndNotes) {
  //       // Type assertion since we know the structure when includeImageTranscriptionAndNotes is true
  //       const documentsWithImages = (data as unknown) as (Document & { images: Image[] })[];
  //       const documentsWithUrlImages = await Promise.all(
  //         documentsWithImages.map(async (doc) => {
  //           const imagesWithUrls = await this.imageRepository.addPresignedUrlsToImages(doc.images);
  //           return { ...doc, images: imagesWithUrls };
  //         })
  //       );
  //       return documentsWithUrlImages;
  //     }

  //     return (data as unknown) as Document[];
  //   } catch (error) {
  //     this.logger.error('Failed to fetch document by id');
  //   }
  // }

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
        throw new Error('Failed to update document}');
      }
    } catch (error) {
      this.logger.error(error.message ?? 'Failed to update document');
    }
  }

  async deleteDocument(documentId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from(Tables.Documents)
        .delete()
        .eq('id', documentId);

      if (error) {
        throw new Error('Faied to delete document.');
      }
    } catch (error) {
      this.logger.error(error.message ?? 'Failed to delete document');
    }
  }
}
