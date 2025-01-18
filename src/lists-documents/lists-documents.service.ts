import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { UpdateListDocumentDto } from '@/src/lists-documents/dto/update-list-document.dto';
import { ListsDocumentsRepository } from '@/src/database/repositiories/lists-documents.repository';
import { DocumentRepository } from '@/src/database/repositiories/document.repository';
import { FetchUserListDocumentDto } from '@/src/lists-documents/dto/fetch-user-list-document.dto';
import { ListRespository } from '@/src/database/repositiories/list.respository';
import { ImageRepository } from '@/src/database/repositiories/image.repository';
import { Document } from '@/types/document';

@Injectable()
export class ListsDocumentsService {
  constructor(
    private readonly listRepository: ListRespository,
    private readonly imageRepository: ImageRepository,
    private readonly listsDocumentsRepository: ListsDocumentsRepository,
    private readonly documentRepository: DocumentRepository,
  ) {}

  async update(updateListDocumentDto: UpdateListDocumentDto) {
    try {
      let documentAdded, documentRemoved;
      const { document_id, add_list_ids, remove_list_ids } =
        updateListDocumentDto;

      const documentExist =
        await this.documentRepository.fetchDocumentById(document_id);

      if (!documentExist) {
        throw new HttpException(
          'Document does not exist',
          HttpStatus.NOT_FOUND,
        );
      }

      if (add_list_ids) {
        const linkPromises = add_list_ids.map(async (list_id) => {
          const list = await this.listsDocumentsRepository.createListDocument(
            list_id,
            document_id,
          );
          return { list_id: list_id, created: !!list };
        });

        documentAdded = await Promise.all(linkPromises);
      }

      if (remove_list_ids) {
        const linkPromises = remove_list_ids.map(async (list_id) => {
          const list = await this.listsDocumentsRepository.deleteListDocument(
            list_id,
            document_id,
          );
          return { list_id: list_id, deleted: !!list };
        });

        documentRemoved = await Promise.all(linkPromises);
      }

      return { documentAdded, documentRemoved };
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

  async fetchUserDocumentsByList({
    page,
    limit,
    list_id,
  }: FetchUserListDocumentDto) {
    try {
      const offset: number = page * limit;
      const size: number = offset + limit - 1;

      // Check if list exist
      const listExist = await this.listRepository.fetchListById(list_id);

      if (!listExist) {
        throw new HttpException('List does not exist', HttpStatus.NOT_FOUND);
      }

      // Fetch list documents
      const listDocuments =
        await this.listsDocumentsRepository.fetchDocumentsForLists([list_id], {
          from: offset,
          to: size,
        });

      // Calculate total pages
      const totalPages: number = Math.ceil(listDocuments.count / limit);

      if (!listDocuments.documents.length) {
        return {
          documents: [],
          currentPage: page,
          totalPages,
          totalDocuments: listDocuments.count,
        };
      }

      // Fetch Document Images and transcription
      const documents = await Promise.all(
        listDocuments.documents.map(async (document: Document) => {
          const images = await this.imageRepository.fetchImagesByDocumentId(
            document.id,
            true,
          );
          return { ...document, images };
        }),
      );

      return {
        documents,
        currentPage: page,
        totalPages,
        totalDocuments: listDocuments.count,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'An error occurred while fetching the document records',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async fetchDocumentLists(document_id: number) {
    try {
      const documentExist =
        await this.documentRepository.fetchDocumentById(document_id);

      if (!documentExist) {
        throw new HttpException(
          'Document does not exist',
          HttpStatus.NOT_FOUND,
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
        'An error occurred while fetching the document records',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
