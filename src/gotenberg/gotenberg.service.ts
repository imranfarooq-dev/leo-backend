import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import axios from 'axios';
import * as FormData from 'form-data';
import { ConfigService } from '@nestjs/config';
import * as archiver from 'archiver';
import { ArchiverError } from 'archiver';
import { ImageRepository } from '@/src/database/repositiories/image.repository';
import { DocumentRepository } from '@/src/database/repositiories/document.repository';
import { SupabaseService } from '@/src/supabase/supabase.service';
import { ExportRequestDto } from './dto/export.dto';
import { PDFDocument, PDFFont, rgb, StandardFonts } from 'pdf-lib';
import { PassThrough } from 'stream';
import fetch from 'node-fetch';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  ImageRun,
  BorderStyle,
} from 'docx';
import {
  applyHtmlStylingToPdf,
  checkFileSize,
  drawHorizontalLine,
  drawPageNumber,
  applyHtmlStylingToWord,
  wrapText,
} from '../helpers/gotenberg.helper';

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
      // Fetch image data
      const image = await this.imageRepository.fetchImageById(image_id);

      if (!image) {
        throw new HttpException('Image not found', HttpStatus.NOT_FOUND);
      }

      return new Promise(async (resolve, reject) => {
        const archive = archiver('zip', {
          zlib: { level: 6 },
        });

        const chunks: Buffer[] = [];

        // Handle archive data
        archive.on('data', (chunk) => chunks.push(chunk));
        archive.on('end', () => resolve(Buffer.concat(chunks)));
        archive.on('error', (error: ArchiverError) =>
          reject(
            new HttpException(
              error.message ?? 'An error occurred while creating the zip file',
              HttpStatus.INTERNAL_SERVER_ERROR,
            ),
          ),
        );

        // Download and add original image
        const imageBuffer = await this.downloadImage(image.image_url);
        const imageExtension =
          image.image_url
            .split('?')[0] // Remove query parameters
            .split('/') // Split by path separator
            .pop() // Get the last segment (filename)
            ?.split('.') // Split filename by dot
            .pop() || 'jpg'; // Get the extension // Fallback to jpg if no extension found
        archive.append(imageBuffer, {
          name: `{original-image}.${imageExtension}`,
        });

        // Convert and add transcription PDF
        if (image.transcription_id) {
          const transcriptionContent: string | null =
            image.current_transcription_text ?? image.ai_transcription_text;
          if (!transcriptionContent) return;

          const transcriptionPdf =
            await this.convertHtmlToPdf(transcriptionContent);
          archive.append(transcriptionPdf, { name: 'transcription.pdf' });
        }

        // Convert and add notes PDF
        if (image.note_id) {
          const notesPdf = await this.convertHtmlToPdf(image.notes_text);
          archive.append(notesPdf, { name: 'notes.pdf' });
        }

        // Finalize the archive
        archive.finalize();
      });
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
      const documents =
        await this.documentRepository.fetchDocumentsByIdsWithImages(
          documentIds,
        );

      if (!documents) {
        throw new HttpException('Items not found', HttpStatus.NOT_FOUND);
      }

      return new Promise(async (resolve, reject) => {
        const archive = archiver('zip', {
          zlib: { level: 6 },
        });

        const chunks: Buffer[] = [];

        archive.on('data', (chunk) => chunks.push(chunk));
        archive.on('end', () => resolve(Buffer.concat(chunks)));
        archive.on('error', (error: ArchiverError) =>
          reject(
            new HttpException(
              error.message ?? 'An error occurred while creating the zip file',
              HttpStatus.INTERNAL_SERVER_ERROR,
            ),
          ),
        );

        // Process each document
        for (const document of documents) {
          // Process each image in the document
          for (const image of document.images) {
            await this.processImage(image, archive, document.document_name);
          }
        }

        archive.finalize();
      });
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

  private async downloadImage(imageUrl: string): Promise<Buffer> {
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
    const imageBuffer = await this.downloadImage(image.image_url);
    const imageName =
      image.image_name.split('.').shift() || `image-${image.id}`;
    const imageExtension =
      image.image_url
        .split('?')[0] // Remove query parameters
        .split('/') // Split by path separator
        .pop() // Get the last segment (filename)
        ?.split('.') // Split filename by dot
        .pop() || 'jpg'; // Get the extension // Fallback to jpg if no extension found

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

  async processMultipleExport(exportRequest: ExportRequestDto): Promise<{
    fileContent: Buffer;
    contentType: string;
    filename: string;
  }> {
    const { contentType, format, selectedImages } = exportRequest;

    const imagesDetail = await Promise.all(
      selectedImages.map(async (img) => {
        const image = await this.imageRepository.fetchImageById(img.imgId);
        return image;
      }),
    );

    let result;
    if (format === 'pdf') {
      result = await this.createPDF(contentType, imagesDetail);
    } else if (
      (contentType === 'images' || contentType === 'both') &&
      format === 'zip'
    ) {
      result = await this.createImageZip(imagesDetail, contentType);
    } else if (contentType === 'transcripts' && format === 'txt') {
      result = await this.createTxt(imagesDetail);
    } else if (format === 'word') {
      result = await this.createWordDoc(contentType, imagesDetail);
    } else {
      throw new Error('Unsupported combination of content type and format');
    }

    // Check file size before returning
    await checkFileSize(result.fileContent);

    return result;
  }

  private async createImageZip(
    imagesDetail: any[],
    contentType: string,
  ): Promise<{
    fileContent: Buffer;
    contentType: string;
    filename: string;
  }> {
    const includeTranscript = contentType === 'both';

    return new Promise(async (resolve, reject) => {
      const outputStream = new PassThrough();
      const archive = archiver('zip', { zlib: { level: 9 } });

      const chunks: Buffer[] = [];
      outputStream._read = () => {}; // Prevent premature stream closing

      outputStream.on('data', (chunk) => chunks.push(chunk));
      outputStream.on('end', () => {
        const zipBuffer = Buffer.concat(chunks);
        resolve({
          fileContent: zipBuffer,
          contentType: 'application/zip',
          filename: 'export.zip',
        });
      });

      outputStream.on('error', (error) => {
        reject(new Error(`Output stream error: ${error.message}`));
      });

      archive.pipe(outputStream);

      for (const imageData of imagesDetail) {
        const imageUrl = imageData.image_url ?? imageData[0]?.image_url;
        const filename =
          imageData.filename ??
          imageData[0]?.image_name ??
          `image_${Date.now()}.jpg`;

        if (imageUrl) {
          try {
            const imageBuffer = await this.downloadImage(imageUrl);
            archive.append(imageBuffer, { name: filename });
          } catch (error) {
            return reject(
              new Error(
                `Error processing image "${imageUrl}": ${error.message}`,
              ),
            );
          }
        }

        if (includeTranscript) {
          const imageName =
            imageData.image_name ?? imageData[0]?.image_name ?? 'untitled';
          const transcriptText =
            imageData.current_transcription_text ??
            imageData[0]?.current_transcription_text ??
            '';
          const cleanText = transcriptText
            .replace(/<[^>]*>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

          const safeName = imageName.replace(/[^\w\-]+/g, '_'); // safe filename
          const txtFilename = `${safeName}.txt`;

          archive.append(Buffer.from(cleanText, 'utf-8'), {
            name: txtFilename,
          });
        }
      }

      try {
        await archive.finalize();
      } catch (error) {
        return reject(
          new Error(`Failed to finalize archive: ${error.message}`),
        );
      }
    });
  }

  private async createTxt(imagesDetail: any[]): Promise<{
    fileContent: Buffer;
    contentType: string;
    filename: string;
  }> {
    const texts: string[] = [];

    for (const imageData of imagesDetail) {
      const imageName =
        imageData.image_name ?? imageData[0]?.image_name ?? 'Untitled Image';
      const transcriptText =
        imageData.current_transcription_text ??
        imageData[0]?.current_transcription_text ??
        '';

      const cleanText = transcriptText
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      texts.push(`--- ${imageName} ---\n${cleanText}\n`);
    }

    const fullText = texts.join('\n');
    return {
      fileContent: Buffer.from(fullText, 'utf-8'),
      contentType: 'text/plain',
      filename: 'transcripts.txt',
    };
  }

  private async createPDF(contentType: string, imagesDetail: any[]) {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const margin = 50;
    const lineHeight = 10;
    const titleSize = 14;
    const textSize = 11;

    let currentPage = pdfDoc.addPage();
    let { width, height } = currentPage.getSize();
    let currentY = height - margin;

    const ensureSpace = (
      spaceNeeded: number,
      currentPg: any,
      pdfDoc: PDFDocument,
      font: PDFFont,
      margin: number,
      rgbFn: any,
    ) => {
      if (currentY < margin + spaceNeeded) {
        drawPageNumber(
          currentPg,
          pdfDoc.getPages().length - 1,
          0,
          font,
          margin,
          rgbFn,
        );
        const newPage = pdfDoc.addPage();
        ({ width, height } = newPage.getSize());
        currentY = height - margin;
        return newPage;
      }
      return null;
    };

    for (const imageData of imagesDetail) {
      const imageUrl =
        imageData.image_url || (imageData[0] && imageData[0].image_url);
      const filename =
        imageData.filename ||
        (imageData[0] && imageData[0].filename) ||
        'image.jpg';
      const imageName =
        imageData.image_name ||
        (imageData[0] && imageData[0].image_name) ||
        'Untitled Image';
      const transcriptText =
        imageData.current_transcription_text ||
        (imageData[0] && imageData[0].current_transcription_text) ||
        '';
      const cleanText = transcriptText.replace(/\s+/g, ' ').trim();

      // Title
      const titleLines = wrapText(
        imageName,
        width - margin * 2,
        boldFont,
        titleSize,
      );
      const titleHeight = titleLines.length * lineHeight;
      ensureSpace(titleHeight, currentPage, pdfDoc, font, margin, rgb);
      for (const line of titleLines) {
        currentPage.drawText(line, {
          x: margin,
          y: currentY,
          size: titleSize,
          font: boldFont,
          color: rgb(0.1, 0.1, 0.1),
        });
        currentY -= lineHeight;
      }

      // Image
      if ((contentType === 'images' || contentType === 'both') && imageUrl) {
        const imageBytes = await this.downloadImage(imageUrl);
        const pdfImage = filename.toLowerCase().endsWith('.png')
          ? await pdfDoc.embedPng(imageBytes)
          : await pdfDoc.embedJpg(imageBytes);

        const imgDims = pdfImage.scale(1);
        const maxImgWidth = width - margin * 2;
        const maxImgHeight = height / 2;

        const scale = Math.min(
          maxImgWidth / imgDims.width,
          maxImgHeight / imgDims.height,
          1,
        );
        const displayWidth = imgDims.width * scale;
        const displayHeight = imgDims.height * scale;

        ensureSpace(displayHeight + 20, currentPage, pdfDoc, font, margin, rgb);

        currentPage.drawImage(pdfImage, {
          x: (width - displayWidth) / 2,
          y: currentY - displayHeight,
          width: displayWidth,
          height: displayHeight,
        });
        currentY -= displayHeight + 20;
      }

      // Transcript
      if (
        (contentType === 'transcripts' || contentType === 'both') &&
        cleanText
      ) {
        const result = await applyHtmlStylingToPdf(
          pdfDoc,
          currentPage,
          cleanText,
          font,
          boldFont,
          margin,
          currentY,
          width - margin * 2,
          lineHeight,
          textSize,
          textSize + 1,
          { r: 0.1, g: 0.1, b: 0.1 },
          margin,
          ensureSpace,
        );
        currentPage = result.page;
        currentY = result.y;
      }

      // Separator line
      ensureSpace(10, currentPage, pdfDoc, font, margin, rgb);
      drawHorizontalLine(currentPage, currentY, margin, rgb);
      currentY -= 40;
    }

    const pages = pdfDoc.getPages();
    pages.forEach((page, i) =>
      drawPageNumber(page, i, pages.length, font, margin, rgb),
    );

    const pdfBytes = await pdfDoc.save();
    return {
      fileContent: Buffer.from(pdfBytes),
      contentType: 'application/pdf',
      filename: 'export.pdf',
    };
  }

  private async createWordDoc(
    contentType: string,
    imagesDetail: any[],
  ): Promise<{
    fileContent: Buffer;
    contentType: string;
    filename: string;
  }> {
    const children: Paragraph[] = [];

    for (const imageData of imagesDetail) {
      const imageUrl = imageData.image_url ?? imageData[0]?.image_url;
      const imageName =
        imageData.image_name ?? imageData[0]?.image_name ?? 'Untitled Image';
      const transcriptText =
        imageData.current_transcription_text ??
        imageData[0]?.current_transcription_text ??
        '';

      const filename = imageData.filename || imageData[0]?.filename || '';
      const ext = filename.split('.').pop()?.toLowerCase() || 'jpeg';
      const imageType = ['jpeg', 'png', 'bmp', 'gif'].includes(ext)
        ? ext
        : 'jpeg';

      children.push(
        new Paragraph({
          text: imageName,
          heading: HeadingLevel.HEADING_2,
          spacing: { after: 200 },
        }),
      );

      if ((contentType === 'images' || contentType === 'both') && imageUrl) {
        try {
          const res = await fetch(imageUrl);
          if (res.ok) {
            const arrayBuffer = await res.arrayBuffer();
            const imageBuffer = Buffer.from(arrayBuffer);

            children.push(
              new Paragraph({
                children: [
                  new ImageRun({
                    data: imageBuffer,
                    transformation: {
                      width: 500,
                      height: 300,
                    },
                    type: imageType,
                  }),
                ],
                spacing: { after: 200 },
                alignment: 'center',
              }),
            );
          } else {
            children.push(
              new Paragraph({
                text: '[Image could not be loaded]',
                spacing: { after: 200 },
                style: 'Quote',
              }),
            );
          }
        } catch {
          children.push(
            new Paragraph({
              text: '[Image could not be loaded]',
              spacing: { after: 200 },
              style: 'Quote',
            }),
          );
        }
      }

      if (contentType === 'transcripts' || contentType === 'both') {
        children.push(
          new Paragraph({
            text: 'Transcript:',
            heading: HeadingLevel.HEADING_3,
            spacing: { after: 120 },
          }),
        );

        const formattedTranscript =
          await applyHtmlStylingToWord(transcriptText);

        // Make sure the TextRun array is correctly passed as Paragraph children
        children.push(
          new Paragraph({
            children: formattedTranscript, // Pass the TextRun array here
            spacing: { after: 120 },
          }),
        );
      }

      children.push(
        new Paragraph({
          border: {
            bottom: {
              style: BorderStyle.SINGLE,
              color: 'auto',
              size: 6,
              space: 1,
            },
          },
          spacing: { after: 300 },
        }),
      );
    }

    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: 1000,
                right: 1000,
                bottom: 1000,
                left: 1000,
              },
            },
          },
          children,
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);

    return {
      fileContent: buffer,
      contentType:
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      filename: 'export.docx',
    };
  }
}
