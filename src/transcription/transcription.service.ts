import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateUpdateTranscriptionDto } from '@/src/transcription/dto/create-update-transcription.dto';
import { TranscriptRepository } from '@/src/database/repositiories/transcription.repository';
import { ImageRepository } from '@/src/database/repositiories/image.repository';
import { DocumentRepository } from '@/src/database/repositiories/document.repository';
import { ImageDB } from '@/types/image';
import axios, { AxiosResponse } from 'axios';
import { ConfigService } from '@nestjs/config';
import { User as ClerkUser } from '@clerk/clerk-sdk-node';
import { CreditsRepository } from '@/src/database/repositiories/credits.repository';
import { SupabaseService } from '@/src/supabase/supabase.service';
import { APITranscriptionStatus, Transcription, TranscriptionStatus } from '@/types/transcription';
import { TranscriptionJobRepository } from '@/src/database/repositiories/transcription_job.repository';
import { APITranscriptionJobStatus, TranscriptionJobDB, TranscriptionJobStatus } from '@/types/transcription_job';
import { Credit } from '@/types/credit';
import { AiTranscriptionDto } from './dto/ai-transcription.dto';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY = 1000;
export const TRANSCRIPTION_QUEUE = 'transcription';

interface TranscriptionJobData {
  userId: string;
  jobs: Array<{
    imageId: string;
    externalJobId: string;
    transcriptionJobId: string;
    documentId?: string;
  }>;
}

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
    @InjectQueue(TRANSCRIPTION_QUEUE) private transcriptionQueue: Queue<TranscriptionJobData>,
  ) { }

  async getTranscription(clerkUser: ClerkUser, imageId: string): Promise<Transcription | null> {
    const userIds: string[] | null = await this.imageRepository.userIdsFromImageIds([imageId]);

    if (!userIds) {
      throw new HttpException('Image does not exist', HttpStatus.NOT_FOUND);
    }

    if (userIds.length !== 1) {
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (userIds[0] !== clerkUser.id) {
      throw new HttpException('Image does not belong to user', HttpStatus.FORBIDDEN);
    }

    return await this.transcriptionRepository.fetchTranscriptionByImageId(imageId);
  }

  async getTranscribableImages(clerkUser: ClerkUser, documentIds: string[]): Promise<string[]> {
    const userIds: string[] = [...new Set([...await this.documentRepository.userIdsFromDocumentIds(documentIds)])];

    if (!userIds) {
      throw new HttpException('Document does not exist', HttpStatus.NOT_FOUND);
    }

    if (userIds.length !== 1) {
      throw new HttpException('Not authorized to transcribe these images', HttpStatus.FORBIDDEN);
    }

    if (userIds[0] !== clerkUser.id) {
      throw new HttpException('Not authorized to transcribe these images', HttpStatus.FORBIDDEN);
    }

    const untranscribedImages: string[] = await this.transcriptionRepository.fetchUntranscribedImagesByDocumentIds(documentIds);
    return untranscribedImages;
  }

  async aiTranscribe(clerkUser: ClerkUser, aiTranscriptionDto: AiTranscriptionDto): Promise<{
    allImageIds: string[];
  }> {
    const { imageIds = [], documentIds = [] } = aiTranscriptionDto;

    // Check user has permission to transcribe these.
    const [imageUserIds, documentUserIds] = await Promise.all([
      this.imageRepository.userIdsFromImageIds(imageIds),
      this.documentRepository.userIdsFromDocumentIds(documentIds),
    ]);

    const allUserIds: string[] = [...new Set([...imageUserIds, ...documentUserIds])];

    if (allUserIds.length !== 1) {
      throw new HttpException('Not authorized to transcribe these images', HttpStatus.FORBIDDEN);
    }

    if (allUserIds[0] !== clerkUser.id) {
      throw new HttpException('Not authorized to transcribe these images', HttpStatus.FORBIDDEN);
    }

    let allImageIds: string[] = [];
    if (documentIds.length > 0) {
      const untranscribedImages: string[] = await this.transcriptionRepository.fetchUntranscribedImagesByDocumentIds(documentIds);
      allImageIds = [...untranscribedImages, ...imageIds];
    } else {
      allImageIds = imageIds;
    }

    if (allImageIds.length === 0) {
      return {
        allImageIds: [],
      };
    }

    try {
      const transcriptionCost: number = allImageIds.length;

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

      // Fetch all images at once
      const images: ImageDB[] = await this.imageRepository.fetchImagesByIds(allImageIds);

      // Submit all transcription jobs concurrently
      const jobSubmissionPromises = images.map(async (image) => {
        try {
          const apiUrl = this.configService.get<string>('AI_URL');
          const apiToken = this.configService.get<string>('AI_AUTH_TOKEN');

          if (!apiUrl || !apiToken) {
            throw new HttpException(
              'API configuration is missing',
              HttpStatus.INTERNAL_SERVER_ERROR,
            );
          }

          const imageUrl = await this.supabaseService.getPresignedUrl(image.image_path, 60 * 60 * 24);
          const payload = {
            input: {
              image: imageUrl
            }
          };

          // Submit job to API
          const runResponse = await this.axiosWithRetry(`${apiUrl}/run`, payload, {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiToken}`,
              Accept: 'application/json',
            },
            maxBodyLength: Infinity,
          });

          const jobId = runResponse.data.id;

          // Create transcription job record
          const transcriptionJob = await this.transcriptionJobRepository.createTranscriptionJob({
            image_id: image.id,
            external_job_id: jobId,
            status: APITranscriptionJobStatus.InProgress,
          });

          return {
            imageId: image.id,
            externalJobId: jobId,
            transcriptionJobId: transcriptionJob.id,
            documentId: image.document_id,
          };
        } catch (error) {
          console.error(`Failed to submit transcription job for image ${image.id}:`, error);
          return null;
        }
      });

      // Wait for all jobs to be submitted and recorded in database
      const submittedJobs = (await Promise.all(jobSubmissionPromises)).filter((job): job is NonNullable<typeof job> => job !== null);

      // Add monitoring job to the queue
      if (submittedJobs.length > 0) {
        await this.transcriptionQueue.add(
          'monitor',
          {
            userId: clerkUser.id,
            jobs: submittedJobs,
          },
          {
            attempts: 5,
            backoff: {
              type: 'exponential',
              delay: 10000,
            },
          },
        );
      }

      return {
        allImageIds,
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
  ): Promise<string> {
    try {
      const {
        transcription_status,
        current_transcription_text,
      } = createUpdateTranscription;
      const userIds: string[] | null = await this.imageRepository.userIdsFromImageIds([imageId]);

      if (!userIds) {
        throw new HttpException('Image does not exist', HttpStatus.NOT_FOUND);
      }

      if (userIds.length !== 1) {
        throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      if (userIds[0] !== clerkUser.id) {
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

  async getTranscriptionJobStatuses(clerkUser: ClerkUser, imageIds: string[], earliestCreatedAt: Date | null): Promise<TranscriptionJobDB[]> {
    const userIds: string[] | null = await this.imageRepository.userIdsFromImageIds(imageIds);

    if (!userIds) {
      throw new HttpException('Image does not exist', HttpStatus.NOT_FOUND);
    }

    const userIdsSet: Set<string> = new Set(userIds);

    if (userIdsSet.size !== 1) {
      throw new HttpException('Not authorized to view these images', HttpStatus.FORBIDDEN);
    }

    if (!userIdsSet.has(clerkUser.id)) {
      throw new HttpException('Not authorized to view these images', HttpStatus.FORBIDDEN);
    }

    const transcriptionJobs: TranscriptionJobDB[] = await this.transcriptionJobRepository.fetchTranscriptionJobsByImageIds(imageIds, earliestCreatedAt);
    return transcriptionJobs;
  }
}
