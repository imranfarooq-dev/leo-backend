import { CreditsRepository } from '@/src/database/repositiories/credits.repository'
import { DocumentRepository } from '@/src/database/repositiories/document.repository'
import { ImageRepository } from '@/src/database/repositiories/image.repository'
import { CreateImageDto } from '@/src/image/dto/create-image.dto'
import { UpdateImageDto } from '@/src/image/dto/update-image.dto'
import { PdfService } from '@/src/pdf/pdf.service'
import { SupabaseService } from '@/src/supabase/supabase.service'
import { DocumentSummary } from '@/types/document'
import { ImageDB, ImageOrder, ImageSummary, InsertImage, Image } from '@/types/image'
import { User } from '@clerk/clerk-sdk-node'
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

  async getImage(imageId: string): Promise<Image | null> {
    try {
      const image: Image | null = await this.imageRepository.fetchImageById(imageId);

      if (!image) {
        throw new HttpException('Image does not exist', HttpStatus.NOT_FOUND);
      }

      return image;
    } catch (error) {
      throw new HttpException(
        'An error occurred while fetching the image',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async create(
    { document_id }: CreateImageDto,
    files: Array<Express.Multer.File>,
    userId: string,
  ): Promise<ImageSummary[]> {
    try {
      const documentSummary: DocumentSummary | null = await this.documentRepository.fetchDocumentSummaryById(document_id);

      if (!documentSummary) {
        throw new HttpException(
          'Document does not exist',
          HttpStatus.NOT_FOUND,
        );
      }

      if (documentSummary.user_id !== userId) {
        throw new HttpException(
          'Document does not belong to user',
          HttpStatus.FORBIDDEN,
        );
      }

      // Process files, separating PDFs and images
      const processedFiles: Express.Multer.File[] = [];

      for (const file of files) {
        if (file.mimetype === 'application/pdf') {
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

      if (!processedFiles.length) {
        throw new HttpException(
          'There are no images available to attach to the document.',
          HttpStatus.BAD_REQUEST,
        );
      }

      const credits = await this.creditRepository.fetchUserCredits(userId);
      const numImages: number = await this.imageRepository.countImagesByUserId(userId);

      if (numImages + processedFiles.length > credits.image_limits) {
        throw new ForbiddenException(
          'You have reached the maximum limit of images you can upload',
        );
      }

      const uploadedImages = await this.supabaseService.uploadFiles(
        processedFiles,
        userId,
      );

      // Get highest order number for the document
      const lastImageOrder: number | null = await this.imageRepository.getLastImageOrder(document_id);
      const startOrder = lastImageOrder ? lastImageOrder + 1 : 1;

      const imagesData: InsertImage[] = uploadedImages.map((uploadedImage, index) => ({
        document_id: document_id,
        image_name: uploadedImage.fileName,
        image_path: uploadedImage.path,
        order: startOrder + index,
      }));

      return await this.imageRepository.createImage(imagesData);
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

  async update(user: User, imageId: string, updateImage: UpdateImageDto): Promise<void> {
    try {
      const imageUserId: string | null = await this.imageRepository.userIdFromImageId(imageId);

      if (!imageUserId) {
        throw new HttpException('Image does not exist', HttpStatus.NOT_FOUND);
      }

      if (imageUserId !== user.id) {
        throw new HttpException('Image does not belong to user', HttpStatus.FORBIDDEN);
      }

      await this.imageRepository.updateImage(imageId, updateImage.image_name);
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

  async updateOrder(user: User, updates: { id: string; order: number }[]): Promise<void> {
    try {
      if (!updates.length) {
        throw new HttpException(
          'No images found to update order',
          HttpStatus.BAD_REQUEST,
        );
      }

      console.log("1 Updating order for images", updates);

      const image: ImageDB | null = await this.imageRepository.fetchImageDB(updates[0].id);

      console.log("2 Image", image);

      if (!image) {
        throw new HttpException('Image does not exist', HttpStatus.NOT_FOUND);
      }

      const userId: string | null = await this.imageRepository.userIdFromImageId(image.id);

      console.log("3 User ID", userId);

      if (userId !== user.id) {
        throw new HttpException('Image does not belong to user', HttpStatus.FORBIDDEN);
      }

      const images: ImageSummary[] = await this.imageRepository.fetchImageSummariesByDocumentId(image.document_id);

      console.log("4 Images", images);

      if (!images.length) {
        throw new HttpException(
          'There are no images available to update the order',
          HttpStatus.BAD_REQUEST,
        );
      }

      console.log("5 Next step");

      if (images.some(image => !updates.some(update => update.id === image.id))) {
        throw new HttpException('Images do not have consistent parents', HttpStatus.BAD_REQUEST);
      }

      console.log("6 Next step");

      if (new Set(updates.map(update => update.id)).size !== updates.length) {
        throw new HttpException('Image IDs must be unique', HttpStatus.BAD_REQUEST);
      }

      // Validate order values
      const sortedOrders = [...updates.map(update => update.order)].sort((a, b) => a - b);
      const expectedSequence = Array.from({ length: updates.length }, (_, i) => i + 1);

      if (!sortedOrders.every((order, index) => order === expectedSequence[index])) {
        throw new HttpException('Order values must form a complete 1-indexed sequence', HttpStatus.BAD_REQUEST);
      }

      console.log("7 Updates", updates);

      await this.imageRepository.updateImageOrder(updates);
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

  async delete(user: User, imageId: string): Promise<ImageOrder[]> {
    try {
      const image: ImageDB | null = await this.imageRepository.fetchImageDB(imageId);

      if (!image) {
        throw new HttpException('Image does not exist', HttpStatus.NOT_FOUND);
      }

      const document: DocumentSummary | null = await this.documentRepository.fetchDocumentSummaryById(image.document_id);

      if (document.user_id != user.id) {
        throw new HttpException('Document does not belong to user', HttpStatus.FORBIDDEN);
      }

      // Delete the image
      const siblingImageOrders: ImageOrder[] = await this.imageRepository.deleteImage(
        imageId,
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
