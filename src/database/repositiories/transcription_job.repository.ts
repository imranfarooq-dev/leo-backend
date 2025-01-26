import { Inject, Injectable, Logger } from '@nestjs/common';
import { Provides, Tables } from '@/src/shared/constant';
import { SupabaseClient } from '@supabase/supabase-js';
import { TranscriptionJob } from '@/types/transcription_job';
import { CreateTranscriptionJobDto } from '@/src/transcription_job/dto/create-transcription_job.dto';
import { UpdateTranscriptionJobDto } from '@/src/transcription_job/dto/update-transcription_job.dto';

@Injectable()
export class TranscriptionJobRepository {
  private readonly logger: Logger = new Logger(TranscriptionJobRepository.name);

  constructor(
    @Inject(Provides.Supabase) private readonly supabase: SupabaseClient,
  ) { }

  async fetchLatestByImageId(imageId: string): Promise<TranscriptionJob | null> {
    try {
      const { data: transcriptionJob, error } = await this.supabase
        .from(Tables.TranscriptionJobs)
        .select('*')
        .eq('image_id', imageId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw new Error(error.message ?? 'Failed to fetch transcription job');
      }

      return transcriptionJob;
    } catch (error) {
      this.logger.error(error.message ?? 'Failed to fetch transcription job');
      throw error;
    }
  }

  async createTranscriptionJob(
    createTranscriptionJobDto: CreateTranscriptionJobDto,
  ): Promise<TranscriptionJob> {
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
  ): Promise<TranscriptionJob> {
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
}
