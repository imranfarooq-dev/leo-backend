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
import { CreateImagesDto } from '@/src/image/dto/create-image.dto';
import { User } from '@/src/comon/decorators/user.decorator';
import { User as UserType } from '@clerk/express';
import {
  UpdateImageDto,
  UpdateImageOrderDto,
} from '@/src/image/dto/update-image.dto';
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
  async create(@User() user: UserType, @Body() createImages: CreateImagesDto) {
    try {
      const data: Image[] = await this.imageService.create(
        createImages,
        user.id,
      );

      return {
        statusCode: HttpStatus.CREATED,
        message: 'Image(s) created',
        data,
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
          message:
            error.message ?? 'An error occurred while creating the image(s)',
        },
        error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':image_id/upload')
  @UseInterceptors(
    FilesInterceptor('files', 1, {
      fileFilter: (req, file, callback) => {
        if (!file || !file.originalname || !file.mimetype) {
          callback(
            new HttpException('Invalid file data', HttpStatus.BAD_REQUEST),
            false,
          );
          return;
        }

        const allowedMimeTypes = [
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'image/heic',
          'image/heif',
        ];

        if (!allowedMimeTypes.includes(file.mimetype)) {
          callback(
            new HttpException(
              'File type not supported. Please upload images (JPG, PNG, GIF, WebP, HEIC, HEIF).',
              HttpStatus.BAD_REQUEST,
            ),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  async upload(
    @User() user: UserType,
    @Param('image_id') imageId: string,
    @UploadedFiles() files: Array<Express.Multer.File>,
  ) {
    try {
      if (files.length !== 1) {
        throw new HttpException(
          'Only one file can be uploaded at a time',
          HttpStatus.BAD_REQUEST,
        );
      }
      const file: Express.Multer.File = files[0];

      if (!file.originalname || !file.size) {
        throw new HttpException('Invalid file data', HttpStatus.BAD_REQUEST);
      }

      const images: Image[] = await this.imageService.upload(
        imageId,
        file,
        user.id,
      );

      return {
        statusCode: HttpStatus.CREATED,
        message: 'Image uploaded',
        data: images,
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
          message:
            error.message ?? 'An error occurred while uploading the image',
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
