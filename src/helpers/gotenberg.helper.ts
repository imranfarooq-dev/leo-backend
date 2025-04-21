import { PDFDocument, PDFFont, PDFPage, rgb, RGB } from 'pdf-lib';
import { JSDOM } from 'jsdom';
import { IRunStylePropertiesOptions, TextRun } from 'docx';

type RGBFunction = (red: number, green: number, blue: number) => RGB;
const MAX_FILE_SIZE_MB = 1000; // 1000 MB
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export async function checkFileSize(fileContent: Buffer): Promise<void> {
  if (fileContent.length > MAX_FILE_SIZE_BYTES) {
    throw new Error(
      `File size exceeds the maximum allowed size of ${MAX_FILE_SIZE_MB}MB`,
    );
  }
}

/**
 * Processes a single HTML DOM node and its children to draw content on a PDF page.
 * This function recursively traverses the DOM tree, applying styles and drawing text,
 * lists, headings, and other HTML elements onto the specified PDF document and page.
 *
 * @param node The current HTML DOM node to process.
 * @param currentPage The current PDF page to draw on.
 * @param pdfDoc The PDF document being generated.
 * @param font The standard PDF font to use for regular text.
 * @param boldFont The PDF font to use for bold text.
 * @param x The starting x-coordinate for drawing on the page.
 * @param currentY The current y-coordinate for drawing on the page.
 * @param width The available width for text wrapping.
 * @param lineHeight The standard line height for text.
 * @param fontSize The standard font size for regular text.
 * @param boldFontSize The font size for bold text.
 * @param color The color to use for the text (as an RGB object).
 * @param margin The margin of the PDF page.
 * @param currentStyle An object containing the current text styling (bold, italics, underline, strike, indentLevel).
 * @param listLevel The current nesting level of lists (0 for no list).
 * @param listCounter The current counter for ordered lists at the current level.
 * @param listType The type of the current list ('ul' for unordered, 'ol' for ordered', '' for none).
 * @param lastPageForContent The last PDF page that content was added to.
 * @returns A promise that resolves to the updated y-coordinate after processing the node and its children.
 */
