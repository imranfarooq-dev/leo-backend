import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Post,
  Param,
  Put,
} from '@nestjs/common';
import { TranscriptionService } from '@/src/transcription/transcription.service';
import { CreateUpdateTranscriptionDto } from '@/src/transcription/dto/create-update-transcription.dto';
import { User } from '@/src/comon/decorators/user.decorator';
import { User as ClerkUser } from '@clerk/clerk-sdk-node';
import { AiTranscriptionDto } from '@/src/transcription/dto/ai-transcription.dto';

@Controller('transcription')
export class TranscriptionController {
  constructor(private transcriptionService: TranscriptionService) { }

  @Post('ai')
  async aiTranscribe(
    @User() clerkUser: ClerkUser,
    @Body() { imageIds }: AiTranscriptionDto,
  ) {
    try {
      const { transcribedImageIds } = await this.transcriptionService.aiTranscribe(
        clerkUser,
        imageIds,
      );

      return {
        statusCode: HttpStatus.OK,
        message: 'Images transcribed',
        data: {
          transcribedImageIds,
        },
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
        data: { id: transcriptionId },
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
