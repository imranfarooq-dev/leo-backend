import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { CreateImageDto } from '@/src/image/dto/create-image.dto';
import { SupabaseService } from '@/src/supabase/supabase.service';
import { DeleteImageDto } from '@/src/image/dto/delete-image.dto';
import { ImageRepository } from '@/src/database/repositiories/image.repository';
import { InsertImage } from '@/types/image';
import { DocumentRepository } from '@/src/database/repositiories/document.repository';
import { UpdateImageDto } from '@/src/image/dto/update-image.dto';
import { CreditsRepository } from '@/src/database/repositiories/credits.repository';
import { Image } from '@/types/image';

@Injectable()
export class ImageService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly imageRepository: ImageRepository,
    private readonly creditRepository: CreditsRepository,
    private readonly documentRepository: DocumentRepository,
  ) { }

  async create(
    { document_id }: CreateImageDto,
    files: Array<Express.Multer.File>,
    userId: string,
  ) {
    try {
      const document =
        await this.documentRepository.fetchDocumentById(document_id);

      if (!document) {
        throw new HttpException(
          'Document does not exist',
          HttpStatus.NOT_FOUND,
        );
      }

      if (!files.length) {
        throw new HttpException(
          'There are no images available to attach to the document.',
          HttpStatus.BAD_REQUEST,
        );
      }

      const credits = await this.creditRepository.fetchUserCredits(userId);
      const userDocuments =
        await this.documentRepository.fetchDocumentByUserId(userId);
      const images = await this.imageRepository.fetchImagesByDocumentIds(
        userDocuments.documents.map((document) => document.id),
      );

      if (images.length >= credits.image_limits) {
        throw new ForbiddenException(
          'You have reached the maximum limit of images you can upload',
        );
      }

      const uploadedImages = await this.supabaseService.uploadFiles(
        files,
        userId,
      );

      const imagesData: InsertImage[] = uploadedImages.map((uploadedImage) => ({
        document_id: document_id,
        image_name: uploadedImage.fileName,
        image_path: uploadedImage.path,
      }));

      // Get last image in document if exists
      const lastImage =
        await this.imageRepository.fetchLastDocumentImage(document_id);

      const newImages = await this.imageRepository.createImage(imagesData);

      // Prepare chain updates
      const chainUpdates = newImages.map((image, index) => ({
        id: image.id,
        document_id: image.document_id,
        image_name: image.image_name,
        image_path: image.image_path,
        next_image_id:
          index === newImages.length - 1 ? null : newImages[index + 1].id,
      }));

      if (lastImage) {
        chainUpdates.unshift({
          id: lastImage.id,
          document_id: lastImage.document_id,
          image_name: lastImage.image_name,
          image_path: lastImage.image_path,
          next_image_id: newImages[0].id,
        });
      }

      await this.imageRepository.updateImageOrder(chainUpdates);

      return newImages;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'An error occurred while creating the image record',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async update(updateImage: UpdateImageDto) {
    try {
      const imageExist = await this.imageRepository.fetchImageById(
        updateImage.image_id,
      );

      if (!imageExist) {
        throw new HttpException('Image does not exist', HttpStatus.NOT_FOUND);
      }

      return await this.imageRepository.updateImage(updateImage);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'An error occurred while updating the image record',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateOrder(oldIndex: number, newIndex: number, documentId: string) {
    try {
      const documentExist =
        await this.documentRepository.fetchDocumentById(documentId);

      if (!documentExist) {
        throw new HttpException(
          'Document does not exist',
          HttpStatus.NOT_FOUND,
        );
      }

      const images =
        await this.imageRepository.fetchImagesByDocumentId(documentId);

      if (!images.length) {
        throw new HttpException(
          'There are no images available to update the order',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Return early if indices are invalid or no change needed
      if (
        oldIndex === newIndex ||
        oldIndex < 0 ||
        newIndex < 0 ||
        oldIndex >= images.length ||
        newIndex >= images.length
      ) {
        return images;
      }

      // Reorder the array by:
      // 1. Create a copy of images arrays
      // 2. Remove image at oldIndex
      // 3. Insert that image at newIndex
      const reorderedImages = [...images];
      const [movedImage] = reorderedImages.splice(oldIndex, 1);
      reorderedImages.splice(newIndex, 0, movedImage);

      // Create an array of updates where each image points to the next one
      // Create updates array preserving all existing fields
      const updates: {
        id: string;
        document_id: string;
        image_name: string;
        image_path: string;
        next_image_id: string | null;
      }[] = reorderedImages.map((image, index) => ({
        id: image.id,
        document_id: image.document_id,
        image_name: image.image_name,
        image_path: image.image_path,
        next_image_id:
          index === reorderedImages.length - 1
            ? null
            : reorderedImages[index + 1].id,
      }));

      return await this.imageRepository.updateImageOrder(updates);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'An error occurred while updating the image order',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async delete(deleteImage: DeleteImageDto) {
    try {
      const image = await this.imageRepository.fetchImageById(deleteImage.id);

      if (!image) {
        throw new HttpException('Image does not exist', HttpStatus.NOT_FOUND);
      }

      if (image.document_id !== deleteImage.document_id) {
        throw new HttpException(
          'Image is not associated with the document',
          HttpStatus.CONFLICT,
        );
      }

      const documentImages = await this.imageRepository.fetchImagesByDocumentId(
        image.document_id,
      );
      if (!documentImages?.length) {
        throw new Error('No images found for the document');
      }

      // Find the index of image to delete
      const deleteIndex = documentImages.findIndex(
        (image) => image.id === deleteImage.id,
      );
      if (deleteIndex === -1) {
        throw new Error('Image not found in sequence');
      }

      // If it's not the last image, we need to update the previous image's next_image_id
      if (deleteIndex > 0) {
        const previousImage = documentImages[deleteIndex - 1];
        const nextImageId =
          deleteIndex < documentImages.length - 1
            ? documentImages[deleteIndex + 1].id
            : null;

        await this.imageRepository.updateImageNextId(
          previousImage.id,
          nextImageId,
        );
      }

      const deletedImages = await this.imageRepository.deleteImage(
        deleteImage.id,
      );

      await this.supabaseService.deleteFiles([image.image_path]);

      return deletedImages;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'An error occured while deleting the image record',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
