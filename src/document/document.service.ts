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
import { Image } from '@/types/image';
import { UserRepository } from '@/src/database/repositiories/user.repository';

@Injectable()
export class DocumentService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly imageService: ImageService,
    private readonly imageRepository: ImageRepository,
    private readonly documentRepository: DocumentRepository,
    private readonly listsDocumentsRepository: ListsDocumentsRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async fetchDocumentsByUser(
    user: User,
    { page, limit }: FetchUserDocumentDto,
  ) {
    try {
      const offset: number = page * limit;
      const size: number = offset + limit - 1;

      const userDocuments = await this.documentRepository.fetchDocumentByUserId(
        user.id,
        {
          from: offset,
          to: size,
        },
      );

      const totalPages: number = Math.ceil(userDocuments.count / limit);

      if (!userDocuments.documents) {
        return {
          documents: [],
          currentPage: page,
          totalPages,
          totalDocuments: userDocuments.count,
        };
      }

      const documents = await Promise.all(
        userDocuments.documents.map(async (document) => {
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
        totalDocuments: userDocuments.count,
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

  async fetchById(user: User, fetchDocument: FetchDocumentDto) {
    try {
      const document = await this.documentRepository.fetchDocumentById(
        fetchDocument.id,
      );

      if (!document) {
        throw new HttpException(
          'Document does not exist',
          HttpStatus.NOT_FOUND,
        );
      }

      if (document.user_id !== user.id) {
        throw new HttpException(
          'You are not authorized to view this document',
          HttpStatus.UNAUTHORIZED,
        );
      }

      const images = await this.imageRepository.fetchImagesByDocumentId(
        document.id,
        true,
      );

      return { ...document, images };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'An error occured while fetching document',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async create(
    user: User,
    createDocument: CreateDocumentDto,
    files: Array<Express.Multer.File>,
  ) {
    try {
      const documentData = await this.documentRepository.createDocument(
        user.id,
        { ...createDocument },
      );

      if (createDocument?.list_ids?.length) {
        const addDocumentListPromises = createDocument.list_ids.map(
          async (list_id) =>
            await this.listsDocumentsRepository.createListDocument(
              parseInt(list_id),
              documentData.id,
            ),
        );

        await Promise.all(addDocumentListPromises);
      }

      const imageData = await this.imageService.create(
        { document_id: documentData.id },
        files,
        user.id,
      );

      // Update user should_fetch_document to true after creating a document for the user
      await this.userRepository.updateUser(user.id, {
        should_fetch_document: true,
      });

      return {
        document: documentData,
        images: imageData,
      };
    } catch (error) {
      throw new HttpException(
        'An error occurred while creating the document record',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async delete(deleteDocument: DeleteDocumentDto) {
    try {
      const documentExist = await this.documentRepository.fetchDocumentById(
        deleteDocument.id,
      );

      if (!documentExist) {
        throw new HttpException(
          'Document does not exist',
          HttpStatus.NOT_FOUND,
        );
      }

      const deletedImages = await this.deleteImagesFromStorage(
        deleteDocument.id,
      );

      const deletedDocument = await this.documentRepository.deleteDocument(
        deleteDocument.id,
      );

      return {
        document: deletedDocument,
        images: deletedImages,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'An error occurred while deleting the document record',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async update(document_id: number, updateDocument: UpdateDocumentDto) {
    try {
      const documentExist =
        await this.documentRepository.fetchDocumentById(document_id);

      if (!documentExist) {
        throw new HttpException(
          'Document does not exist',
          HttpStatus.NOT_FOUND,
        );
      }

      return await this.documentRepository.updateDocument(
        document_id,
        updateDocument,
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'An error occured while updateing the document',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async deleteImagesFromStorage(documentId: number) {
    const images: Image[] = await this.imageRepository.fetchImagesByDocumentId(
      documentId,
      false,
    );

    const imagePaths: string[] = images.map((image: Image) => image.image_path);

    return imagePaths.length
      ? await this.supabaseService.deleteFiles(imagePaths)
      : null;
  }
}
