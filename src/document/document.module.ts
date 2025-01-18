import { Module } from '@nestjs/common';
import { DocumentController } from './document.controller';
import { DocumentService } from './document.service';
import { DatabaseModule } from '@/src/database/database.module';
import { ImageModule } from '@/src/image/image.module';

@Module({
  imports: [DatabaseModule, ImageModule],
  controllers: [DocumentController],
  providers: [DocumentService],
  exports: [DocumentService],
})
export class DocumentModule {}
