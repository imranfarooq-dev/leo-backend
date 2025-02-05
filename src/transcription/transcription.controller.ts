import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Post,
  Get,
  Param,
  Put,
} from '@nestjs/common';
import { TranscriptionService } from '@/src/transcription/transcription.service';
import { CreateUpdateTranscriptionDto } from '@/src/transcription/dto/create-update-transcription.dto';
import { User } from '@/src/comon/decorators/user.decorator';
import { User as ClerkUser } from '@clerk/clerk-sdk-node';
import { AiTranscriptionDto } from '@/src/transcription/dto/ai-transcription.dto';
import { FetchTranscriptionStatusDto } from '@/src/transcription/dto/fetch-transcription-status.dto';

@Controller('transcription')
export class TranscriptionController {
  constructor(private transcriptionService: TranscriptionService) { }

  @Post('ai')
  async aiTranscribe(
    @User() clerkUser: ClerkUser,
    @Body() { imageIds }: AiTranscriptionDto,
  ) {
    try {
      const transcription = await this.transcriptionService.aiTranscribe(
        clerkUser,
        imageIds,
      );

      return {
        statusCode: HttpStatus.OK,
        message: 'Image Transcribed successfully',
        transcription,
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

  @Put()
  async createOrUpdate(
    @Body() createUpdateTranscription: CreateUpdateTranscriptionDto,
  ) {
    try {
      const transcription = await this.transcriptionService.createOrUpdate(
        createUpdateTranscription,
      );

      return {
        statusCode: HttpStatus.OK,
        message: 'Transcription created/updated successfully',
        data: transcription,
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
          message:
            error.message ??
            'An error occurred while creating/updating the transcription record',
        },
        error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