export const wrapText = (
  text: string,
  maxWidth: number,
  textFont: any,
  size: number,
): string[] => {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = textFont.widthOfTextAtSize(testLine, size);

    if (testWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

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
  colorFn: any,
  width: number,
) => {
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 1,
    color: colorFn(0.7, 0.7, 0.7),
  });
};
async function processNode(
  node: Node,
  currentPg: any,
  currentYPos: number,
  pdfDoc: PDFDocument,
  font: PDFFont,
  boldFont: PDFFont,
  x: number,
  width: number,
  lineHeight: number,
  fontSize: number,
  boldFontSize: number,
  color: { r: number; g: number; b: number },
  margin: number,
  currentStyle: {
    bold: boolean;
    italics: boolean;
    underline: boolean;
    strike: boolean;
    indentLevel: number;
    superscript: boolean;
    subscript: boolean;
  } = {
    bold: false,
    italics: false,
    underline: false,
    strike: false,
    indentLevel: 0,
    superscript: false,
    subscript: false,
  },
  listLevel: number = 0,
  listCounter: number = 0,
  listType: string = '',
  // Add tracking for current text position
  textInfo: {
    currentX: number;
    currentLineY: number;
    lineStarted: boolean;
  } = { currentX: 0, currentLineY: 0, lineStarted: false },
): Promise<{ page: any; y: number; textInfo: any }> {
  let localCurrentPage = currentPg;
  let localCurrentY = currentYPos;
  let localTextInfo = { ...textInfo };

  // If no line is started, init the X position and set lineStarted to true
  if (!localTextInfo.lineStarted) {
    localTextInfo.currentX = x + currentStyle.indentLevel * 20;
    localTextInfo.currentLineY = localCurrentY;
    localTextInfo.lineStarted = true;
  }

  // Text node processing
  if (node.nodeType === 3) {
    // Text Node
    if (node.textContent?.trim()) {
      // Calculate font size based on style
      let currentFontSize = currentStyle.bold ? boldFontSize : fontSize;
      if (currentStyle.superscript || currentStyle.subscript) {
        currentFontSize = currentFontSize * 0.7;
      }

      // Calculate vertical offset for superscript/subscript
      let yOffset = 0;
      if (currentStyle.superscript) {
        yOffset = currentFontSize * 0.6; // Move up for superscript
      } else if (currentStyle.subscript) {
        yOffset = -currentFontSize * 0.3; // Move down for subscript
      }

      // Process text word by word to keep inline formatting
      const words = node.textContent.split(/\s+/);

      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        if (!word) continue;

        // Add space before word if not first word
        const textToAdd = i > 0 ? ` ${word}` : word;

        // Calculate width of text to add
        const currentFont = currentStyle.bold ? boldFont : font;
        const textWidth = currentFont.widthOfTextAtSize(
          textToAdd,
          currentFontSize,
        );

        // Check if we need to wrap to next line
        if (
          localTextInfo.currentX + textWidth >
          x + width - currentStyle.indentLevel * 20
        ) {
          // Wrap to next line
          localTextInfo.currentX = x + currentStyle.indentLevel * 20;
          localTextInfo.currentLineY -= lineHeight;
          localCurrentY = localTextInfo.currentLineY; // Update current Y

          // Check if we need a new page
          if (localCurrentY - lineHeight < margin) {
            // Create a new page
            localCurrentPage = pdfDoc.addPage();
            const { height: newHeight } = localCurrentPage.getSize();
            localCurrentY = newHeight - margin;
            localTextInfo.currentLineY = localCurrentY;
          }
        }

        // Draw the word
        localCurrentPage.drawText(textToAdd, {
          x: localTextInfo.currentX,
          y: localTextInfo.currentLineY + yOffset,
          font: currentFont,
          size: currentFontSize,
          color: rgb(color.r, color.g, color.b),
        });

        // Add underline if needed
        if (currentStyle.underline) {
          localCurrentPage.drawLine({
            start: {
              x: localTextInfo.currentX,
              y: localTextInfo.currentLineY + yOffset - 2,
            },
            end: {
              x: localTextInfo.currentX + textWidth,
              y: localTextInfo.currentLineY + yOffset - 2,
            },
            thickness: 1,
            color: rgb(color.r, color.g, color.b),
          });
        }

        // Add strikethrough if needed
        if (currentStyle.strike) {
          const middleY =
            localTextInfo.currentLineY + yOffset + currentFontSize / 4;
          localCurrentPage.drawLine({
            start: { x: localTextInfo.currentX, y: middleY },
            end: { x: localTextInfo.currentX + textWidth, y: middleY },
            thickness: 1,
            color: rgb(color.r, color.g, color.b),
          });
        }

        // Update X position for next word
        localTextInfo.currentX += textWidth;
      }
    }
  } else if (node.nodeType === 1) {
    // Element Node
    const element = node as Element;
    const tagName = element.tagName.toLowerCase();
    const newStyle = { ...currentStyle };
    let newListLevel = listLevel;
    let newListCounter = listCounter;
    let newListType = listType;

    // Handle different HTML elements
    if (tagName === 'b' || tagName === 'strong') {
      newStyle.bold = true;
    } else if (tagName === 'i' || tagName === 'em') {
      newStyle.italics = true;
    } else if (tagName === 'u') {
      newStyle.underline = true;
    } else if (tagName === 's' || tagName === 'strike' || tagName === 'del') {
      newStyle.strike = true;
    } else if (tagName === 'sup') {
      // Add support for superscript
      newStyle.superscript = true;
      newStyle.subscript = false;
    } else if (tagName === 'sub') {
      // Add support for subscript
      newStyle.subscript = true;
      newStyle.superscript = false;
    } else if (tagName === 'br') {
      // Line break - start new line
      localTextInfo.currentX = x + currentStyle.indentLevel * 20;
      localTextInfo.currentLineY -= lineHeight;
      localCurrentY = localTextInfo.currentLineY;

      // Check if we need a new page
      if (localCurrentY - lineHeight < margin) {
        // Create a new page
        localCurrentPage = pdfDoc.addPage();
        const { height: newHeight } = localCurrentPage.getSize();
        localCurrentY = newHeight - margin;
        localTextInfo.currentLineY = localCurrentY;
      }

      return {
        page: localCurrentPage,
        y: localCurrentY,
        textInfo: localTextInfo,
      };
    } else if (tagName === 'p') {
      // Paragraph - complete current line and add paragraph spacing
      if (localTextInfo.lineStarted) {
        // End current line if one is in progress
        localTextInfo.lineStarted = false;
        localTextInfo.currentX = x + currentStyle.indentLevel * 20;
        localTextInfo.currentLineY -= lineHeight;
        localCurrentY = localTextInfo.currentLineY;
      }

      if (element.previousElementSibling) {
        // Add extra space between paragraphs
        localCurrentY -= lineHeight / 2;
        localTextInfo.currentLineY = localCurrentY;
      }

      // Process paragraph content
      for (const child of Array.from(element.childNodes)) {
        const result = await processNode(
          child,
          localCurrentPage,
          localCurrentY,
          pdfDoc,
          font,
          boldFont,
          x,
          width,
          lineHeight,
          fontSize,
          boldFontSize,
          color,
          margin,
          newStyle,
          newListLevel,
          newListCounter,
          newListType,
          localTextInfo,
        );

        localCurrentPage = result.page;
        localCurrentY = result.y;
        localTextInfo = result.textInfo;
      }

      // End paragraph with spacing
      if (localTextInfo.lineStarted) {
        localTextInfo.lineStarted = false;
      }
      localCurrentY -= lineHeight / 2;
      localTextInfo.currentLineY = localCurrentY;

      return {
        page: localCurrentPage,
        y: localCurrentY,
        textInfo: localTextInfo,
      };
    } else if (
      tagName === 'h1' ||
      tagName === 'h2' ||
      tagName === 'h3' ||
      tagName === 'h4' ||
      tagName === 'h5' ||
      tagName === 'h6'
    ) {
      // Reset line tracking for headings
      localTextInfo.lineStarted = false;
      localCurrentY -= lineHeight;
      localTextInfo.currentLineY = localCurrentY;

      const headingStyle = { ...newStyle, bold: true };
      const headingSizes = {
        h1: fontSize * 2,
        h2: fontSize * 1.8,
        h3: fontSize * 1.6,
        h4: fontSize * 1.4,
        h5: fontSize * 1.2,
        h6: fontSize * 1.1,
      };

      async function processHeadingText(
        node: Node,
        page: any,
        y: number,
        textPos: any,
      ): Promise<{ page: any; y: number; textInfo: any }> {
        let innerPage = page;
        let innerY = y;
        let innerTextInfo = { ...textPos, lineStarted: false };

        if (node.nodeType === 3 && node.textContent?.trim()) {
          const headingSize =
            headingSizes[tagName as keyof typeof headingSizes];

          // Process heading as a single unit
          innerTextInfo.currentX = x;
          innerTextInfo.currentLineY = innerY;
          innerTextInfo.lineStarted = true;

          const lines = wrapTextPdf(
            node.textContent,
            width,
            boldFont,
            headingSize,
          );

          for (const line of lines) {
            // Check if we need a new page
            if (innerY - lineHeight * 1.5 < margin) {
              // Add a new page
              innerPage = pdfDoc.addPage();
              const { height: newHeight } = innerPage.getSize();
              innerY = newHeight - margin;
              innerTextInfo.currentLineY = innerY;
            }

            innerPage.drawText(line, {
              x,
              y: innerY,
              font: boldFont,
              size: headingSize,
              color: rgb(color.r, color.g, color.b),
            });

            innerY -= lineHeight * 1.5;
            innerTextInfo.currentLineY = innerY;
          }

          innerTextInfo.lineStarted = false;
        } else if (node.nodeType === 1) {
          for (const child of Array.from((node as Element).childNodes)) {
            const result = await processHeadingText(
              child,
              innerPage,
              innerY,
              innerTextInfo,
            );
            innerPage = result.page;
            innerY = result.y;
            innerTextInfo = result.textInfo;
          }
        }
        return { page: innerPage, y: innerY, textInfo: innerTextInfo };
      }

      // Process heading content
      const headingResult = await processHeadingText(
        element,
        localCurrentPage,
        localCurrentY,
        localTextInfo,
      );

      localCurrentPage = headingResult.page;
      localCurrentY = headingResult.y;
      localTextInfo = headingResult.textInfo;

      localCurrentY -= lineHeight / 2;
      localTextInfo.currentLineY = localCurrentY;

      return {
        page: localCurrentPage,
        y: localCurrentY,
        textInfo: localTextInfo,
      };
    } else if (tagName === 'ul' || tagName === 'ol') {
      // Reset line tracking for lists
      localTextInfo.lineStarted = false;

      newListType = tagName;
      newListLevel++;
      newListCounter = tagName === 'ol' ? 1 : 0;

      for (const child of Array.from(element.childNodes)) {
        if (
          (child as Element).tagName &&
          (child as Element).tagName.toLowerCase() === 'li'
        ) {
          const listItemStyle = {
            ...newStyle,
            indentLevel: newStyle.indentLevel + 1,
          };

          // Check if we need a new page
          if (localCurrentY - lineHeight < margin) {
            // Add a new page
            localCurrentPage = pdfDoc.addPage();
            const { height: newHeight } = localCurrentPage.getSize();
            localCurrentY = newHeight - margin;
            localTextInfo.currentLineY = localCurrentY;
          }

          const bulletX = x + (listItemStyle.indentLevel - 1) * 20;
          const bulletText = newListType === 'ul' ? '•' : `${newListCounter}.`;

          localCurrentPage.drawText(bulletText, {
            x: bulletX,
            y: localCurrentY,
            font: font,
            size: fontSize,
            color: rgb(color.r, color.g, color.b),
          });

          if (newListType === 'ol') {
            newListCounter++;
          }

          // Set up for list item content
          localTextInfo.currentX = x + listItemStyle.indentLevel * 20;
          localTextInfo.currentLineY = localCurrentY;
          localTextInfo.lineStarted = true;

          const result = await processNode(
            child,
            localCurrentPage,
            localCurrentY,
            pdfDoc,
            font,
            boldFont,
            x,
            width,
            lineHeight,
            fontSize,
            boldFontSize,
            color,
            margin,
            listItemStyle,
            newListLevel,
            newListCounter - (newListType === 'ol' ? 1 : 0),
            newListType,
            localTextInfo,
          );

          localCurrentPage = result.page;
          localCurrentY = result.y;
          localTextInfo = result.textInfo;
        } else if (child.nodeType === 1) {
          const result = await processNode(
            child,
            localCurrentPage,
            localCurrentY,
            pdfDoc,
            font,
            boldFont,
            x,
            width,
            lineHeight,
            fontSize,
            boldFontSize,
            color,
            margin,
            newStyle,
            newListLevel,
            newListCounter,
            newListType,
            localTextInfo,
          );

          localCurrentPage = result.page;
          localCurrentY = result.y;
          localTextInfo = result.textInfo;
        }
      }

      return {
        page: localCurrentPage,
        y: localCurrentY,
        textInfo: localTextInfo,
      };
    } else if (tagName === 'li') {
      for (const child of Array.from(element.childNodes)) {
        const result = await processNode(
          child,
          localCurrentPage,
          localCurrentY,
          pdfDoc,
          font,
          boldFont,
          x,
          width,
          lineHeight,
          fontSize,
          boldFontSize,
          color,
          margin,
          newStyle,
          newListLevel,
          newListCounter,
          newListType,
          localTextInfo,
        );

        localCurrentPage = result.page;
        localCurrentY = result.y;
        localTextInfo = result.textInfo;
      }

      // End list item with proper spacing
      if (localTextInfo.lineStarted) {
        localTextInfo.lineStarted = false;
      }
      localCurrentY -= lineHeight / 2;
      localTextInfo.currentLineY = localCurrentY;

      return {
        page: localCurrentPage,
        y: localCurrentY,
        textInfo: localTextInfo,
      };
    } else if (tagName === 'hr') {
      // Reset line tracking for horizontal rule
      localTextInfo.lineStarted = false;

      // Check if we need a new page
      if (localCurrentY - lineHeight < margin) {
        // Add a new page
        localCurrentPage = pdfDoc.addPage();
        const { height: newHeight } = localCurrentPage.getSize();
        localCurrentY = newHeight - margin;
        localTextInfo.currentLineY = localCurrentY;
      }

      localCurrentPage.drawLine({
        start: { x, y: localCurrentY - lineHeight / 2 },
        end: { x: x + width, y: localCurrentY - lineHeight / 2 },
        thickness: 1,
        color: rgb(0.7, 0.7, 0.7),
      });

      localCurrentY -= lineHeight;
      localTextInfo.currentLineY = localCurrentY;

      return {
        page: localCurrentPage,
        y: localCurrentY,
        textInfo: localTextInfo,
      };
    } else if (tagName === 'blockquote') {
      // Reset line tracking for blockquote
      localTextInfo.lineStarted = false;

      localCurrentY -= lineHeight / 2;
      localTextInfo.currentLineY = localCurrentY;

      const blockquoteStyle = {
        ...newStyle,
        indentLevel: newStyle.indentLevel + 1,
      };
      const startY = localCurrentY;

      for (const child of Array.from(element.childNodes)) {
        const result = await processNode(
          child,
          localCurrentPage,
          localCurrentY,
          pdfDoc,
          font,
          boldFont,
          x,
          width,
          lineHeight,
          fontSize,
          boldFontSize,
          color,
          margin,
          blockquoteStyle,
          newListLevel,
          newListCounter,
          newListType,
          localTextInfo,
        );

        localCurrentPage = result.page;
        localCurrentY = result.y;
        localTextInfo = result.textInfo;
      }

      if (startY !== localCurrentY) {
        localCurrentPage.drawLine({
          start: { x: x + 10, y: startY + 5 },
          end: { x: x + 10, y: localCurrentY + 5 },
          thickness: 3,
          color: rgb(0.7, 0.7, 0.7),
        });
      }

      localCurrentY -= lineHeight / 2;
      localTextInfo.currentLineY = localCurrentY;

      return {
        page: localCurrentPage,
        y: localCurrentY,
        textInfo: localTextInfo,
      };
    }

    // Process child nodes of the element
    for (const child of Array.from(element.childNodes)) {
      const result = await processNode(
        child,
        localCurrentPage,
        localCurrentY,
        pdfDoc,
        font,
        boldFont,
        x,
        width,
        lineHeight,
        fontSize,
        boldFontSize,
        color,
        margin,
        newStyle,
        newListLevel,
        newListCounter,
        newListType,
        localTextInfo,
      );

      localCurrentPage = result.page;
      localCurrentY = result.y;
      localTextInfo = result.textInfo;
    }
  }

  return { page: localCurrentPage, y: localCurrentY, textInfo: localTextInfo };
}

