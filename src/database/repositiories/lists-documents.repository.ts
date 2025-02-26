import { Provides, Tables } from '@/src/shared/constant'
import { SupabaseService } from '@/src/supabase/supabase.service'
import { DocumentWithImageSummaries } from '@/types/document'
import { ListSummary } from '@/types/list'
import { ListDocument } from '@/types/list-document'
import { Inject, Logger } from '@nestjs/common'
import { SupabaseClient } from '@supabase/supabase-js'

export class ListsDocumentsRepository {
  private readonly logger: Logger = new Logger(ListsDocumentsRepository.name);
  constructor(
    @Inject(Provides.Supabase) private readonly supabase: SupabaseClient,
    private readonly supabaseService: SupabaseService,
  ) { }

  async createListDocument(list_id: string, document_id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from(Tables.ListsDocuments)
        .insert({ list_id, document_id })

      if (error) {
        throw new Error(
          error.message ?? 'Failed to create document and list relation',
        );
      }
    } catch (error) {
      this.logger.error(
        error.message ?? 'Failed to create document and list relation',
      );
    }
  }

  async fetchListDocumentById(
    list_id: string,
    document_id: string,
  ): Promise<ListDocument | null> {
    try {
      const { data } = await this.supabase
        .from(Tables.ListsDocuments)
        .select()
        .eq('list_id', list_id)
        .eq('document_id', document_id)
        .maybeSingle();

      return data;
    } catch (error) {
      this.logger.error(
        error.message ?? 'Failed to fetch document list association',
      );
    }
  }

  async fetchListChild(list_id: string) {
    try {
      const { data, error } = await this.supabase.rpc(
        "get_list_with_children",
        { _id: list_id },
      );

      if (error) {
        throw new Error(error.message ?? 'Failed to fetch list children');
      }

      return data;
    } catch (error) {
      this.logger.error(error.message ?? 'Failed to fetch list children');
    }
  }

  async fetchDocumentsForList(
    list_id: string,
    pagination: { from: number; to: number },
  ): Promise<{ documents: DocumentWithImageSummaries[]; count: number }> {
    try {
      const { count } = await this.supabase.from(Tables.ListsDocuments).select('*', { count: 'exact', head: true }).eq('list_id', list_id);

      const { data, error } = await this.supabase.rpc('get_documents_by_list_id', { p_list_id: list_id, page_size: pagination.to, page_number: pagination.from });

      const documentsWithThumbnailUrls: DocumentWithImageSummaries[] = await Promise.all(data.map(async (document) => {
        const { first_image_path, ...rest } = document;
        return {
          ...rest,
          thumbnail_url: first_image_path ? await this.supabaseService.getPresignedThumbnailUrl(first_image_path) : null,
        };
      }));

      if (error) {
        throw new Error(error.message ?? 'Failed to fetch documents for list');
      }

      return { documents: documentsWithThumbnailUrls, count };
    } catch (error) {
      this.logger.error(error.message ?? 'Failed to fetch documents for lists');
    }
  }

  async fetchListsByDocumentId(document_id: string): Promise<ListSummary[] | null> {
    try {
      const { data, error } = await this.supabase
        .from(Tables.ListsDocuments)
        .select('lists(id, user_id, list_name)')
        .eq('document_id', document_id) as any;

      if (error) {
        throw new Error(error.message ?? 'Failed to fetch document lists');
      }

      return data.map(({ lists: { id, user_id, list_name } }) => ({
        id,
        user_id,
        list_name
      }));
    } catch (error) {
      this.logger.error(error.message ?? 'Failed to fetch document lists');
    }
  }

  async deleteListDocument(list_id: string, document_id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from(Tables.ListsDocuments)
        .delete()
        .eq('list_id', list_id)
        .eq('document_id', document_id)

      if (error) {
        throw new Error(error.message ?? 'Failed to remove document from list');
      }
    } catch (error) {
      this.logger.error(error.message ?? 'Failed to remove document from list');
    }
  }
}
