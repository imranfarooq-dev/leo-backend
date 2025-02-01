import { Module } from '@nestjs/common';
import { ImageController } from './image.controller';
import { ImageService } from './image.service';
import { DatabaseModule } from '@/src/database/database.module';
import { PdfModule } from '@/src/pdf/pdf.module';

@Module({
  imports: [DatabaseModule, PdfModule],
  controllers: [ImageController],
  providers: [ImageService],
  exports: [ImageService],
})
export class ImageModule { }
