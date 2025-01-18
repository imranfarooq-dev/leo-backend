import { Module } from '@nestjs/common';
import { ListsDocumentsController } from './lists-documents.controller';
import { ListsDocumentsService } from './lists-documents.service';
import { DatabaseModule } from '@/src/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ListsDocumentsController],
  providers: [ListsDocumentsService],
})
export class ListsDocumentsModule {}
