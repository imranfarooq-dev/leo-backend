import { Injectable, Logger } from '@nestjs/common';
import { Buffer } from 'buffer';
import { getResolvedPDFJS } from 'unpdf';
import { createCanvas, ImageData } from 'canvas';

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  async extractImagesFromPdf(pdfBuffer: Buffer): Promise<Buffer[]> {
    try {
      const { getDocument, OPS } = await getResolvedPDFJS();

      // Load the PDF document
      const pdf = await getDocument({ data: new Uint8Array(pdfBuffer) })
        .promise;
      const numPages = pdf.numPages;
      const images: Buffer[] = [];

      // Process each page
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const ops = await page.getOperatorList();
        const imgIds = new Set<string>();

        // Find all image IDs in the page
        for (let i = 0; i < ops.fnArray.length; i++) {
          if (ops.fnArray[i] === OPS.paintImageXObject) {
            const imgId = ops.argsArray[i][0];
            imgIds.add(imgId);
          }
        }

        // Extract each image
        for (const imgId of imgIds) {
          try {
            const img = await page.objs.get(imgId);

            if (!img) continue;

            // If image has JPEG data, use it directly
            if (img.data instanceof Uint8Array) {
              // Check for JPEG signature
              if (
                img.data[0] === 0xff &&
                img.data[1] === 0xd8 &&
                img.data[2] === 0xff
              ) {
                images.push(Buffer.from(img.data));
                continue;
              }
            }

            // Handle non-JPEG images
            const canvas = createCanvas(img.width, img.height);
            const ctx = canvas.getContext('2d');

            if (!ctx) continue;

            // Create correct pixel data based on color space
            let pixels;
            if (img.kind === 2) {
              pixels = new Uint8ClampedArray(img.width * img.height * 4);
              for (let i = 0, j = 0; i < img.data.length; i += 3, j += 4) {
                pixels[j] = img.data[i]; // R
                pixels[j + 1] = img.data[i + 1]; // G
                pixels[j + 2] = img.data[i + 2]; // B
                pixels[j + 3] = 255; // A
              }
            } else if (img.kind === 1) {
              pixels = new Uint8ClampedArray(img.width * img.height * 4);
              for (let i = 0, j = 0; i < img.data.length; i++, j += 4) {
                pixels[j] = img.data[i]; // R
                pixels[j + 1] = img.data[i]; // G
                pixels[j + 2] = img.data[i]; // B
                pixels[j + 3] = 255; // A
              }
            } else if (img.kind === 3) {
              pixels = new Uint8ClampedArray(img.data);
            } else {
              // Skip unknown formats
              this.logger.warn(
                `Skipping image with unknown format: ${img.kind}`,
              );
              continue;
            }

            // Verify pixel data length matches expected dimensions
            const expectedLength = img.width * img.height * 4;
            if (pixels.length !== expectedLength) {
              this.logger.warn(
                `Invalid pixel data length: ${pixels.length}, expected: ${expectedLength}`,
              );
              continue;
            }

            // Create ImageData and draw to canvas
            const imageData = new ImageData(pixels, img.width, img.height);
            ctx.putImageData(imageData, 0, 0);

            // Convert to PNG format
            const buffer = await canvas.toBuffer('image/png');
            images.push(buffer);
          } catch (error) {
            this.logger.warn(
              `Failed to extract image ${imgId} from page ${pageNum}: ${error.message}`,
            );
          }
        }
      }

      return images;
    } catch (error) {
      this.logger.error('Failed to extract images from PDF', error);
      throw error;
    }
  }
}
