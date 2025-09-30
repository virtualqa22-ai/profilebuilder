// PDF Generation Service using pdf-lib
// Handles PDF document creation from structured data

const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const { PDF_CONFIG, VALIDATION_RULES } = require('../utils/constants');
const { validateResumeData } = require('../utils/validation');
const { createError, ERROR_CODES, retryOperation } = require('../utils/error-handling');
const { info: logInfo, error: logError } = require('../utils/logger');

/**
 * PDF Generator class for creating PDF documents
 */
class PDFGenerator {
  /**
   * Generates a PDF resume from structured data
   * @param {Object} resumeData - Resume data
   * @returns {Promise<Buffer>} PDF buffer
   */
  async generateResumePDF(resumeData) {
    // Validate input data
    const validationErrors = validateResumeData(resumeData);
    if (validationErrors.length > 0) {
      throw createError(ERROR_CODES.VALIDATION_ERROR, validationErrors.join(', '));
    }

    return await retryOperation(async () => {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage();

      const { width, height } = page.getSize();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      let yPosition = height - PDF_CONFIG.MARGIN;

      // Add name
      if (resumeData.name) {
        page.drawText(resumeData.name, {
          x: PDF_CONFIG.MARGIN,
          y: yPosition,
          size: 18,
          font: boldFont,
          color: rgb(0, 0, 0),
        });
        yPosition -= 30;
      }

      // Add contact info
      if (resumeData.email) {
        page.drawText(`Email: ${resumeData.email}`, {
          x: PDF_CONFIG.MARGIN,
          y: yPosition,
          size: PDF_CONFIG.FONT_SIZE_DEFAULT,
          font,
          color: rgb(0, 0, 0),
        });
        yPosition -= 20;
      }

      // Add experience
      if (resumeData.experience && Array.isArray(resumeData.experience)) {
        page.drawText('Experience:', {
          x: PDF_CONFIG.MARGIN,
          y: yPosition,
          size: 14,
          font: boldFont,
          color: rgb(0, 0, 0),
        });
        yPosition -= 25;

        resumeData.experience.forEach((exp, index) => {
          if (yPosition < PDF_CONFIG.MARGIN + 50) {
            // Add new page if needed
            const newPage = pdfDoc.addPage();
            yPosition = height - PDF_CONFIG.MARGIN;
          }

          page.drawText(`${index + 1}. ${exp}`, {
            x: PDF_CONFIG.MARGIN + 20,
            y: yPosition,
            size: PDF_CONFIG.FONT_SIZE_DEFAULT,
            font,
            color: rgb(0, 0, 0),
          });
          yPosition -= 20;
        });
      }

      // Add other sections as needed
      if (resumeData.skills) {
        if (yPosition < PDF_CONFIG.MARGIN + 50) {
          const newPage = pdfDoc.addPage();
          yPosition = height - PDF_CONFIG.MARGIN;
        }

        page.drawText('Skills:', {
          x: PDF_CONFIG.MARGIN,
          y: yPosition,
          size: 14,
          font: boldFont,
          color: rgb(0, 0, 0),
        });
        yPosition -= 25;

        if (Array.isArray(resumeData.skills)) {
          resumeData.skills.forEach(skill => {
            page.drawText(`• ${skill}`, {
              x: PDF_CONFIG.MARGIN + 20,
              y: yPosition,
              size: PDF_CONFIG.FONT_SIZE_DEFAULT,
              font,
              color: rgb(0, 0, 0),
            });
            yPosition -= 18;
          });
        }
      }

      const pdfBytes = await pdfDoc.save();

      logInfo('PDF generated successfully', {
        size: pdfBytes.length,
        pages: pdfDoc.getPageCount(),
      });

      return Buffer.from(pdfBytes);
    });
  }

  /**
   * Generates a generic PDF document from template data
   * @param {Object} templateData - Template data with content and styling
   * @returns {Promise<Buffer>} PDF buffer
   */
  async generateDocumentPDF(templateData) {
    return await retryOperation(async () => {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage();

      const { width, height } = page.getSize();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      let yPosition = height - PDF_CONFIG.MARGIN;

      // Process template sections
      if (templateData.sections) {
        for (const section of templateData.sections) {
          if (yPosition < PDF_CONFIG.MARGIN + 100) {
            const newPage = pdfDoc.addPage();
            yPosition = height - PDF_CONFIG.MARGIN;
          }

          // Section title
          if (section.title) {
            page.drawText(section.title, {
              x: PDF_CONFIG.MARGIN,
              y: yPosition,
              size: section.style?.fontSize || 14,
              font: boldFont,
              color: rgb(0, 0, 0),
            });
            yPosition -= 25;
          }

          // Section content
          if (section.content) {
            const lines = this._wrapText(section.content, 80); // Wrap long lines
            for (const line of lines) {
              if (yPosition < PDF_CONFIG.MARGIN + 30) {
                const newPage = pdfDoc.addPage();
                yPosition = height - PDF_CONFIG.MARGIN;
              }

              page.drawText(line, {
                x: PDF_CONFIG.MARGIN + (section.style?.indent || 0),
                y: yPosition,
                size: section.style?.fontSize || PDF_CONFIG.FONT_SIZE_DEFAULT,
                font,
                color: rgb(0, 0, 0),
              });
              yPosition -= PDF_CONFIG.LINE_HEIGHT;
            }
          }

          yPosition -= 10; // Space between sections
        }
      }

      const pdfBytes = await pdfDoc.save();

      logInfo('Document PDF generated successfully', {
        size: pdfBytes.length,
        pages: pdfDoc.getPageCount(),
      });

      return Buffer.from(pdfBytes);
    });
  }

  /**
   * Wraps text to fit within specified width
   * @param {string} text - Text to wrap
   * @param {number} maxLength - Maximum line length
   * @returns {string[]} Wrapped lines
   */
  _wrapText(text, maxLength) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    for (const word of words) {
      if ((currentLine + word).length > maxLength) {
        if (currentLine) {
          lines.push(currentLine.trim());
          currentLine = word;
        } else {
          lines.push(word);
          currentLine = '';
        }
      } else {
        currentLine += (currentLine ? ' ' : '') + word;
      }
    }

    if (currentLine) {
      lines.push(currentLine.trim());
    }

    return lines;
  }
}

module.exports = PDFGenerator;