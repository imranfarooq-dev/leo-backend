import { CreditsRepository } from '@/src/database/repositiories/credits.repository'
import { DocumentRepository } from '@/src/database/repositiories/document.repository'
import { ImageRepository } from '@/src/database/repositiories/image.repository'
import { CreateImageDto } from '@/src/image/dto/create-image.dto'
import { DeleteImageDto } from '@/src/image/dto/delete-image.dto'
import { UpdateImageDto } from '@/src/image/dto/update-image.dto'
import { PdfService } from '@/src/pdf/pdf.service'
import { SupabaseService } from '@/src/supabase/supabase.service'
import { ImageOrder, InsertImage } from '@/types/image'
import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common'
import { Readable } from 'stream'

@Injectable()
export class ImageService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly imageRepository: ImageRepository,
    private readonly creditRepository: CreditsRepository,
    private readonly documentRepository: DocumentRepository,
    private readonly pdfService: PdfService,
  ) { }

  async create(
    { document_id }: CreateImageDto,
    files: Array<Express.Multer.File>,
    userId: string,
  ) {
    try {
      // Process files, separating PDFs and images
      const processedFiles: Express.Multer.File[] = [];

      for (const file of files) {
        if (file.mimetype === 'application/pdf') {
          // Extract images from PDF
          const pdfImages = await this.pdfService.extractImagesFromPdf(file.buffer);

          // Convert extracted images to proper Multer File objects
          const pdfImageFiles = pdfImages.map((buffer, index) => {
            // Detect if the buffer is a JPEG by checking its magic numbers
            const isJpeg = buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
            const extension = isJpeg ? 'jpg' : 'png';
            const mimeType = isJpeg ? 'image/jpeg' : 'image/png';

            const stream = new Readable();
            stream.push(buffer);
            stream.push(null);

            const multerFile: Express.Multer.File = {
              buffer,
              originalname: `${file.originalname.replace('.pdf', '')}_page_${index + 1}.${extension}`,
              mimetype: mimeType,
              fieldname: file.fieldname,
              encoding: '7bit',
              size: buffer.length,
              stream: stream,
              destination: file.destination,
              filename: `${file.originalname.replace('.pdf', '')}_page_${index + 1}.${extension}`,
              path: file.path
            };

            return multerFile;
          });

          processedFiles.push(...pdfImageFiles);
        } else {
          processedFiles.push(file);
        }
      }

      const document =
        await this.documentRepository.fetchDocumentById(document_id);

      if (!document) {
        throw new HttpException(
          'Document does not exist',
          HttpStatus.NOT_FOUND,
        );
      }

      if (!processedFiles.length) {
        throw new HttpException(
          'There are no images available to attach to the document.',
          HttpStatus.BAD_REQUEST,
        );
      }

      const credits = await this.creditRepository.fetchUserCredits(userId);
      const numImages: number = await this.imageRepository.countImagesByUserId(userId);

      if (numImages >= credits.image_limits) {
        throw new ForbiddenException(
          'You have reached the maximum limit of images you can upload',
        );
      }

      const uploadedImages = await this.supabaseService.uploadFiles(
        processedFiles,
        userId,
      );

      // Get highest order number for the document
      const lastImage = await this.imageRepository.fetchLastDocumentImage(document_id);
      const startOrder = lastImage ? lastImage.order + 1 : 1;

      const imagesData: InsertImage[] = uploadedImages.map((uploadedImage, index) => ({
        document_id: document_id,
        image_name: uploadedImage.fileName,
        image_path: uploadedImage.path,
        order: startOrder + index,
      }));

      const newImages = await this.imageRepository.createImage(imagesData);
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

      const images = await this.imageRepository.fetchImagesByDocumentId(documentId);

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

      // Reorder the array
      const reorderedImages = [...images];
      const [movedImage] = reorderedImages.splice(oldIndex, 1);
      reorderedImages.splice(newIndex, 0, movedImage);

      // Update order numbers for all affected images
      const updates = reorderedImages.map((image, index) => ({
        id: image.id,
        document_id: image.document_id,
        image_name: image.image_name,
        image_path: image.image_path,
        order: index + 1,
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

  async delete(deleteImage: DeleteImageDto): Promise<ImageOrder[]> {
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

      // Delete the image
      const siblingImageOrders = await this.imageRepository.deleteImage(
        deleteImage.id,
      );

      await this.supabaseService.deleteFiles([image.image_path]);

      return siblingImageOrders;
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
