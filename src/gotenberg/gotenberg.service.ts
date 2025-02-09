import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import axios from 'axios';
import * as FormData from 'form-data';
import { ConfigService } from '@nestjs/config';
import * as archiver from 'archiver';
import { ArchiverError } from 'archiver';
import { ImageRepository } from '@/src/database/repositiories/image.repository';
import { DocumentRepository } from '@/src/database/repositiories/document.repository';
import { SupabaseService } from '@/src/supabase/supabase.service';

@Injectable()
export class GotenbergService {
  private readonly gotenbergUrl: string;

  constructor(
    private readonly documentRepository: DocumentRepository,
    private readonly imageRepository: ImageRepository,
    private readonly supabaseService: SupabaseService,
    private configService: ConfigService,
  ) {
    this.gotenbergUrl = this.configService.get<string>('GOTENBERG_URL');
  }

  async exportImage(image_id: string): Promise<Buffer> {
    try {
      throw new Error('Method not implemented.');

      // // Fetch image data
      // const image =
      //   (await this.imageRepository.fetchImageById(
      //     image_id,
      //     true,
      //   ));

      // if (!image) {
      //   throw new HttpException('Image not found', HttpStatus.NOT_FOUND);
      // }

      // return new Promise(async (resolve, reject) => {
      //   const archive = archiver('zip', {
      //     zlib: { level: 6 },
      //   });

      //   const chunks: Buffer[] = [];

      //   // Handle archive data
      //   archive.on('data', (chunk) => chunks.push(chunk));
      //   archive.on('end', () => resolve(Buffer.concat(chunks)));
      //   archive.on('error', (error: ArchiverError) =>
      //     reject(
      //       new HttpException(
      //         error.message ?? 'An error occurred while creating the zip file',
      //         HttpStatus.INTERNAL_SERVER_ERROR,
      //       ),
      //     ),
      //   );

      //   // Download and add original image
      //   const imageBuffer = await this.downloadImage(image.image_path);
      //   const imageExtension = image.image_path.split('.').pop() || 'jpg';
      //   archive.append(imageBuffer, {
      //     name: `{original-image}.${imageExtension}`,
      //   });

      //   // Convert and add transcription PDF
      //   if (image.transcriptions) {
      //     const transcriptionContent: string | null =
      //       image.transcriptions.current_transcription_text ??
      //       image.transcriptions.ai_transcription_text;
      //     if (!transcriptionContent) return;

      //     const transcriptionPdf =
      //       await this.convertHtmlToPdf(transcriptionContent);
      //     archive.append(transcriptionPdf, { name: 'transcription.pdf' });
      //   }

      //   // Convert and add notes PDF
      //   if (image?.notes?.notes_text) {
      //     const notesPdf = await this.convertHtmlToPdf(image.notes.notes_text);
      //     archive.append(notesPdf, { name: 'notes.pdf' });
      //   }

      //   // Finalize the archive
      //   archive.finalize();
      // });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'An error occurred while converting to PDF',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async exportDocuments(documentIds: Array<string>): Promise<Buffer> {
    try {
      throw new Error('Method not implemented.');
      // const documents =
      //   (await this.documentRepository.fetchDocumentsByIds(
      //     documentIds,
      //     true,
      //   ));

      // if (!documents) {
      //   throw new HttpException('Items not found', HttpStatus.NOT_FOUND);
      // }

      // return new Promise(async (resolve, reject) => {
      //   const archive = archiver('zip', {
      //     zlib: { level: 6 },
      //   });

      //   const chunks: Buffer[] = [];

      //   archive.on('data', (chunk) => chunks.push(chunk));
      //   archive.on('end', () => resolve(Buffer.concat(chunks)));
      //   archive.on('error', (error: ArchiverError) =>
      //     reject(
      //       new HttpException(
      //         error.message ?? 'An error occurred while creating the zip file',
      //         HttpStatus.INTERNAL_SERVER_ERROR,
      //       ),
      //     ),
      //   );

      //   // Process each document
      //   for (const document of documents) {
      //     // Process each image in the document
      //     for (const image of document.images) {
      //       await this.processImage(image, archive, document.document_name);
      //     }
      //   }

      //   archive.finalize();
      // });
    } catch (error) {
      console.error(error);
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'An error occurred while converting to PDF',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async downloadImage(imagePath: string): Promise<Buffer> {
    const imageUrl = await this.supabaseService.getPresignedUrl(imagePath);
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
    });
    return Buffer.from(response.data);
  }

  private async convertHtmlToPdf(html: string): Promise<Buffer> {
    const formData = new FormData();
    formData.append('files', Buffer.from(html), 'index.html');

    const response = await axios.post(
      `${this.gotenbergUrl}/forms/chromium/convert/html`,
      formData,
      {
        headers: formData.getHeaders(),
        responseType: 'arraybuffer',
      },
    );

    return Buffer.from(response.data);
  }

  private async processImage(
    image,
    archive: archiver.Archiver,
    basePath: string,
  ) {
    // Add original image
    const imageBuffer = await this.downloadImage(image.image_path);
    const imageName =
      image.image_name.split('.').shift() || `image-${image.id}`;
    const imageExtension = image.image_path.split('.').pop() || 'jpg';
    archive.append(imageBuffer, {
      name: `${basePath}/images/${imageName}.${imageExtension}`,
    });

    // Add transcription PDF
    if (image.transcriptions) {
      const transcriptionContent: string | null =
        image.transcriptions.current_transcription_text ??
        image.transcriptions.ai_transcription_text;
      if (!transcriptionContent) return;

      const transcriptionPdf =
        await this.convertHtmlToPdf(transcriptionContent);
      archive.append(transcriptionPdf, {
        name: `${basePath}/transcriptions/transcription-${imageName}.pdf`,
      });
    }

    // Add notes PDF
    if (image?.notes?.notes_text) {
      const notesPdf = await this.convertHtmlToPdf(image.notes.notes_text);
      archive.append(notesPdf, {
        name: `${basePath}/notes/notes-${imageName}.pdf`,
      });
    }
  }
}
