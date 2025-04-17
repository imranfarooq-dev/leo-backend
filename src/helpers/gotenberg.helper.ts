import { PDFDocument, PDFFont, rgb, RGB } from 'pdf-lib';
import { JSDOM } from 'jsdom';
import { IRunStylePropertiesOptions, TextRun } from 'docx';

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
async function processNode(
  node: Node,
  currentPage: any,
  pdfDoc: PDFDocument,
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
  currentStyle: {
    bold: boolean;
    italics: boolean;
    underline: boolean;
    strike: boolean;
    indentLevel: number;
  } = {
    bold: false,
    italics: false,
    underline: false,
    strike: false,
    indentLevel: 0,
  },
  listLevel: number = 0,
  listCounter: number = 0,
  listType: string = '',
  lastPageForContent: any = currentPage,
): Promise<number> {
  if (node.nodeType === 3) {
    // Text Node
    if (node.textContent.trim()) {
      const lines = wrapTextPdf(
        node.textContent,
        width - currentStyle.indentLevel * 20,
        currentStyle.bold ? boldFont : font,
        currentStyle.bold ? boldFontSize : fontSize,
      );

      for (const line of lines) {
        if (currentY - lineHeight < margin) {
          lastPageForContent = currentPage;
          currentPage = pdfDoc.addPage();
          const { height } = currentPage.getSize();
          currentY = height - margin;
        }

        const textToDraw = line;
        const xPosition = x + currentStyle.indentLevel * 20;

        currentPage.drawText(textToDraw, {
          x: xPosition,
          y: currentY,
          font: currentStyle.bold ? boldFont : font,
          size: currentStyle.bold ? boldFontSize : fontSize,
          color: rgb(color.r, color.g, color.b),
        });

        if (currentStyle.underline) {
          const textWidth = (
            currentStyle.bold ? boldFont : font
          ).widthOfTextAtSize(
            textToDraw,
            currentStyle.bold ? boldFontSize : fontSize,
          );
          currentPage.drawLine({
            start: { x: xPosition, y: currentY - 2 },
            end: { x: xPosition + textWidth, y: currentY - 2 },
            thickness: 1,
            color: rgb(color.r, color.g, color.b),
          });
        }

        if (currentStyle.strike) {
          const textWidth = (
            currentStyle.bold ? boldFont : font
          ).widthOfTextAtSize(
            textToDraw,
            currentStyle.bold ? boldFontSize : fontSize,
          );
          const middleY =
            currentY + (currentStyle.bold ? boldFontSize : fontSize) / 4;
          currentPage.drawLine({
            start: { x: xPosition, y: middleY },
            end: { x: xPosition + textWidth, y: middleY },
            thickness: 1,
            color: rgb(color.r, color.g, color.b),
          });
        }

        currentY -= lineHeight;
        lastPageForContent = currentPage;
      }
    }
  } else if (node.nodeType === 1) {
    // Element Node
    const element = node as Element;
    const tagName = element.tagName.toLowerCase();
    const newStyle = { ...currentStyle };
    let newListLevel = listLevel;
    let newListCounter = listCounter;
    let newlistType = listType;

    if (tagName === 'b' || tagName === 'strong') {
      newStyle.bold = true;
    } else if (tagName === 'i' || tagName === 'em') {
      newStyle.italics = true;
    } else if (tagName === 'u') {
      newStyle.underline = true;
    } else if (tagName === 's' || tagName === 'strike' || tagName === 'del') {
      newStyle.strike = true;
    } else if (tagName === 'br') {
      currentY -= lineHeight;
      return currentY;
    } else if (tagName === 'p') {
      if (element.previousElementSibling) {
        currentY -= lineHeight / 2;
      }

      for (const child of Array.from(element.childNodes)) {
        currentY = await processNode(
          child,
          currentPage,
          pdfDoc,
          font,
          boldFont,
          x,
          currentY,
          width,
          lineHeight,
          fontSize,
          boldFontSize,
          color,
          margin,
          newStyle,
          newListLevel,
          newListCounter,
          newlistType,
          lastPageForContent,
        );
      }

      currentY -= lineHeight / 2;
      return currentY;
    } else if (
      tagName === 'h1' ||
      tagName === 'h2' ||
      tagName === 'h3' ||
      tagName === 'h4' ||
      tagName === 'h5' ||
      tagName === 'h6'
    ) {
      currentY -= lineHeight;

      const headingStyle = { ...newStyle, bold: true };
      const headingSizes = {
        h1: fontSize * 2,
        h2: fontSize * 1.8,
        h3: fontSize * 1.6,
        h4: fontSize * 1.4,
        h5: fontSize * 1.2,
        h6: fontSize * 1.1,
      };

      async function processHeadingText(node: Node): Promise<number> {
        if (node.nodeType === 3 && node.textContent.trim()) {
          const headingSize =
            headingSizes[tagName as keyof typeof headingSizes];
          const lines = wrapTextPdf(
            node.textContent,
            width,
            boldFont,
            headingSize,
          );

          for (const line of lines) {
            if (currentY - lineHeight * 1.5 < margin) {
              lastPageForContent = currentPage;
              currentPage = pdfDoc.addPage();
              const { height } = currentPage.getSize();
              currentY = height - margin;
            }

            currentPage.drawText(line, {
              x,
              y: currentY,
              font: boldFont,
              size: headingSize,
              color: rgb(color.r, color.g, color.b),
            });

            currentY -= lineHeight * 1.5;
            lastPageForContent = currentPage;
          }
        } else if (node.nodeType === 1) {
          for (const child of Array.from((node as Element).childNodes)) {
            currentY = await processHeadingText(child);
          }
        }
        return currentY;
      }

      for (const child of Array.from(element.childNodes)) {
        currentY = await processHeadingText(child);
      }

      currentY -= lineHeight / 2;
      return currentY;
    } else if (tagName === 'ul' || tagName === 'ol') {
      newlistType = tagName;
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

          if (currentY - lineHeight < margin) {
            lastPageForContent = currentPage;
            currentPage = pdfDoc.addPage();
            const { height } = currentPage.getSize();
            currentY = height - margin;
          }

          const bulletX = x + (listItemStyle.indentLevel - 1) * 20;
          const bulletText = newlistType === 'ul' ? '•' : `${newListCounter}.`;

          currentPage.drawText(bulletText, {
            x: bulletX,
            y: currentY,
            font: font,
            size: fontSize,
            color: rgb(color.r, color.g, color.b),
          });

          if (newlistType === 'ol') {
            newListCounter++;
          }

          currentY = await processNode(
            child,
            currentPage,
            pdfDoc,
            font,
            boldFont,
            x,
            currentY,
            width,
            lineHeight,
            fontSize,
            boldFontSize,
            color,
            margin,
            listItemStyle,
            newListLevel,
            newListCounter - (newlistType === 'ol' ? 1 : 0),
            newlistType,
            lastPageForContent,
          );
        } else if (child.nodeType === 1) {
          currentY = await processNode(
            child,
            currentPage,
            pdfDoc,
            font,
            boldFont,
            x,
            currentY,
            width,
            lineHeight,
            fontSize,
            boldFontSize,
            color,
            margin,
            newStyle,
            newListLevel,
            newListCounter,
            newlistType,
            lastPageForContent,
          );
        }
      }

      return currentY;
    } else if (tagName === 'li') {
      for (const child of Array.from(element.childNodes)) {
        currentY = await processNode(
          child,
          currentPage,
          pdfDoc,
          font,
          boldFont,
          x,
          currentY,
          width,
          lineHeight,
          fontSize,
          boldFontSize,
          color,
          margin,
          newStyle,
          newListLevel,
          newListCounter,
          newlistType,
          lastPageForContent,
        );
      }

      currentY -= lineHeight / 2;
      return currentY;
    } else if (tagName === 'hr') {
      if (currentY - lineHeight < margin) {
        lastPageForContent = currentPage;
        currentPage = pdfDoc.addPage();
        const { height } = currentPage.getSize();
        currentY = height - margin;
      }

      currentPage.drawLine({
        start: { x, y: currentY - lineHeight / 2 },
        end: { x: x + width, y: currentY - lineHeight / 2 },
        thickness: 1,
        color: rgb(0.7, 0.7, 0.7),
      });

      currentY -= lineHeight;
      lastPageForContent = currentPage;
      return currentY;
    } else if (tagName === 'blockquote') {
      currentY -= lineHeight / 2;

      const blockquoteStyle = {
        ...newStyle,
        indentLevel: newStyle.indentLevel + 1,
      };
      const startY = currentY;

      for (const child of Array.from(element.childNodes)) {
        currentY = await processNode(
          child,
          currentPage,
          pdfDoc,
          font,
          boldFont,
          x,
          currentY,
          width,
          lineHeight,
          fontSize,
          boldFontSize,
          color,
          margin,
          blockquoteStyle,
          newListLevel,
          newListCounter,
          newlistType,
          lastPageForContent,
        );
      }

      if (startY !== currentY) {
        currentPage.drawLine({
          start: { x: x + 10, y: startY + 5 },
          end: { x: x + 10, y: currentY + 5 },
          thickness: 3,
          color: rgb(0.7, 0.7, 0.7),
        });
      }

      currentY -= lineHeight / 2;
      return currentY;
    }

    for (const child of Array.from(element.childNodes)) {
      currentY = await processNode(
        child,
        currentPage,
        pdfDoc,
        font,
        boldFont,
        x,
        currentY,
        width,
        lineHeight,
        fontSize,
        boldFontSize,
        color,
        margin,
        newStyle,
        newListLevel,
        newListCounter,
        newlistType,
        lastPageForContent,
      );
    }
  }
  return currentY;
}

