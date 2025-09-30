// Document Formatting Service for Document Generation
// Handles text formatting, pagination, and document structure

const { VALIDATION_RULES, PDF_CONFIG } = require('../utils/constants');
const { info: logInfo } = require('../utils/logger');

/**
 * Document Formatter class for formatting document content
 */
class DocumentFormatter {
  /**
   * Formats a document section with styling
   * @param {string} title - Section title
   * @param {string} content - Section content
   * @param {Object} style - Style options
   * @returns {Object} Formatted section object
   */
  formatSection(title, content, style = {}) {
    const defaultStyle = {
      fontSize: PDF_CONFIG.FONT_SIZE_DEFAULT,
      fontWeight: 'normal',
      marginBottom: 10,
      indent: 0,
    };

    const finalStyle = { ...defaultStyle, ...style };

    return {
      type: 'section',
      title,
      content,
      style: finalStyle,
    };
  }

  /**
   * Formats a list of items
   * @param {string[]} items - List items
   * @param {Object} style - Style options
   * @returns {Object} Formatted list object
   */
  formatList(items, style = {}) {
    const defaultStyle = {
      bullet: '•',
      indent: 20,
      fontSize: PDF_CONFIG.FONT_SIZE_DEFAULT,
      lineHeight: PDF_CONFIG.LINE_HEIGHT,
    };

    const finalStyle = { ...defaultStyle, ...style };

    return {
      type: 'list',
      items: items.map(item => ({
        text: item,
        style: finalStyle,
      })),
    };
  }

  /**
   * Applies consistent formatting rules to text
   * @param {string} text - Text to format
   * @param {Object} rules - Formatting rules
   * @returns {string} Formatted text
   */
  applyFormattingRules(text, rules = {}) {
    const defaultRules = {
      maxLineLength: VALIDATION_RULES.MAX_LINE_LENGTH,
      indentSize: VALIDATION_RULES.INDENT_SIZE,
      dateFormat: VALIDATION_RULES.DATE_FORMAT,
    };

    const finalRules = { ...defaultRules, ...rules };
    let formatted = text;

    // Apply line length limit
    const lines = formatted.split('\n');
    const wrappedLines = lines.flatMap(line => {
      if (line.length <= finalRules.maxLineLength) return [line];

      const wrapped = [];
      let remaining = line;
      while (remaining.length > finalRules.maxLineLength) {
        const chunk = remaining.substring(0, finalRules.maxLineLength);
        wrapped.push(chunk);
        remaining = remaining.substring(finalRules.maxLineLength);
      }
      if (remaining) wrapped.push(remaining);
      return wrapped;
    });

    formatted = wrappedLines.join('\n');

    return formatted;
  }

  /**
   * Formats text with proper styling for different document types
   * @param {string} text - Text to format
   * @param {string} format - Format type (pdf, txt, etc.)
   * @param {Object} options - Formatting options
   * @returns {string} Formatted text
   */
  formatText(text, format = 'txt', options = {}) {
    switch (format.toLowerCase()) {
      case 'pdf':
        return this._formatForPDF(text, options);
      case 'txt':
      default:
        return this._formatForText(text, options);
    }
  }

  /**
   * Formats text for PDF output
   * @param {string} text - Text to format
   * @param {Object} options - Formatting options
   * @returns {string} PDF-formatted text
   * @private
   */
  _formatForPDF(text, options) {
    // PDF-specific formatting (line breaks, spacing, etc.)
    let formatted = text;

    // Ensure proper line breaks
    formatted = formatted.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Apply indentation if specified
    if (options.indent) {
      const indent = ' '.repeat(options.indent);
      formatted = formatted.split('\n').map(line => indent + line).join('\n');
    }

    return formatted;
  }

  /**
   * Formats text for plain text output
   * @param {string} text - Text to format
   * @param {Object} options - Formatting options
   * @returns {string} Text-formatted text
   * @private
   */
  _formatForText(text, options) {
    let formatted = text;

    // Apply basic text formatting
    if (options.maxWidth) {
      formatted = this.applyFormattingRules(formatted, { maxLineLength: options.maxWidth });
    }

    return formatted;
  }
}

/**
 * Document Paginator class for handling page breaks and layout
 */
class DocumentPaginator {
  constructor() {
    this.pageHeight = PDF_CONFIG.PAGE_HEIGHT;
    this.lineHeight = PDF_CONFIG.LINE_HEIGHT;
  }

  /**
   * Calculates page breaks for content
   * @param {string} content - Document content
   * @param {number} pageHeight - Page height in points
   * @param {number} lineHeight - Line height in points
   * @returns {string[][]} Array of pages, each containing lines
   */
  calculatePages(content, pageHeight = this.pageHeight, lineHeight = this.lineHeight) {
    const lines = content.split('\n');
    const pages = [];
    let currentPage = [];
    let currentHeight = 0;

    lines.forEach(line => {
      const lineHeightNeeded = line.length > 80 ? lineHeight * 2 : lineHeight; // Wrap long lines

      if (currentHeight + lineHeightNeeded > pageHeight) {
        pages.push(currentPage);
        currentPage = [line];
        currentHeight = lineHeightNeeded;
      } else {
        currentPage.push(line);
        currentHeight += lineHeightNeeded;
      }
    });

    if (currentPage.length > 0) {
      pages.push(currentPage);
    }

    logInfo('Pages calculated', { totalPages: pages.length, totalLines: lines.length });

    return pages;
  }

  /**
   * Calculates optimal page layout for structured content
   * @param {Object[]} sections - Document sections
   * @param {Object} options - Layout options
   * @returns {Object[]} Pages with section layout
   */
  calculateSectionLayout(sections, options = {}) {
    const pages = [];
    let currentPage = { sections: [], usedHeight: 0 };
    const maxHeight = options.pageHeight || this.pageHeight;

    sections.forEach(section => {
      const sectionHeight = this._estimateSectionHeight(section);

      if (currentPage.usedHeight + sectionHeight > maxHeight && currentPage.sections.length > 0) {
        pages.push(currentPage);
        currentPage = { sections: [section], usedHeight: sectionHeight };
      } else {
        currentPage.sections.push(section);
        currentPage.usedHeight += sectionHeight;
      }
    });

    if (currentPage.sections.length > 0) {
      pages.push(currentPage);
    }

    return pages;
  }

  /**
   * Estimates the height of a section
   * @param {Object} section - Section object
   * @returns {number} Estimated height
   * @private
   */
  _estimateSectionHeight(section) {
    let height = 0;

    // Title height
    if (section.title) {
      height += 25; // Title spacing
    }

    // Content height
    if (section.content) {
      const lines = section.content.split('\n').length;
      height += lines * this.lineHeight;
    }

    // List items height
    if (section.items) {
      height += section.items.length * this.lineHeight;
    }

    // Add margin
    height += 10;

    return height;
  }

  /**
   * Optimizes content for better page utilization
   * @param {string} content - Content to optimize
   * @returns {string} Optimized content
   */
  optimizeForPagination(content) {
    // Remove excessive whitespace
    let optimized = content.replace(/\n\s*\n\s*\n/g, '\n\n');

    // Ensure single line breaks for better flow
    optimized = optimized.replace(/\n{3,}/g, '\n\n');

    return optimized;
  }
}

module.exports = {
  DocumentFormatter,
  DocumentPaginator,
};