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
      const pdf = await getDocument({ data: new Uint8Array(pdfBuffer) }).promise;
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

            // Handle JPEG images (they can be used directly)
            if (img.data instanceof Uint8Array && img.width && img.height) {
              if (img.colorSpace === 'DeviceRGB' || img.colorSpace === 'DeviceGray') {
                images.push(Buffer.from(img.data));
                continue;
              }
            }

            // For non-JPEG images or raw bitmap data, we need to create a canvas and convert
            const canvas = createCanvas(img.width, img.height);
            const ctx = canvas.getContext('2d');

            if (!ctx) continue;

            // Create ImageData from the raw bitmap
            const imageData = new ImageData(
              new Uint8ClampedArray(img.data),
              img.width,
              img.height
            );

            ctx.putImageData(imageData, 0, 0);

            // Convert to PNG format
            const blob = await canvas.convertToBlob({ type: 'image/png' });
            const arrayBuffer = await blob.arrayBuffer();
            images.push(Buffer.from(arrayBuffer));

          } catch (error) {
            this.logger.warn(`Failed to extract image ${imgId} from page ${pageNum}: ${error.message}`);
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