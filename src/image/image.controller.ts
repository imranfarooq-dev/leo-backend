import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Put,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ImageService } from '@/src/image/image.service';
import { CreateImageDto } from '@/src/image/dto/create-image.dto';
import { User } from '@/src/comon/decorators/user.decorator';
import { User as UserType } from '@clerk/clerk-sdk-node';
import {
  UpdateImageDto,
  UpdateImageOrderDto,
} from '@/src/image/dto/update-image.dto';
import { MAX_IMAGE_ALLOWED } from '@/src/shared/constant';
import { ImageOrder, Image } from '@/types/image';

@Controller('image')
export class ImageController {
  constructor(private readonly imageService: ImageService) {}

  @Get(':image_id')
  async getImage(@Param('image_id') imageId: string) {
    try {
      const image: Image | null = await this.imageService.getImage(imageId);

      if (!image) {
        throw new HttpException('Image does not exist', HttpStatus.NOT_FOUND);
      }

      return {
        statusCode: HttpStatus.OK,
        message: 'Image fetched',
        data: image,
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
          message: error.message ?? 'Failed to fetch image',
        },
        error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post()
  @UseInterceptors(
    FilesInterceptor('files', MAX_IMAGE_ALLOWED, {
      fileFilter: (req, file, callback) => {
        // FIXME TODO Update this type list
        const allowedMimeTypes = [
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'application/pdf',
        ];

        if (!allowedMimeTypes.includes(file.mimetype)) {
          callback(
            new HttpException(
              'File type not supported. Please upload images (JPG, PNG, GIF, WebP) or PDF files.',
              HttpStatus.BAD_REQUEST,
            ),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  async create(
    @User() user: UserType,
    @Body() createImage: CreateImageDto,
    @UploadedFiles() files: Array<Express.Multer.File>,
  ) {
    try {
      console.log('createImage', createImage);
      const images: Image[] = await this.imageService.create(
        createImage,
        files,
        user.id,
      );

      console.log('images', images);

      return {
        statusCode: HttpStatus.CREATED,
        message: 'Image attached',
        data: images,
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
          message:
            error.message ?? 'An error occurred while creating the image',
        },
        error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':image_id')
  async update(
    @User() user: UserType,
    @Param('image_id') imageId: string,
    @Body() updateImage: UpdateImageDto,
  ) {
    try {
      await this.imageService.update(user, imageId, updateImage);

      return {
        statusCode: HttpStatus.OK,
        message: 'Image updated',
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
          message:
            error.message ?? 'An error occurred while updating the image',
        },
        error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('update-order/:document_id')
  async updateOrder(
    @User() user: UserType,
    @Param('document_id') documentId: string,
    @Body() { updates }: UpdateImageOrderDto,
  ) {
    try {
      await this.imageService.updateOrder(user, documentId, updates);
      return {
        statusCode: HttpStatus.OK,
        message: 'Image order updated',
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
          message:
            error.message ?? 'An error occurred while updating the image order',
        },
        error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':image_id')
  async delete(@User() user: UserType, @Param('image_id') imageId: string) {
    try {
      const siblingImageOrders: ImageOrder[] = await this.imageService.delete(
        user,
        imageId,
      );

      return {
        statusCode: HttpStatus.OK,
        message: 'Image deleted',
        data: siblingImageOrders,
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
          message:
            error.message ?? 'An error occurred while deleting the image',
        },
        error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
