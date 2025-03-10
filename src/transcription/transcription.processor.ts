import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { TRANSCRIPTION_QUEUE } from './transcription.service';
import { ConfigService } from '@nestjs/config';
import { TranscriptionJobRepository } from '../database/repositiories/transcription_job.repository';
import { TranscriptRepository } from '../database/repositiories/transcription.repository';
import { CreditsRepository } from '../database/repositiories/credits.repository';
import { APITranscriptionStatus } from '@/types/transcription';
import { APITranscriptionJobStatus } from '@/types/transcription_job';
import axios from 'axios';

interface TranscriptionJobData {
    userId: string;
    jobs: Array<{
        imageId: string;
        externalJobId: string;
        transcriptionJobId: string;
        documentId?: string;
    }>;
}

@Processor(TRANSCRIPTION_QUEUE)
export class TranscriptionProcessor {
    constructor(
        private readonly configService: ConfigService,
        private readonly transcriptionJobRepository: TranscriptionJobRepository,
        private readonly transcriptionRepository: TranscriptRepository,
        private readonly creditsRepository: CreditsRepository,
    ) { }

    @Process({ name: 'monitor', concurrency: 50 }) // ATTN: concurrency is set to 50
    async handleTranscriptionMonitoring(job: Job<TranscriptionJobData>) {
        try {
            const { userId, jobs } = job.data;
            const apiUrl = this.configService.get<string>('AI_URL');
            const apiToken = this.configService.get<string>('AI_AUTH_TOKEN');

            if (!apiUrl || !apiToken) {
                throw new Error('API configuration is missing');
            }

            const jobPromises = jobs.map(async (transcriptionJob) => {
                let completed = false;
                let attempts = 0;
                const maxAttempts = 43200; // 24 hours with 2-second intervals

                while (!completed && attempts < maxAttempts) {
                    try {
                        const statusResponse = await axios.get(
                            `${apiUrl}/status/${transcriptionJob.externalJobId}`,
                            {
                                headers: {
                                    Authorization: `Bearer ${apiToken}`,
                                    Accept: 'application/json',
                                },
                            }
                        );

                        const status = statusResponse.data.status;

                        if (status === 'COMPLETED') {
                            completed = true;
                            const result = statusResponse.data.output;

                            // Update job status and transcription
                            await this.transcriptionJobRepository.updateTranscriptionJob(
                                transcriptionJob.transcriptionJobId,
                                {
                                    status: APITranscriptionJobStatus.Completed,
                                    transcript_text: result.transcript,
                                }
                            );

                            const existingTranscription = await this.transcriptionRepository.fetchTranscriptionByImageId(
                                transcriptionJob.imageId
                            );

                            if (existingTranscription) {
                                await this.transcriptionRepository.updateTranscription(
                                    existingTranscription.id,
                                    {
                                        transcription_status: 'transcribed',
                                        current_transcription_text: result.transcript,
                                        ai_transcription_text: result.transcript,
                                    }
                                );
                            } else {
                                await this.transcriptionRepository.createTranscription({
                                    image_id: transcriptionJob.imageId,
                                    transcription_status: 'transcribed',
                                    ai_transcription_text: result.transcript,
                                    current_transcription_text: result.transcript,
                                });
                            }

                            return {
                                status: APITranscriptionStatus.Success,
                                imageId: transcriptionJob.imageId,
                            };
                        } else if (['FAILED', 'CANCELLED', 'TIME_OUT'].includes(status)) {
                            await this.transcriptionJobRepository.updateTranscriptionJob(
                                transcriptionJob.transcriptionJobId,
                                {
                                    status: APITranscriptionJobStatus.Failed,
                                }
                            );
                            return {
                                status: APITranscriptionStatus.Failed,
                                imageId: transcriptionJob.imageId,
                            };
                        }
                    } catch (error) {
                        console.error(
                            `Error checking status for job ${transcriptionJob.externalJobId}:`,
                            error
                        );
                        // Don't return here, let it retry
                    }

                    await new Promise((resolve) => setTimeout(resolve, 2000));
                    attempts++;
                }

                if (!completed) {
                    await this.transcriptionJobRepository.updateTranscriptionJob(
                        transcriptionJob.transcriptionJobId,
                        {
                            status: APITranscriptionJobStatus.Failed,
                        }
                    );
                    return {
                        status: APITranscriptionStatus.Failed,
                        imageId: transcriptionJob.imageId,
                    };
                }
            });

            // Wait for all jobs to complete
            const results = await Promise.all(jobPromises);

            // Calculate successful transcriptions and deduct credits
            const successfulTranscriptions = results.filter(
                (result) => result?.status === APITranscriptionStatus.Success
            );

            if (successfulTranscriptions.length > 0) {
                await this.creditsRepository.deductCredits(
                    userId,
                    successfulTranscriptions.length
                );
            }
        } catch (error) {
            console.error('Error in transcription monitoring:', error);
            throw error; // Rethrow to trigger Bull's retry mechanism
        }
    }
} 