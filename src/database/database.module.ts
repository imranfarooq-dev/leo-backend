import { Module } from '@nestjs/common';
import { ImageRepository } from '@/src/database/repositiories/image.repository';
import { DocumentRepository } from '@/src/database/repositiories/document.repository';
import { UserRepository } from '@/src/database/repositiories/user.repository';
import { TranscriptRepository } from '@/src/database/repositiories/transcription.repository';
import { NoteRepository } from '@/src/database/repositiories/note.repository';
import { ListRespository } from '@/src/database/repositiories/list.respository';
import { ListsDocumentsRepository } from '@/src/database/repositiories/lists-documents.repository';
import { SearchRepository } from '@/src/database/repositiories/search.repository';
import { SubscriptionRepository } from '@/src/database/repositiories/subscription.repository';
import { CreditsRepository } from '@/src/database/repositiories/credits.repository';
import { TranscriptionJobRepository } from './repositiories/transcription_job.repository';

@Module({
  providers: [
    ImageRepository,
    DocumentRepository,
    UserRepository,
    TranscriptRepository,
    NoteRepository,
    ListRespository,
    ListsDocumentsRepository,
    SearchRepository,
    SubscriptionRepository,
    CreditsRepository,
    TranscriptionJobRepository,
  ],
  exports: [
    ImageRepository,
    DocumentRepository,
    UserRepository,
    TranscriptRepository,
    NoteRepository,
    ListRespository,
    ListsDocumentsRepository,
    SearchRepository,
    SubscriptionRepository,
    CreditsRepository,
    TranscriptionJobRepository,
  ],
})
export class DatabaseModule { }
