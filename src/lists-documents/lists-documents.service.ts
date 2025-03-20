import { DocumentRepository } from '@/src/database/repositiories/document.repository';
import { ListRespository } from '@/src/database/repositiories/list.respository';
import { ListsDocumentsRepository } from '@/src/database/repositiories/lists-documents.repository';
import { FetchUserListDocumentDto } from '@/src/lists-documents/dto/fetch-user-list-document.dto';
import { UpdateListDocumentDto } from '@/src/lists-documents/dto/update-list-document.dto';
import { DocumentDB, Document } from '@/types/document';
import { ListDB, ListSummary } from '@/types/list';
import { User } from '@clerk/clerk-sdk-node';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PRIVILEGED_USER_IDS } from '@/src/shared/constant';

@Injectable()
export class ListsDocumentsService {
  constructor(
    private readonly listRepository: ListRespository,
    private readonly listsDocumentsRepository: ListsDocumentsRepository,
    private readonly documentRepository: DocumentRepository,
  ) {}

  async update(
    document_id: string,
    updateListDocumentDto: UpdateListDocumentDto,
    user: User,
  ): Promise<void> {
    try {
      const { add_list_ids, remove_list_ids } = updateListDocumentDto;

      const documentExist =
        await this.documentRepository.fetchDocumentDBById(document_id);

      if (!documentExist) {
        throw new HttpException('Item does not exist', HttpStatus.NOT_FOUND);
      }

      if (
        documentExist.user_id !== user.id &&
        !PRIVILEGED_USER_IDS.includes(user.id)
      ) {
        throw new HttpException(
          'Item does not belong to user',
          HttpStatus.FORBIDDEN,
        );
      }

      const allPromises = [];

      if (add_list_ids) {
        const addPromises = add_list_ids.map(async (list_id) => {
          await this.listsDocumentsRepository.createListDocument(
            list_id,
            document_id,
          );
        });
        allPromises.push(...addPromises);
      }

      if (remove_list_ids) {
        const removePromises = remove_list_ids.map(async (list_id) => {
          await this.listsDocumentsRepository.deleteListDocument(
            list_id,
            document_id,
          );
        });
        allPromises.push(...removePromises);
      }

      await Promise.all(allPromises);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'An error occurred while fetching the lists',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async fetchUserDocumentsByList(
    list_id: string,
    user: User,
    { page, limit }: FetchUserListDocumentDto,
  ): Promise<{
    documents: Document[];
    currentPage: number;
    totalPages: number;
    totalDocuments: number;
  }> {
    try {
      const list: ListDB | null =
        await this.listRepository.fetchListById(list_id);

      if (!list) {
        throw new HttpException('List does not exist', HttpStatus.NOT_FOUND);
      }

      if (list.user_id !== user.id && !PRIVILEGED_USER_IDS.includes(user.id)) {
        throw new HttpException(
          'List does not belong to user',
          HttpStatus.FORBIDDEN,
        );
      }

      const { documents, count } =
        await this.listsDocumentsRepository.fetchDocumentsForList(list_id, {
          page_size: limit,
          page_number: page,
        });

      const totalPages: number = Math.ceil(count / limit);

      return {
        documents,
        currentPage: page,
        totalPages,
        totalDocuments: count,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'An error occurred while fetching the items',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async fetchDocumentLists(
    user: User,
    document_id: string,
  ): Promise<ListSummary[]> {
    try {
      const document: DocumentDB | null =
        await this.documentRepository.fetchDocumentDBById(document_id);

      if (!document) {
        throw new HttpException('Item does not exist', HttpStatus.NOT_FOUND);
      }

      if (
        document.user_id !== user.id &&
        !PRIVILEGED_USER_IDS.includes(user.id)
      ) {
        throw new HttpException(
          'Item does not belong to user',
          HttpStatus.FORBIDDEN,
        );
      }

      return await this.listsDocumentsRepository.fetchListsByDocumentId(
        document_id,
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'An error occurred while fetching the items',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
