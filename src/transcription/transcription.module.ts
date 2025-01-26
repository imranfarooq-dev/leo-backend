import { Module } from '@nestjs/common';
import { TranscriptionController } from './transcription.controller';
import { TranscriptionService } from './transcription.service';
import { DatabaseModule } from '@/src/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [TranscriptionController],
  providers: [TranscriptionService],
})
export class TranscriptionModule { }
