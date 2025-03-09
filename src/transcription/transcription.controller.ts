import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Post,
  Param,
  Put,
  Get,
} from '@nestjs/common';
import { TranscriptionService } from '@/src/transcription/transcription.service';
import { CreateUpdateTranscriptionDto } from '@/src/transcription/dto/create-update-transcription.dto';
import { User } from '@/src/comon/decorators/user.decorator';
import { User as ClerkUser } from '@clerk/clerk-sdk-node';
import { AiTranscriptionDto } from '@/src/transcription/dto/ai-transcription.dto';
import { Transcription } from '@/types/transcription';
import { GetTranscribableImagesDto } from './dto/get-transcribable-images.dto';


@Controller('transcription')
export class TranscriptionController {
  constructor(private transcriptionService: TranscriptionService) { }

  @Get(":image_id")
  async getTranscription(@User() clerkUser: ClerkUser, @Param("image_id") imageId: string) {
    try {
      const transcription: Transcription = await this.transcriptionService.getTranscription(clerkUser, imageId);

      return {
        statusCode: HttpStatus.OK,
        message: 'Transcription fetched',
        data: transcription,
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
          message: error.message ?? 'An error occurred while fetching the transcription',
        },
        error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('ai')
  async aiTranscribe(
    @User() clerkUser: ClerkUser,
    @Body() aiTranscriptionDto: AiTranscriptionDto,
  ) {
    try {
      const { transcribedImageIds, allImageIds } = await this.transcriptionService.aiTranscribe(
        clerkUser,
        aiTranscriptionDto,
      );

      return {
        statusCode: HttpStatus.OK,
        message: 'Images transcribed',
        transcribedImageIds,
        allImageIds,
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
          message:
            error.message ?? 'An error occurred while transcribing the image',
        },
        error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('transcribable')
  async getTranscribableImages(
    @User() clerkUser: ClerkUser,
    @Body() getTranscribableImagesDto: GetTranscribableImagesDto,
  ) {
    try {
      const transcribableImageIds: string[] = await this.transcriptionService.getTranscribableImages(
        clerkUser,
        getTranscribableImagesDto.documentIds,
      );

      return {
        statusCode: HttpStatus.OK,
        message: 'Transcribable images fetched',
        transcribableImageIds,
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
          message:
            error.message ?? 'An error occurred while fetching transcribable images',
        },
        error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(":image_id")
  async createOrUpdate(
    @User() clerkUser: ClerkUser,
    @Param("image_id") imageId: string,
    @Body() createUpdateTranscription: CreateUpdateTranscriptionDto,
  ) {
    try {
      const transcriptionId: string = await this.transcriptionService.createOrUpdate(
        clerkUser,
        imageId,
        createUpdateTranscription,
      );

      return {
        statusCode: HttpStatus.OK,
        message: 'Transcription created/updated',
        data: transcriptionId,
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
          message:
            error.message ??
            'An error occurred while creating/updating the transcription',
        },
        error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
