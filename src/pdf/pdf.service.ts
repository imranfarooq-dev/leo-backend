import { Injectable, Logger } from '@nestjs/common';
import { Buffer } from 'buffer';
import { getResolvedPDFJS } from 'unpdf'

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  async extractImagesFromPdf(pdfBuffer: Buffer): Promise<Buffer[]> {
    try {
      const { getDocument, OPS } = await getResolvedPDFJS()

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
            if (img?.data) // Handle different image formats
              if (img.bitmap) {
                // Handle RGB/RGBA bitmap data
                const imageData = new Uint8ClampedArray(img.bitmap);
                images.push(Buffer.from(imageData));
              } else {
                // Handle JPEG/PNG/other formats
                const imageData = img.data instanceof Uint8Array
                  ? img.data
                  : new Uint8Array(img.data.buffer);
                images.push(Buffer.from(imageData));
              }
          } catch (error) {
            this.logger.warn(`Failed to extract image ${imgId} from page ${pageNum}`);
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