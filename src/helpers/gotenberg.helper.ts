import { RGB } from 'pdf-lib';
type RGBFunction = (red: number, green: number, blue: number) => RGB;

const MAX_FILE_SIZE_MB = 1000; // 1000 MB
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export const wrapText = (
  text: string,
  maxWidth: number,
  font: any,
  fontSize: number,
) => {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine.length ? currentLine + ' ' + word : word;
    const textWidth = font.widthOfTextAtSize(testLine, fontSize);
    if (textWidth < maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
};

export const drawPageNumber = (
  page: any,
  index: number,
  total: number,
  font: any,
  margin: number,
  rgb: RGBFunction,
) => {
  const { width } = page.getSize();
  const pageNumberText = `Page ${index + 1} of ${total}`;
  page.drawText(pageNumberText, {
    x: width - margin - font.widthOfTextAtSize(pageNumberText, 10),
    y: margin / 2,
    size: 10,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });
};

export const drawHorizontalLine = (
  page: any,
  y: number,
  margin: number,
  rgb: RGBFunction,
) => {
  const { width } = page.getSize();
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 1,
    color: rgb(0.7, 0.7, 0.7),
  });
};

export async function checkFileSize(fileContent: Buffer): Promise<void> {
  if (fileContent.length > MAX_FILE_SIZE_BYTES) {
    throw new Error(
      `File size exceeds the maximum allowed size of ${MAX_FILE_SIZE_MB}MB`,
    );
  }
}
