import { CreateDocumentDto } from '@/src/document/dto/create-document.dto'
import { UpdateDocumentDto } from '@/src/document/dto/update-document.dto'
import { Provides, Tables } from '@/src/shared/constant'
import { SupabaseService } from '@/src/supabase/supabase.service'
import { DocumentDB, Document } from '@/types/document'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class DocumentRepository {
  private readonly logger: Logger = new Logger(DocumentRepository.name);

  constructor(
    @Inject(Provides.Supabase) private readonly supabase: SupabaseClient,
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

  async fetchDocumentById(
    documentId: string,
  ): Promise<Document | null> {
    try {
      const { data, error } = await this.supabase.rpc('get_documents_by_ids', { p_document_ids: [documentId] });

      if (error) {
        throw new Error(error.message ?? 'Failed to fetch item by id');
      }

      if (!data) {
        return null;
      }

      const { images, ...rest } = data[0];

      const processedImages = images ? await Promise.all(images.map(async (image) => {
        const { image_path, ...imageRest } = image;
        return {
          ...imageRest,
          thumbnail_url: await this.supabaseService.getPresignedThumbnailUrl(image_path),
          image_url: await this.supabaseService.getPresignedUrl(image_path),
        };
      })) : [];

      const document: Document = {
        ...rest,
        images: processedImages,
      };

      return document;
    } catch (error) {
      this.logger.error('Failed to fetch item by id');
    }
  }

  async fetchDocumentsByUserId(
    userId: string,
    pagination: { page_size: number; page_number: number },
  ): Promise<{ documents: Document[]; count: number }> {
    try {
      const [countResult, documentsResult] = await Promise.all([
        this.supabase
          .from(Tables.Documents)
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId),
        this.supabase
          .rpc('get_documents_by_user_id', {
            p_user_id: userId,
            page_size: pagination.page_size,
            page_number: pagination.page_number,
          }),
      ]);

      if (countResult.error || documentsResult.error) {
        throw new Error(countResult.error?.message ?? documentsResult.error?.message ?? 'Failed to fetch items by user id');
      }

      if (!documentsResult.data || documentsResult.data.length === 0) {
        return { documents: [], count: countResult.count };
      }

      const documentsWithThumbnailUrls: Document[] = await Promise.all(documentsResult.data.map(async (document) => {
        const { images, ...rest } = document;

        const processedImages = images ? await Promise.all(images.map(async (image) => {
          const { image_path, ...imageRest } = image;
          return {
            ...imageRest,
            thumbnail_url: image_path ? await this.supabaseService.getPresignedThumbnailUrl(image_path) : null,
          };
        })) : [];

        return {
          ...rest,
          images: processedImages,
        };
      }));
      return { documents: documentsWithThumbnailUrls, count: countResult.count };
    } catch (error) {
      this.logger.error('Failed to fetch items by user_id');
    }
  }

  async fetchDocumentsByIdsWithImages(
    documentIds: Array<string>,
  ): Promise<Document[]> {
    try {
      const { data, error } = await this.supabase.rpc('get_documents_by_ids', { p_document_ids: documentIds });

      if (error) {
        throw new Error(error.message ?? 'Failed to fetch items by id');
      }

      if (!data) {
        return [];
      }

      const documentsWithImages: Document[] = await Promise.all(data.map(async (document) => {
        const { images, ...rest } = document;

        const processedImages = images ? await Promise.all(images.map(async (image) => {
          const { image_path, ...imageRest } = image;
          return {
            ...imageRest,
            thumbnail_url: await this.supabaseService.getPresignedThumbnailUrl(image_path),
            image_url: await this.supabaseService.getPresignedUrl(image_path),
          };
        })) : [];

        return {
          ...rest,
          images: processedImages,
        };
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

  async fetchDocumentDBById(documentId: string): Promise<DocumentDB | null> {
    try {
      const { data, error } = await this.supabase
        .from(Tables.Documents)
        .select('*')
        .eq('id', documentId)
        .maybeSingle();

      if (error) {
        throw new Error(error.message ?? 'Failed to fetch item by id');
      }

      if (!data) {
        return null;
      }

      return data;
    } catch (error) {
      this.logger.error(error.message ?? 'Failed to fetch item by id');
    }
  }
}