export async function applyHtmlStylingToPdf(
  pdfDoc: PDFDocument,
  currentPage: any,
  htmlText: string,
  font: PDFFont,
  boldFont: PDFFont,
  x: number,
  currentY: number,
  width: number,
  lineHeight: number,
  fontSize: number,
  boldFontSize: number,
  color: { r: number; g: number; b: number },
  margin: number,
): Promise<{ page: any; y: number }> {
  const dom = new JSDOM(`<div>${htmlText}</div>`);
  const document = dom.window.document;

  // Make sure we're working with a clean body that contains our HTML
  const bodyContent = document.body.firstChild;

  // Set up initial text position tracking
  const initialTextInfo = {
    currentX: x,
    currentLineY: currentY,
    lineStarted: false,
  };

  // Process the body content with text position tracking
  const result = await processNode(
    bodyContent || document.body,
    currentPage,
    currentY,
    pdfDoc,
    font,
    boldFont,
    x,
    width,
    lineHeight,
    fontSize,
    boldFontSize,
    color,
    margin,
    {
      bold: false,
      italics: false,
      underline: false,
      strike: false,
      indentLevel: 0,
      superscript: false,
      subscript: false,
    },
    0,
    0,
    '',
    initialTextInfo,
  );

  return { page: result.page, y: result.y };
}

