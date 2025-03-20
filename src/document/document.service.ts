import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateDocumentDto } from '@/src/document/dto/create-document.dto';
import { SupabaseService } from '@/src/supabase/supabase.service';
import { DeleteDocumentDto } from '@/src/document/dto/delete-document.dto';
import { FetchDocumentDto } from '@/src/document/dto/fetch-document.dto';
import { FetchUserDocumentDto } from '@/src/document/dto/fetch-user-document.dto';
import { UpdateDocumentDto } from '@/src/document/dto/update-document.dto';
import { ImageRepository } from '@/src/database/repositiories/image.repository';
import { DocumentRepository } from '@/src/database/repositiories/document.repository';
import { ImageService } from '@/src/image/image.service';
import { User } from '@clerk/clerk-sdk-node';
import { ListsDocumentsRepository } from '@/src/database/repositiories/lists-documents.repository';
import { DocumentDB, Document } from '@/types/document';
import {
  ImageStoragePath,
  PRIVILEGED_USER_IDS,
  ThumbnailStoragePath,
} from '@/src/shared/constant';

@Injectable()
export class DocumentService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly imageService: ImageService,
    private readonly imageRepository: ImageRepository,
    private readonly documentRepository: DocumentRepository,
    private readonly listsDocumentsRepository: ListsDocumentsRepository,
  ) {}

  async fetchDocumentsByUser(
    user: User,
    { page, limit }: FetchUserDocumentDto,
  ): Promise<{
    documents: Document[];
    currentPage: number;
    totalPages: number;
    totalDocuments: number;
  }> {
    try {
      const userDocuments: { documents: Document[]; count: number } =
        await this.documentRepository.fetchDocumentsByUserId(user.id, {
          page_size: limit,
          page_number: page,
        });
      const totalPages: number = Math.ceil(userDocuments.count / limit);

      if (!userDocuments.documents) {
        return {
          documents: [],
          currentPage: page,
          totalPages,
          totalDocuments: userDocuments.count,
        };
      }

      return {
        documents: userDocuments.documents,
        currentPage: page,
        totalPages,
        totalDocuments: userDocuments.count,
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

  async fetchById(
    user: User,
    fetchDocument: FetchDocumentDto,
  ): Promise<Document> {
    try {
      const document: Document | null =
        await this.documentRepository.fetchDocumentById(fetchDocument.id);

      if (!document) {
        throw new HttpException('Item does not exist', HttpStatus.NOT_FOUND);
      }

      if (
        document.user_id !== user.id &&
        !PRIVILEGED_USER_IDS.includes(user.id)
      ) {
        throw new HttpException(
          'You are not authorized to view this item',
          HttpStatus.UNAUTHORIZED,
        );
      }

      return document;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'An error occured while fetching item',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async create(
    user: User,
    createDocument: CreateDocumentDto,
    files: Array<Express.Multer.File>,
  ): Promise<Document | null> {
    try {
      const documentId = await this.documentRepository.createDocument(user.id, {
        ...createDocument,
      });

      if (createDocument?.list_ids?.length) {
        const addDocumentListPromises = createDocument.list_ids.map(
          async (list_id) =>
            await this.listsDocumentsRepository.createListDocument(
              list_id,
              documentId,
            ),
        );

        await Promise.all(addDocumentListPromises);
      }

      await this.imageService.create(
        { document_id: documentId },
        files,
        user.id,
      );

      return await this.documentRepository.fetchDocumentById(documentId);
    } catch (error) {
      throw new HttpException(
        'An error occurred while creating the item: ' + error.message,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async delete(user: User, deleteDocument: DeleteDocumentDto): Promise<void> {
    // TODO: User IDs
    try {
      const document = await this.documentRepository.fetchDocumentById(
        deleteDocument.id,
      );

      if (!document) {
        throw new HttpException('Item does not exist', HttpStatus.NOT_FOUND);
      }

      if (
        document.user_id !== user.id &&
        !PRIVILEGED_USER_IDS.includes(user.id)
      ) {
        throw new HttpException(
          'You are not authorized to delete this item',
          HttpStatus.UNAUTHORIZED,
        );
      }

      // FIXME: Images are not deleted from dbs (we should soft delete anyway).
      await this.deleteImagesFromStorage(deleteDocument.id);
      await this.documentRepository.deleteDocument(deleteDocument.id);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'An error occurred while deleting the item',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async update(
    user: User,
    document_id: string,
    updateDocument: UpdateDocumentDto,
  ): Promise<void> {
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
          'You are not authorized to update this item',
          HttpStatus.UNAUTHORIZED,
        );
      }

      await this.documentRepository.updateDocument(document_id, updateDocument);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'An error occured while updating the item',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async deleteImagesFromStorage(documentId: string): Promise<void> {
    const imageFilenames: string[] =
      await this.imageRepository.fetchImageFilenamesByDocumentId(documentId);

    const fullImagePaths = imageFilenames.map(
      (filename) => `${ImageStoragePath}/${filename}`,
    );
    const thumbnailPaths = imageFilenames.map(
      (filename) => `${ThumbnailStoragePath}/${filename}`,
    );

    if (fullImagePaths.length) {
      await this.supabaseService.deleteFiles(fullImagePaths);
    }

    if (thumbnailPaths.length) {
      await this.supabaseService.deleteFiles(thumbnailPaths);
    }
  }
}
