import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateUpdateTranscriptionDto } from '@/src/transcription/dto/create-update-transcription.dto';
import { TranscriptRepository } from '@/src/database/repositiories/transcription.repository';
import { ImageRepository } from '@/src/database/repositiories/image.repository';
import { DocumentRepository } from '@/src/database/repositiories/document.repository';
import { Image } from '@/types/image';
import axios, { AxiosResponse } from 'axios';
import { ConfigService } from '@nestjs/config';
import { User as ClerkUser } from '@clerk/clerk-sdk-node';
import { CreditsRepository } from '@/src/database/repositiories/credits.repository';
import { TRANSCRIBE_COST } from '@/src/shared/constant';
import { SupabaseService } from '@/src/supabase/supabase.service';
import { APITranscriptionStatus } from '@/types/transcription';

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000;

@Injectable()
export class TranscriptionService {
  constructor(
    private readonly transcriptionRepository: TranscriptRepository,
    private readonly imageRepository: ImageRepository,
    private readonly documentRepository: DocumentRepository,
    private readonly creditsRepository: CreditsRepository,
    private readonly configService: ConfigService,
    private readonly supabaseService: SupabaseService,
  ) {}

  async aiTranscribe(clerkUser: ClerkUser, imageIds: number[]) {
    try {
      const BATCH_SIZE = 10;
      const results = [];
      const processedDocuments = new Set<number>();

      const transcriptionCost = imageIds.length * TRANSCRIBE_COST;

      // Check credit balance
      const credits = await this.creditsRepository.fetchUserCredits(
        clerkUser.id,
      );

      if (
        credits.monthly_credits + credits.lifetime_credits <
        transcriptionCost
      ) {
        throw new HttpException('Insufficient credits', HttpStatus.BAD_REQUEST);
      }

      // Process images in batches
      for (let i = 0; i < imageIds.length; i += BATCH_SIZE) {
        const batchImageIds = imageIds.slice(i, i + BATCH_SIZE);

        // Fetch batch of images
        const batchImages: Image[] =
          await this.imageRepository.fetchImagesByIds(batchImageIds);

        // Process each image in the batch
        const batchPromises = batchImages.map(async (image) => {
          const result = await this.transcribeSingleImage(image);
          results.push(result);

          if (
            result.status === APITranscriptionStatus.Success &&
            result.documentId
          ) {
            processedDocuments.add(result.documentId);
          }
        });

        // Wait for all operations in the batch to complete
        await Promise.all(batchPromises);

        // Add delay between batches to prevent rate limiting
        if (i + BATCH_SIZE < imageIds.length) {
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
      }

      const imageDocumentIds = Array.from(processedDocuments);

      const documents = await this.documentRepository.fetchDocumentsByIds(
        imageDocumentIds,
        true,
      );

      const transcribedImages = results.filter(
        (result) => result.status === APITranscriptionStatus.Success,
      );

      // Return the credit update promise
      await this.creditsRepository.deductCredits(
        clerkUser.id,
        TRANSCRIBE_COST * transcribedImages.length,
      );

      return {
        documents,
        transcribedImageCount: transcribedImages.length,
        totalImages: imageIds.length,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        error.message ?? 'An error occurred while transcribing the image',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async createOrUpdate(
    createUpdateTranscription: CreateUpdateTranscriptionDto,
  ) {
    try {
      const {
        transcription_status,
        ai_transcription_text,
        current_transcription_text,
        image_id,
      } = createUpdateTranscription;
      const imageExist = await this.imageRepository.fetchImageById(image_id);

      if (!imageExist) {
        throw new HttpException('Image does not exist', HttpStatus.NOT_FOUND);
      }

      const transcriptionExist =
        await this.transcriptionRepository.fetchTranscriptionByImageId(
          image_id,
        );

      if (transcriptionExist) {
        return await this.transcriptionRepository.updateTranscription(
          transcriptionExist.id,
          {
            transcription_status,
            ai_transcription_text,
            current_transcription_text,
          },
        );
      }

      return await this.transcriptionRepository.createTranscription({
        current_transcription_text,
        ai_transcription_text,
        transcription_status,
        image_id,
      });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'An error occurred while creating/updating the transcription record',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async axiosWithRetry(
    url: string,
    data: any,
    config: any,
    retryCount = 0,
  ): Promise<AxiosResponse> {
    try {
      const response = await axios.post(url, data, config);

      if (response.status !== HttpStatus.OK) {
        throw new HttpException(
          `API returned status ${response.status}`,
          response.status,
        );
      }

      return response;
    } catch (error) {
      // Only retry if we haven't exceeded MAX_RETRIES
      if (retryCount >= MAX_RETRIES) {
        throw error;
      }

      // Determine if we should retry based on error type
      const shouldRetry =
        axios.isAxiosError(error) &&
        (!error.response || // Network errors
          error.code === 'ECONNABORTED' || // Timeout
          (error.response?.status && error.response.status >= 500)); // Server errors

      if (!shouldRetry) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const delayTime = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);

      await new Promise((resolve) => setTimeout(resolve, delayTime));

      // Increment retryCount and try again
      return this.axiosWithRetry(url, data, config, retryCount + 1);
    }
  }

  private async transcribeSingleImage(image: Image): Promise<{
    status: APITranscriptionStatus;
    imageId: number;
    documentId?: number;
    error?: string;
  }> {
    try {
      // 1. Create FormData for single image
      const { buffer, fileType, error } =
        await this.supabaseService.downloadFileBufferFromSupabase(
          image.image_path,
          image.image_name,
        );

      if (!!error?.length) {
        return {
          imageId: image.id,
          status: APITranscriptionStatus.Failed,
          error: error,
        };
      }

      const apiUrl = this.configService.get<string>('AI_URL');
      const apiToken = this.configService.get<string>('AI_AUTH_TOKEN');

      if (!apiUrl || !apiToken) {
        throw new HttpException(
          'API configuration is missing',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      // Make API call for single image
      const response = await this.axiosWithRetry(apiUrl, buffer, {
        headers: {
          'Content-Type': fileType,
          Authorization: `Bearer ${apiToken}`,
          Accept: 'application/json',
        },
        maxBodyLength: Infinity,
      });

      if (response.status === HttpStatus.OK) {
        // Update transcription in database
        await this.createOrUpdate({
          image_id: image.id,
          transcription_status: 'transcribed',
          ai_transcription_text: response.data.transcript,
          current_transcription_text: null,
        });
      }

      return {
        imageId: image.id,
        status: APITranscriptionStatus.Success,
        documentId: image.document_id,
      };
    } catch (error) {
      return {
        imageId: image.id,
        status: APITranscriptionStatus.Failed,
        error: error.message,
      };
    }
  }
}
