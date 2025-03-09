import { Module } from '@nestjs/common';
import { TranscriptionService, TRANSCRIPTION_QUEUE } from './transcription.service';
import { TranscriptionController } from './transcription.controller';
import { DatabaseModule } from '@/src/database/database.module';
import { SupabaseModule } from '@/src/supabase/supabase.module';
import { BullModule } from '@nestjs/bull';
import { TranscriptionProcessor } from './transcription.processor';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    DatabaseModule,
    SupabaseModule,
    ConfigModule,
    BullModule.registerQueue({
      name: TRANSCRIPTION_QUEUE,
      defaultJobOptions: {
        removeOnComplete: true, // Remove jobs from queue once completed
        attempts: 5, // Number of retries for failed jobs
        backoff: {
          type: 'exponential',
          delay: 10000, // Initial delay in ms
        },
      },
      settings: {
        retryProcessDelay: 5000, // Time to wait before retrying a failed job
        lockDuration: 300000, // 5 minutes lock duration
        stalledInterval: 30000, // How often to check for stalled jobs
        maxStalledCount: 3, // Number of times a job can be marked as stalled before being failed
      },
      limiter: {
        max: 100, // Maximum number of jobs processed per time window
        duration: 5000, // Time window in milliseconds
      },
    }),
  ],
  controllers: [TranscriptionController],
  providers: [TranscriptionService, TranscriptionProcessor],
})
export class TranscriptionModule { }
