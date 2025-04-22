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
import { PDFDocument, PDFFont, PDFPage, rgb, StandardFonts } from 'pdf-lib';
import { PassThrough } from 'stream';
import fetch from 'node-fetch';
import * as path from 'path';
import * as fs from 'fs';

import {
  Document,
  Packer,
  Paragraph,
  HeadingLevel,
  ImageRun,
  BorderStyle,
  TextRun,
} from 'docx';
import {
  applyHtmlStylingToPdf,
  checkFileSize,
  drawHorizontalLine,
  drawPageNumber,
  applyHtmlStylingToWord,
  wrapText,
  ensureSpace,
} from '../helpers/gotenberg.helper';
import * as sharp from 'sharp';

const isDevelopment = process.env.NODE_ENV === 'development';

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
    // Batch size for image fetching
    const BATCH_SIZE = 10;

    // Helper function to fetch images in batches
    const fetchImagesInBatch = async (images: any[], batchSize: number) => {
      const imageDetails = [];
      for (let i = 0; i < images.length; i += batchSize) {
        const batch = images.slice(i, i + batchSize);
        const batchImages = await Promise.all(
          batch.map(async (img) => {
            const image = await this.imageRepository.fetchImageById(img.imgId);
            return image;
          }),
        );
        imageDetails.push(...batchImages);
      }
      return imageDetails;
    };

    const imagesDetail = await fetchImagesInBatch(selectedImages, BATCH_SIZE);

    // Group images by document ID
    const groupedByDocId = new Map<string, any[]>();
    imagesDetail.forEach((imageData) => {
      const docId = imageData[0]?.document_id || 'unknown';
      if (!groupedByDocId.has(docId)) {
        groupedByDocId.set(docId, []);
      }
      groupedByDocId.get(docId).push(imageData);
    });

    if (groupedByDocId.size === 1) {
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

      await checkFileSize(result.fileContent);
      return result;
    }

    // Initialize archiver for zipping files
    const archive = archiver('zip', {
      zlib: { level: 9 }, // Set compression level
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    // Prepare an array to collect promises for file processing
    const filePromises: Promise<any>[] = [];

    // Process each document group
    await Promise.all(
      Array.from(groupedByDocId.entries()).map(async ([docId, images]) => {
        if (format === 'pdf') {
          const pdfResult = await this.createPDF(contentType, images);
          const safeName = (
            await this.documentRepository.fetchDocumentDBById(docId)
          ).document_name;
          archive.append(pdfResult.fileContent, { name: `${safeName}.pdf` });
        } else if (
          (contentType === 'images' || contentType === 'both') &&
          format === 'zip'
        ) {
          const imageZipResult = await this.createImageZip(images, contentType);
          archive.append(imageZipResult.fileContent, { name: `${docId}.zip` });
        } else if (contentType === 'transcripts' && format === 'txt') {
          const txtResult = await this.createTxt(images);
          const safeName = (
            await this.documentRepository.fetchDocumentDBById(docId)
          ).document_name;
          archive.append(txtResult.fileContent, {
            name: `${safeName}_transcripts.txt`,
          });
        } else if (format === 'word') {
          const wordResult = await this.createWordDoc(contentType, images);
          const safeName = (
            await this.documentRepository.fetchDocumentDBById(docId)
          ).document_name;
          archive.append(wordResult.fileContent, { name: `${safeName}.docx` });
        }
      }),
    );

    // Finalize the zip and collect the result
    const zipContent = await new Promise<Buffer>((resolve, reject) => {
      const buffers: Buffer[] = [];
      archive.on('data', (data) => buffers.push(data));
      archive.on('end', () => resolve(Buffer.concat(buffers)));
      archive.on('error', (err) => reject(err));

      // Finalize the archive and close it
      archive.finalize();
    });

    await checkFileSize(zipContent);

    return {
      fileContent: zipContent,
      contentType: 'application/zip',
      filename: `exported_documents_${timestamp}.zip`,
    };
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
    try {
      const fontKit = await import('@pdf-lib/fontkit');
      let cachedRegularFontBytes: Buffer | null = null;
      let cachedBoldFontBytes: Buffer | null = null;

      const __dirname = path.resolve();
      const pdfDoc = await PDFDocument.create();
      pdfDoc.registerFontkit(fontKit);
      const regularFontPath = isDevelopment
        ? path.resolve(process.cwd(), 'public/fonts/NotoSans-Regular.ttf')
        : path.resolve(process.cwd(), 'dist/assets/fonts/NotoSans-Regular.ttf');

      const boldFontPath = isDevelopment
        ? path.resolve(process.cwd(), 'public/fonts/NotoSans-Bold.ttf')
        : path.resolve(process.cwd(), 'dist/assets/fonts/NotoSans-Bold.ttf');

      if (!cachedRegularFontBytes) {
        cachedRegularFontBytes = fs.readFileSync(regularFontPath);
      }
      if (!cachedBoldFontBytes) {
        cachedBoldFontBytes = fs.readFileSync(boldFontPath);
      }

      const [font, boldFont] = await Promise.all([
        pdfDoc.embedFont(cachedRegularFontBytes),
        pdfDoc.embedFont(cachedBoldFontBytes),
      ]);

      const margin = 50;
      const lineHeight = 20;
      const titleSize = 14;
      const textSize = 11;

      let currentPage = pdfDoc.addPage();
      const { width, height } = currentPage.getSize();
      let currentY = height - margin;

      // Process each image in the array
      const processedImagesResults = await Promise.allSettled(
        imagesDetail.map(async (imageData) => {
          try {
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

            let imageBuffer: Buffer | null = null;
            let pdfImage: any = null;

            if (
              (contentType === 'images' || contentType === 'both') &&
              imageUrl
            ) {
              try {
                const imageBytes = await this.downloadImage(imageUrl);
                const image = sharp(imageBytes);
                const rotatedImageBuffer = await image.rotate().toBuffer();
                imageBuffer = rotatedImageBuffer;
                pdfImage = filename.toLowerCase().endsWith('.png')
                  ? await pdfDoc.embedPng(rotatedImageBuffer)
                  : await pdfDoc.embedJpg(rotatedImageBuffer);
              } catch (error) {
                console.error(`Error processing image: ${error}`);
              }
            }

            return {
              imageName,
              filename,
              cleanText,
              pdfImage,
            };
          } catch (err) {
            console.log(path.resolve(__dirname));

            console.error(`Failed to process image metadata: ${err}`);
            return null;
          }
        }),
      );

      const processedImages = processedImagesResults
        .filter((result) => result.status === 'fulfilled')
        .map((result) => (result as PromiseFulfilledResult<any>).value)
        .filter((item) => item !== null);

      for (const item of processedImages) {
        if (!item) continue;

        const { imageName, filename, cleanText, pdfImage } = item;

        try {
          // Calculate the total required space for this content section
          let totalSectionHeight = 0;

          // Title space calculation
          const titleLines = wrapText(
            imageName,
            width - margin * 2,
            boldFont,
            titleSize,
          );
          const titleHeight = titleLines.length * lineHeight + 10; // Including space after title
          totalSectionHeight += titleHeight;

          // Image space calculation (if present)
          let displayWidth = 0;
          let displayHeight = 0;

          if (pdfImage) {
            const imgDims = pdfImage.scale(1);
            const maxImgWidth = width - margin * 2;
            const maxImgHeight = Math.min(height / 2, 400); // Limit max image height
            const scale = Math.min(
              maxImgWidth / imgDims.width,
              maxImgHeight / imgDims.height,
              1,
            );

            displayWidth = imgDims.width * scale;
            displayHeight = imgDims.height * scale;
            totalSectionHeight += displayHeight + 20; // Image height + spacing
          } else if (contentType === 'images' || contentType === 'both') {
            totalSectionHeight += lineHeight; // Error message height
          }

          // Transcript space calculation
          let transcriptHeight = 0;
          if (
            (contentType === 'transcripts' || contentType === 'both') &&
            cleanText
          ) {
            // Transcript title + spacing
            transcriptHeight += lineHeight * 2;

            // Rough estimate for transcript text (can be refined)
            const wordsPerLine = Math.floor(
              (width - margin * 2) / (textSize * 0.6),
            );
            const wordCount = cleanText.split(' ').length;
            const estimatedLines = Math.ceil(wordCount / wordsPerLine);
            transcriptHeight += estimatedLines * lineHeight;
          }
          totalSectionHeight += transcriptHeight;

          // Add separator height
          totalSectionHeight += 40;

          // Check if we need a new page based on the TOTAL height required
          const spaceResult = ensureSpace(
            totalSectionHeight,
            currentPage,
            pdfDoc,
            font,
            margin,
            rgb,
            width,
            height,
            currentY,
          );

          currentPage = spaceResult.page;
          currentY = spaceResult.y;

          // Now draw the title
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
          currentY -= 10;

          // Draw the image (if available)
          if (pdfImage) {
            currentPage.drawImage(pdfImage, {
              x: (width - displayWidth) / 2,
              y: currentY - displayHeight,
              width: displayWidth,
              height: displayHeight,
            });

            currentY -= displayHeight + 20;
          } else if (contentType === 'images' || contentType === 'both') {
            currentPage.drawText(`[Error loading image: ${filename}]`, {
              x: margin,
              y: currentY,
              size: textSize,
              font: font,
              color: rgb(0.8, 0.2, 0.2),
            });
            currentY -= lineHeight;
          }

          // Draw transcript
          if (
            (contentType === 'transcripts' || contentType === 'both') &&
            cleanText
          ) {
            currentPage.drawText('Transcript:', {
              x: margin,
              y: currentY,
              size: textSize,
              font: boldFont,
              color: rgb(0.1, 0.1, 0.1),
            });
            currentY -= lineHeight;

            try {
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
              );

              currentPage = result.page;
              currentY = result.y;
            } catch (err) {
              console.error(`Error processing transcript: ${err}`);
              currentPage.drawText(`[Error rendering transcript]`, {
                x: margin,
                y: currentY,
                size: textSize,
                font: font,
                color: rgb(0.8, 0.2, 0.2),
              });
              currentY -= lineHeight;
            }
          }

          // Add separator with less space
          currentY -= 20; // Reduced from 40
          drawHorizontalLine(currentPage, currentY - 10, margin, rgb, width);
          currentY -= 10; // Reduced from 40
        } catch (err) {
          console.error(`Failed to render section: ${err}`);
          currentPage.drawText(`[Failed to render section]`, {
            x: margin,
            y: currentY,
            size: textSize,
            font: font,
            color: rgb(0.8, 0.2, 0.2),
          });
          currentY -= lineHeight * 2;
        }
      }

      // Add page numbers to all pages
      const pages = pdfDoc.getPages();
      pages.forEach((page, i) =>
        drawPageNumber(page, i, pages.length, font, margin, rgb),
      );

      const pdfBytes = await pdfDoc.save();
      return {
        fileContent: Buffer.from(pdfBytes),
        contentType: 'application/pdf',
        filename: `${processedImages[0]?.imageName || 'export'}.pdf`,
      };
    } catch (error) {
      console.error('Error inside createPDF:', error);
    }
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
            const image = sharp(imageBuffer);
            const maxWidth = 500; // maximum width in pixels
            const maxHeight = 500;
            const metadata = await image.metadata();
            let width = metadata.width || 0;
            let height = metadata.height || 0;

            // Calculate the scale factor to maintain the aspect ratio
            const scale = Math.min(maxWidth / width, maxHeight / height);

            // If the image is larger than the max width or height, resize it
            if (scale < 1) {
              width = Math.floor(width * scale);
              height = Math.floor(height * scale);
            }

            children.push(
              new Paragraph({
                children: [
                  new ImageRun({
                    data: imageBuffer,
                    transformation: {
                      width: width,
                      height: height,
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
          children: [
            new TextRun({
              text: '──────────────────────────────────────────────────────────────────────',
              size: 12,
              color: 'auto',
            }),
          ],
          alignment: 'center',
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
