import { Inject, Logger } from '@nestjs/common';
import { DBFunctions, Provides, Tables } from '@/src/shared/constant';
import { SupabaseClient } from '@supabase/supabase-js';
import { ListDocument } from '@/types/list-document';
import { Document } from '@/types/document';

export class ListsDocumentsRepository {
  private readonly logger: Logger = new Logger(ListsDocumentsRepository.name);
  constructor(
    @Inject(Provides.Supabase) private readonly supabase: SupabaseClient,
  ) {}

  async createListDocument(list_id: number, document_id: number) {
    try {
      const { data, error } = await this.supabase
        .from(Tables.ListsDocuments)
        .insert({ list_id, document_id })
        .select()
        .maybeSingle();

      if (error) {
        throw new Error(
          error.message ?? 'Failed to create document and list relation',
        );
      }

      return data;
    } catch (error) {
      this.logger.error(
        error.message ?? 'Failed to create document and list relation',
      );
    }
  }

  async fetchListDocumentById(
    list_id: number,
    document_id: number,
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

  async fetchListChild(list_id: number) {
    try {
      const { data, error } = await this.supabase.rpc(
        DBFunctions.getListWithChildren,
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

  async fetchDocumentsForLists(
    lists_ids: number[],
    pagination: { from: number; to: number },
  ): Promise<{ documents: Document[]; count: number }> {
    try {
      const { data: documents } = await this.supabase.rpc(
        DBFunctions.fetchDocumentsForLists,
        { list_ids: lists_ids, _from: pagination.from, _to: pagination.to },
      );

      const totalCount = documents.length > 0 ? documents[0].total_count : 0;

      const withoutTotalCount = documents.map((document) => {
        delete document.total_count;
        return document;
      });

      return { documents: withoutTotalCount, count: totalCount };
    } catch (error) {
      this.logger.error(error.message ?? 'Failed to fetch documents for lists');
    }
  }

  async fetchListsByDocumentId(document_id: number) {
    try {
      const { data } = await this.supabase
        .from(Tables.ListsDocuments)
        .select('lists(*)')
        .eq('document_id', document_id);

      return data.map(({ lists }) => lists);
    } catch (error) {
      this.logger.error(error.message ?? 'Failed to fetch document lists');
    }
  }

  async deleteListDocument(list_id: number, document_id: number) {
    try {
      const { data } = await this.supabase
        .from(Tables.ListsDocuments)
        .delete()
        .eq('list_id', list_id)
        .eq('document_id', document_id)
        .select()
        .maybeSingle();

      return data;
    } catch (error) {
      this.logger.error(error.message ?? 'Failed to remove document from list');
    }
  }
}
