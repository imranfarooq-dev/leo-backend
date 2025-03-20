import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Param,
  Post,
  StreamableFile,
} from '@nestjs/common';
import { ExportImageDTO } from '@/src/gotenberg/dto/convert-html-pdf-gotenberg.dto';
import { GotenbergService } from '@/src/gotenberg/gotenberg.service';
import { ExportDocumentDto } from '@/src/gotenberg/dto/convert-multiple-html-pdf-gotenberg.dto';

@Controller('gotenberg')
export class GotenbergController {
  constructor(private readonly gotenbergService: GotenbergService) {}

  @Post(':image_id')
  async exportImage(@Param() { image_id }: ExportImageDTO) {
    try {
      const zipBuffer: Buffer =
        await this.gotenbergService.exportImage(image_id);

      return new StreamableFile(zipBuffer, {
        type: 'application/zip',
        disposition: 'attachment; filename="converted_pdfs.zip"',
      });
    } catch (error) {
      throw new HttpException(
        {
          statusCode: error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
          message:
            error.message ?? 'An error occurred while exporting the image',
        },
        error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('document/export')
  async exportDocuments(@Body() { documentIds }: ExportDocumentDto) {
    try {
      const zipBuffer =
        await this.gotenbergService.exportDocuments(documentIds);

      return new StreamableFile(zipBuffer, {
        type: 'application/zip',
        disposition: 'attachment; filename="converted_pdfs.zip"',
      });
    } catch (error) {
      throw new HttpException(
        {
          statusCode: error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
          message:
            error.message ??
            'An error occurred while converting from HTML to PDF',
        },
        error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
