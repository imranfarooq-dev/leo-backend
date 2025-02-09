import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateUpdateTranscriptionDto } from '@/src/transcription/dto/create-update-transcription.dto';
import { TranscriptRepository } from '@/src/database/repositiories/transcription.repository';
import { ImageRepository } from '@/src/database/repositiories/image.repository';
import { DocumentRepository } from '@/src/database/repositiories/document.repository';
import { Image, ImageDB } from '@/types/image';
import axios, { AxiosResponse } from 'axios';
import { ConfigService } from '@nestjs/config';
import { User as ClerkUser } from '@clerk/clerk-sdk-node';
import { CreditsRepository } from '@/src/database/repositiories/credits.repository';
import { TRANSCRIBE_COST } from '@/src/shared/constant';
import { SupabaseService } from '@/src/supabase/supabase.service';
import { APITranscriptionStatus, Transcription, TranscriptionStatus } from '@/types/transcription';
import { TranscriptionJobRepository } from '@/src/database/repositiories/transcription_job.repository';
import { APITranscriptionJobStatus, TranscriptionJobDB } from '@/types/transcription_job';
import { Credit } from '@/types/credit';

const MAX_RETRIES = 5;
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
    private readonly transcriptionJobRepository: TranscriptionJobRepository,
  ) { }

  async aiTranscribe(clerkUser: ClerkUser, imageIds: string[]): Promise<{
    transcribedImageIds: string[];
  }> {
    try {
      const BATCH_SIZE: number = 10;
      const results = [];
      const processedDocuments = new Set<string>();
      const transcriptionCost: number = imageIds.length * TRANSCRIBE_COST;

      // Check credit balance
      const credits: Credit | null = await this.creditsRepository.fetchUserCredits(
        clerkUser.id,
      );

      if (!credits) {
        throw new HttpException('Credits not found', HttpStatus.BAD_REQUEST);
      }

      if (
        credits.monthly_credits + credits.lifetime_credits <
        transcriptionCost
      ) {
        throw new HttpException('Insufficient credits', HttpStatus.BAD_REQUEST);
      }

      // Process images in batches
      // FIXME: Do not batch (after we update to send presigned URLs)
      for (let i = 0; i < imageIds.length; i += BATCH_SIZE) {
        const batchImageIds = imageIds.slice(i, i + BATCH_SIZE);
        const batchImages: ImageDB[] = await this.imageRepository.fetchImagesByIds(batchImageIds);

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

      const transcribedImages = results.filter(
        (result) => result.status === APITranscriptionStatus.Success,
      );

      // Return the credit update promise
      // FIXME: Deduct credits before transcribing, and then readd them if issues
      await this.creditsRepository.deductCredits(
        clerkUser.id,
        TRANSCRIBE_COST * transcribedImages.length,
      );

      return {
        transcribedImageIds: transcribedImages.map((image) => image.imageId),
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
    clerkUser: ClerkUser,
    imageId: string,
    createUpdateTranscription: CreateUpdateTranscriptionDto,
  ) {
    try {
      const {
        transcription_status,
        current_transcription_text,
      } = createUpdateTranscription;
      const userId: string | null = await this.imageRepository.userIdFromImageId(imageId);

      if (!userId) {
        throw new HttpException('Image does not exist', HttpStatus.NOT_FOUND);
      }

      if (userId !== clerkUser.id) {
        throw new HttpException('Image does not belong to user', HttpStatus.FORBIDDEN);
      }

      return this.createOrUpdateTranscriptionImpl(
        imageId,
        transcription_status,
        undefined,
        current_transcription_text,
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'An error occurred while creating/updating the transcription',
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

  private async transcribeSingleImage(image: ImageDB): Promise<{
    status: APITranscriptionStatus;
    imageId: string;
    documentId?: string;
    error?: string;
  }> {
    try {
      // TODO: Just send presigned image URL to be transcribed.

      // 1. Create FormData for single image
      const { buffer, error } =
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

      // Convert buffer to base64
      const base64Image = buffer.toString('base64');

      // Create the required JSON payload
      const payload = {
        input: {
          image: base64Image
        }
      };

      // Start the async job
      const runResponse = await this.axiosWithRetry(`${apiUrl}/run`, payload, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiToken}`,
          Accept: 'application/json',
        },
        maxBodyLength: Infinity,
      });

      const jobId = runResponse.data.id;

      // Create initial transcription job record
      const { id: transcriptionJobId } = await this.transcriptionJobRepository.createTranscriptionJob({
        image_id: image.id,
        external_job_id: jobId,
        status: APITranscriptionJobStatus.InProgress,
      });

      // Poll for completion
      let completed = false;
      let attempts = 0;
      const maxAttempts = 43200; // 24 hours with 2-second intervals
      let result;

      while (!completed && attempts < maxAttempts) {
        const statusResponse = await this.axiosWithRetry(
          `${apiUrl}/status/${jobId}`,
          null,
          {
            headers: {
              Authorization: `Bearer ${apiToken}`,
              Accept: 'application/json',
            },
            method: 'GET',
          }
        );

        const status = statusResponse.data.status;

        if (status === 'COMPLETED') {
          completed = true;
          result = statusResponse.data.output;

          // Update job status to completed
          await this.transcriptionJobRepository.updateTranscriptionJob(transcriptionJobId, {
            status: APITranscriptionJobStatus.Completed,
            transcript_text: result.transcript,
          });
        } else if (['FAILED', 'CANCELLED', 'TIME_OUT'].includes(status)) {
          // Update job status to failed
          await this.transcriptionJobRepository.updateTranscriptionJob(transcriptionJobId, {
            status: APITranscriptionJobStatus.Failed,
          });
          throw new Error('Job failed: ' + statusResponse.data.error);
        } else {
          // Wait 2 second before next attempt
          await new Promise(resolve => setTimeout(resolve, 2000));
          attempts++;
        }
      }

      if (!completed) {
        // Update job status to failed on timeout
        await this.transcriptionJobRepository.updateTranscriptionJob(jobId, {
          status: APITranscriptionJobStatus.Failed,
        });
        throw new Error('Timeout waiting for job completion');
      }

      // Update transcription in database
      await this.createOrUpdateTranscriptionImpl(
        image.id,
        'transcribed',
        result.transcript,
        result.transcript,
      );

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

  private async createOrUpdateTranscriptionImpl(
    imageId: string,
    transcriptionStatus: TranscriptionStatus | undefined,
    aiTranscriptionText: string | undefined,
    currentTranscriptionText: string | undefined,
  ): Promise<string> {
    const transcription: Transcription | null =
      await this.transcriptionRepository.fetchTranscriptionByImageId(
        imageId,
      );

    if (transcription) {
      await this.transcriptionRepository.updateTranscription(
        transcription.id,
        {
          transcription_status: transcriptionStatus,
          current_transcription_text: currentTranscriptionText,
          ai_transcription_text: aiTranscriptionText,
        },
      );
      return transcription.id;
    }

    return await this.transcriptionRepository.createTranscription({
      current_transcription_text: currentTranscriptionText,
      transcription_status: transcriptionStatus,
      ai_transcription_text: aiTranscriptionText,
      image_id: imageId,
    });
  }
}
