import { Inject, Injectable, Logger } from '@nestjs/common';
import { Provides, Tables } from '@/src/shared/constant';
import { SupabaseClient } from '@supabase/supabase-js';
import { CreateTranscriptionJobDto } from '@/src/transcription_job/dto/create-transcription_job.dto';
import { UpdateTranscriptionJobDto } from '@/src/transcription_job/dto/update-transcription_job.dto';
import { TranscriptionJobDB } from '@/types/transcription_job';

@Injectable()
export class TranscriptionJobRepository {
  private readonly logger: Logger = new Logger(TranscriptionJobRepository.name);

  constructor(
    @Inject(Provides.Supabase) private readonly supabase: SupabaseClient,
  ) { }

  async createTranscriptionJob(
    createTranscriptionJobDto: CreateTranscriptionJobDto,
  ): Promise<TranscriptionJobDB> {
    try {
      const { data: job, error } = await this.supabase
        .from(Tables.TranscriptionJobs)
        .insert(createTranscriptionJobDto)
        .select()
        .single();

      if (error) {
        throw new Error(error.message ?? 'Failed to create transcription job');
      }

      return job;
    } catch (error) {
      this.logger.error(error.message ?? 'Failed to create transcription job');
      throw error;
    }
  }

  async updateTranscriptionJob(
    transcriptionJobId: string,
    updateTranscriptionJobDto: UpdateTranscriptionJobDto
  ): Promise<TranscriptionJobDB> {
    try {
      const { data: job, error } = await this.supabase
        .from(Tables.TranscriptionJobs)
        .update(updateTranscriptionJobDto)
        .eq('id', transcriptionJobId)
        .select()
        .single();

      if (error) {
        throw new Error(error.message ?? 'Failed to update transcription job');
      }

      return job;
    } catch (error) {
      this.logger.error(error.message ?? 'Failed to update transcription job');
      throw error;
    }
  }

  async fetchTranscriptionJobsByImageIds(imageIds: string[], earliestCreatedAt: Date | null): Promise<TranscriptionJobDB[]> {
    try {
      const { data: jobs, error } = await this.supabase.rpc('get_latest_transcription_jobs', {
        p_image_ids: imageIds,
        p_earliest_created_at: earliestCreatedAt,
      });

      if (error) {
        throw new Error(error.message ?? 'Failed to fetch transcription jobs by image ids');
      }

      if (!jobs) {
        return [];
      }

      return jobs;
    } catch (error) {
      this.logger.error(error.message ?? 'Failed to fetch transcription jobs by image ids');
      throw error;
    }
  }
}