/**
 * Applies HTML styling to a PDF document on the current page.
 * This function parses the provided HTML string using JSDOM and then
 * uses the `processNode` function to recursively draw the styled content
 * onto the PDF page.
 *
 * @param pdfDoc The PDF document to which the styling will be applied.
 * @param currentPage The current page of the PDF document to draw on.
 * @param htmlText The HTML string to parse and apply styling from.
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
 * @param ensureSpace A function that ensures enough vertical space is available on the current page, potentially adding a new page if needed.
 * @returns A promise that resolves to an object containing the last page used and the final y-coordinate.
 */
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
  ensureSpace: (
    spaceNeeded: number,
    currentPage: any,
    pdfDoc: PDFDocument,
    font: PDFFont,
    margin: number,
    rgbFn: any,
  ) => any,
): Promise<{ page: any; y: number }> {
  const dom = new JSDOM(htmlText);
  const document = dom.window.document;

  const lastPageForContent = currentPage;

  const finalY = await processNode(
    document.body,
    currentPage,
    pdfDoc,
    font,
    boldFont,
    x,
    currentY,
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
    },
    0,
    0,
    '',
    lastPageForContent,
  );

  return { page: lastPageForContent, y: finalY };
}

export function wrapTextPdf(
  text: string,
  maxWidth: number,
  font: PDFFont,
  fontSize: number,
): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if (
      currentLine === '' &&
      font.widthOfTextAtSize(word, fontSize) > maxWidth
    ) {
      lines.push(word);
      continue;
    }

    const withSpace = currentLine ? `${currentLine} ${word}` : word;
    const textWidth = font.widthOfTextAtSize(withSpace, fontSize);

    if (textWidth <= maxWidth) {
      currentLine = withSpace;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

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
