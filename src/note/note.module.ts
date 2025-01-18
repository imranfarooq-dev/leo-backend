import { Module } from '@nestjs/common';
import { NoteController } from './note.controller';
import { NoteService } from './note.service';
import { DatabaseModule } from '@/src/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [NoteController],
  providers: [NoteService],
})
export class NoteModule {}