// Helper function to wrap text
function wrapTextPdf(
  text: string,
  maxWidth: number,
  textFont: PDFFont,
  fontSize: number,
): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = textFont.widthOfTextAtSize(testLine, fontSize);

    if (testWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

// Improved ensure space function
export const ensureSpace = (
  requiredSpace: number,
  page: any,
  doc: any,
  pageFont: any,
  pageMargin: number,
  colorFn: any,
  pageWidth: number,
  pageHeight: number,
  yPos: number,
) => {
  // Check if there's enough space on the current page
  if (yPos - requiredSpace < pageMargin) {
    // Not enough space, create new page
    const newPage = doc.addPage();
    return {
      page: newPage,
      y: pageHeight - pageMargin,
    };
  }
  // Enough space on current page
  return {
    page: page,
    y: yPos,
  };
};

/**
 * Processes a single HTML DOM node and its children to generate Word document text runs
 * with applied styling. This function recursively traverses the DOM tree, applying
 * styles and creating `TextRun` objects for the specified HTML elements.
 *
 * @param node The current HTML DOM node to process.
 * @param currentStyle An object containing the current text styling (bold, italics, underline, strike, superscript, subscript, color, size).
 * @param inList A boolean indicating if the current node is within a list.
 * @param listLevel The current nesting level of lists (0 for no list).
 * @param listType The type of the current list ('ul' for unordered, 'ol' for ordered', '' for none).
 * @param listCounter The current counter for ordered lists at the current level.
 * @param formattedText The array to which the generated `TextRun` objects are added.
 * @param context An object to pass contextual information during traversal (e.g., skipNextLineBreak).
 * @param lastTextContent The last processed text content for detecting consecutive block elements.
 * @returns A promise that resolves once the node and its children have been processed.
 */
async function traverseNode(
  node: Node,
  currentStyle: {
    bold?: boolean;
    italics?: boolean;
    underline?: IRunStylePropertiesOptions['underline'];
    strike?: boolean;
    superScript?: boolean;
    subScript?: boolean;
    color?: string;
    size?: number;
  } = {},
  inList: boolean = false,
  listLevel: number = 0,
  listType: string = '',
  listCounter: number = 0,
  formattedText: TextRun[],
  context: {
    skipNextLineBreak?: boolean;
  } = {},
  lastTextContent: string = '',
): Promise<string> {
  return new Promise(async (resolveTraversal) => {
    let updatedLastTextContent = lastTextContent;
    if (node.nodeType === 3) {
      // Text node
      const textContent = node.textContent.trim();

      if (textContent !== '') {
        const textRun = new TextRun({ text: textContent, ...currentStyle });
        formattedText.push(textRun);
        updatedLastTextContent = textContent; // Track the last text content
      }
      resolveTraversal(updatedLastTextContent);
    } else if (node.nodeType === 1) {
      // Element node
      const element = node as Element;
      const tagName = element.tagName.toLowerCase();
      const newStyle = { ...currentStyle };
      const newContext = { ...context };
      let newListLevel = listLevel;
      let newlistType = listType;
      let newListCounter = listCounter;
      let newInList = inList;

      // Special handling for block elements
      const isBlockElement = [
        'p',
        'div',
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'blockquote',
        'ul',
        'ol',
        'li',
        'hr',
      ].includes(tagName);

      // Add spacing before block elements if needed
      if (
        isBlockElement &&
        formattedText.length > 0 &&
        !context.skipNextLineBreak
      ) {
        if (!updatedLastTextContent.endsWith('\n\n')) {
          if (updatedLastTextContent.endsWith('\n')) {
            formattedText.push(new TextRun({ text: '\n' }));
          } else {
            formattedText.push(new TextRun({ text: '\n\n' }));
          }
        }
      }

      switch (tagName) {
        // Inline formatting
        case 'b':
        case 'strong':
          newStyle.bold = true;
          break;
        case 'i':
        case 'em':
          newStyle.italics = true;
          break;
        case 'u':
          newStyle.underline = { type: 'single', color: '000000' };
          break;
        case 's':
        case 'strike':
        case 'del':
          newStyle.strike = true;
          break;
        case 'sup':
          newStyle.superScript = true;
          break;
        case 'sub':
          newStyle.subScript = true;
          break;
        case 'span':
          // Handle color if specified
          const color = element
            .getAttribute('style')
            ?.match(/color:\s*([^;]+)/)?.[1];
          if (color) {
            // Convert color to hex if it's a valid CSS color
            const hexColor = color.startsWith('#') ? color.substring(1) : color;
            newStyle.color = hexColor;
          }
          break;

        // Line breaks
        case 'br':
          formattedText.push(new TextRun({ text: '\n' }));
          newContext.skipNextLineBreak = true;
          break;

        // Block elements
        case 'p':
          break;

        // Headings
        case 'h1':
        case 'h2':
        case 'h3':
        case 'h4':
        case 'h5':
        case 'h6':
          newStyle.bold = true;
          const headingSizes = {
            h1: 32,
            h2: 28,
            h3: 24,
            h4: 20,
            h5: 16,
            h6: 14,
          };
          newStyle.size = headingSizes[tagName as keyof typeof headingSizes];
          break;

        // List containers
        case 'ul':
        case 'ol':
          newInList = true;
          newlistType = tagName;
          newListLevel++;
          newListCounter = 0;
          newContext.skipNextLineBreak = true;
          break;

        // List items
        case 'li':
          const indent = '  '.repeat(newListLevel - 1);
          if (newlistType === 'ul') {
            formattedText.push(new TextRun({ text: `${indent}• ` }));
          } else if (newlistType === 'ol') {
            newListCounter++;
            formattedText.push(
              new TextRun({ text: `${indent}${newListCounter}. ` }),
            );
          }
          newContext.skipNextLineBreak = true;
          break;

        // Horizontal rule
        case 'hr':
          formattedText.push(
            new TextRun({
              text: '\n───────────────────────────────────────\n',
            }),
          );
          newContext.skipNextLineBreak = true;
          break;

        // Blockquote
        case 'blockquote':
          formattedText.push(new TextRun({ text: '│ ' }));
          break;
      }

      let currentChildLastText = '';
      for (const childNode of Array.from(element.childNodes)) {
        currentChildLastText = await traverseNode(
          childNode as Node,
          newStyle,
          newInList,
          newListLevel,
          newlistType,
          newListCounter,
          formattedText,
          newContext,
          currentChildLastText,
        );
      }
      updatedLastTextContent = currentChildLastText;

      switch (tagName) {
        case 'ul':
        case 'ol':
          newListLevel--;
          if (newListLevel === 0) {
            newInList = false;
          }
          break;
        case 'li':
          if (
            element.nextElementSibling &&
            element.nextElementSibling.tagName.toLowerCase() === 'li'
          ) {
            formattedText.push(new TextRun({ text: '\n' }));
            newContext.skipNextLineBreak = true;
          }
          break;
        case 'blockquote':
          formattedText.push(new TextRun({ text: '\n' }));
          break;
      }

      if (
        isBlockElement &&
        element.nextElementSibling &&
        !newContext.skipNextLineBreak
      ) {
        const nextTagName = element.nextElementSibling.tagName.toLowerCase();
        const isNextBlockElement = [
          'p',
          'div',
          'h1',
          'h2',
          'h3',
          'h4',
          'h5',
          'h6',
          'blockquote',
          'ul',
          'ol',
          'li',
          'hr',
        ].includes(nextTagName);

        if (isNextBlockElement && formattedText.length > 0) {
          const lastItem = formattedText[formattedText.length - 1];
          if (lastItem instanceof TextRun) {
            // Try accessing a known property that might hold the text
            if (
              typeof (lastItem as any)._options?.text === 'string' &&
              !(lastItem as any)._options.text.endsWith('\n')
            ) {
              formattedText.push(new TextRun({ text: '\n' }));
            } else if (
              typeof (lastItem as any).text === 'string' &&
              !(lastItem as any).text.endsWith('\n')
            ) {
              formattedText.push(new TextRun({ text: '\n' }));
            }
          } else {
            // If the last item wasn't a TextRun, add a newline.
            formattedText.push(new TextRun({ text: '\n' }));
          }
        }
      }

      resolveTraversal(updatedLastTextContent);
    } else {
      resolveTraversal(updatedLastTextContent);
    }
  });
}

/**
 * Applies HTML styling to a transcript text and returns an array of `TextRun` objects
 * that can be used to generate a Word document with the corresponding styles.
 * This function parses the provided HTML string using JSDOM and then uses the
 * `traverseNode` function to recursively process the DOM and create styled text runs.
 *
 * @param transcriptText The HTML string containing the transcript with styling.
 * @returns A promise that resolves to an array of `TextRun` objects representing the styled text.
 */
export async function applyHtmlStylingToWord(
  transcriptText: string,
): Promise<TextRun[]> {
  return new Promise(async (resolve) => {
    const formattedText: TextRun[] = [];
    const dom = new JSDOM(transcriptText);
    const document = dom.window.document;

    // Track list state
    let inList = false;
    let listLevel = 0;
    let listType = '';
    let listCounter = 0;

    // Track the last text content manually for break detection
    let lastTextContent = '';

    // Process the body and its children
    for (const childNode of Array.from(document.body.childNodes)) {
      lastTextContent = await traverseNode(
        childNode as Node,
        {},
        inList,
        listLevel,
        listType,
        listCounter,
        formattedText,
        {},
        lastTextContent,
      );
      // Update list state based on the traversal
      const currentElement = childNode as Element;
      if (
        currentElement?.tagName?.toLowerCase() === 'ul' ||
        currentElement?.tagName?.toLowerCase() === 'ol'
      ) {
        listLevel = 0;
        inList = false;
        listType = '';
        listCounter = 0;
      }
    }

    resolve(formattedText);
  });
}
