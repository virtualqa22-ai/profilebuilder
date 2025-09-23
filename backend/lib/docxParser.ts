/**
 * DOCX Parser Module
 *
 * Provides advanced parsing logic for DOCX files, extracting text, tables, and bullet points.
 * Integrates with validation and error handling for secure data processing.
 * Uses minimal third-party library (mammoth) for DOCX to HTML conversion.
 *
 * Security: Sanitizes all extracted text to prevent XSS and injection attacks.
 * Resilience: Handles parsing errors gracefully with proper error propagation.
 * Reusability: Modular functions for different parsing aspects.
 */

import mammoth from 'mammoth';
import { sanitizeString } from './validations';
import { globalLogger } from './logger';

/**
 * Interface for parsed DOCX data
 * Contains the HTML representation and any conversion messages
 */
export interface ParsedDocxData {
  html: string;
  messages: any[];
}

/**
 * Interface for table data extracted from DOCX
 * Represents a table with rows and cells
 */
export interface TableData {
  rows: string[][];
}

/**
 * Interface for resume data (reused from validations)
 */
export interface ResumeData {
  [sectionKey: string]: unknown;
}

/**
 * Parses DOCX file buffer into structured data
 * @param fileBuffer - The DOCX file as a Buffer
 * @returns Promise resolving to ParsedDocxData
 * @throws Error if parsing fails
 */
export async function parseDocxContent(fileBuffer: Buffer): Promise<ParsedDocxData> {
  try {
    // Convert DOCX to HTML using mammoth
    const result = await mammoth.convertToHtml({ buffer: fileBuffer });

    // Sanitize the HTML content for security
    const sanitizedHtml = sanitizeString(result.value);

    globalLogger.info('DOCX parsing completed successfully');

    return {
      html: sanitizedHtml,
      messages: result.messages
    };
  } catch (error) {
    globalLogger.error('Error parsing DOCX content', error);
    throw new Error('Failed to parse DOCX file: ' + (error as Error).message);
  }
}

/**
 * Extracts tables from parsed DOCX HTML
 * @param docxContent - The parsed DOCX data containing HTML
 * @returns Array of TableData objects
 */
export function extractTables(docxContent: ParsedDocxData): TableData[] {
  const tables: TableData[] = [];
  const html = docxContent.html;

  // Use DOMParser to parse HTML (Node.js compatible via jsdom or similar, but using regex for simplicity)
  // For production, consider using cheerio or jsdom
  const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
  let tableMatch;

  while ((tableMatch = tableRegex.exec(html)) !== null) {
    const tableHtml = tableMatch[1];
    const rows: string[][] = [];

    // Extract rows
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch;
    while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
      const rowHtml = rowMatch[1];
      const cells: string[] = [];

      // Extract cells (td or th)
      const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
      let cellMatch;
      while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
        const cellContent = sanitizeString(cellMatch[1].replace(/<[^>]*>/g, '').trim());
        cells.push(cellContent);
      }

      if (cells.length > 0) {
        rows.push(cells);
      }
    }

    if (rows.length > 0) {
      tables.push({ rows });
    }
  }

  globalLogger.info(`Extracted ${tables.length} tables from DOCX`);
  return tables;
}

/**
 * Extracts bullet points from parsed DOCX HTML
 * @param docxContent - The parsed DOCX data containing HTML
 * @returns Array of bullet point strings
 */
export function extractBullets(docxContent: ParsedDocxData): string[] {
  const bullets: string[] = [];
  const html = docxContent.html;

  // Extract from unordered lists
  const ulRegex = /<ul[^>]*>([\s\S]*?)<\/ul>/gi;
  let ulMatch;

  while ((ulMatch = ulRegex.exec(html)) !== null) {
    const ulHtml = ulMatch[1];

    // Extract list items
    const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
    let liMatch;
    while ((liMatch = liRegex.exec(ulHtml)) !== null) {
      const bulletContent = sanitizeString(liMatch[1].replace(/<[^>]*>/g, '').trim());
      if (bulletContent) {
        bullets.push(bulletContent);
      }
    }
  }

  // Also check for ordered lists if needed
  const olRegex = /<ol[^>]*>([\s\S]*?)<\/ol>/gi;
  let olMatch;

  while ((olMatch = olRegex.exec(html)) !== null) {
    const olHtml = olMatch[1];

    const liRegexOl = /<li[^>]*>([\s\S]*?)<\/li>/gi;
    let liMatch;
    while ((liMatch = liRegexOl.exec(olHtml)) !== null) {
      const bulletContent = sanitizeString(liMatch[1].replace(/<[^>]*>/g, '').trim());
      if (bulletContent) {
        bullets.push(bulletContent);
      }
    }
  }

  globalLogger.info(`Extracted ${bullets.length} bullet points from DOCX`);
  return bullets;
}

/**
 * Maps parsed DOCX data, tables, and bullets to resume schema
 * Combines extracted data into a text format and uses basic parsing logic
 * @param parsedData - The parsed DOCX content
 * @param tables - Extracted table data
 * @param bullets - Extracted bullet points
 * @returns ResumeData object
 */
export function mapToResumeSchema(parsedData: ParsedDocxData, tables: TableData[], bullets: string[]): ResumeData {
  // Extract plain text from HTML
  const plainText = parsedData.html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

  // Add table data as structured text
  let combinedText = plainText;
  tables.forEach((table, index) => {
    combinedText += `\n\nTable ${index + 1}:\n`;
    table.rows.forEach(row => {
      combinedText += row.join(' | ') + '\n';
    });
  });

  // Add bullets
  if (bullets.length > 0) {
    combinedText += '\n\nBullets:\n' + bullets.join('\n- ');
  }

  // Basic mapping to resume sections (simplified version of existing parser)
  const resumeData: ResumeData = {};

  // Extract personal info (basic regex)
  const emailMatch = combinedText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) {
    resumeData.personalInfo = { email: sanitizeString(emailMatch[0]) };
  }

  // Extract skills from bullets
  if (bullets.length > 0) {
    resumeData.skills = bullets.map(bullet => sanitizeString(bullet));
  }

  // For tables, assume first table is work experience, second is education, etc.
  if (tables.length > 0) {
    // Simple assumption: first table is work experience
    const workExp: any[] = [];
    tables[0].rows.slice(1).forEach(row => { // Skip header
      if (row.length >= 3) {
        workExp.push({
          title: sanitizeString(row[0] || ''),
          company: sanitizeString(row[1] || ''),
          description: sanitizeString(row[2] || '')
        });
      }
    });
    if (workExp.length > 0) {
      resumeData.workExperience = workExp;
    }
  }

  if (tables.length > 1) {
    // Second table as education
    const education: any[] = [];
    tables[1].rows.slice(1).forEach(row => {
      if (row.length >= 2) {
        education.push({
          degree: sanitizeString(row[0] || ''),
          university: sanitizeString(row[1] || '')
        });
      }
    });
    if (education.length > 0) {
      resumeData.education = education;
    }
  }

  // Extract summary (first paragraph)
  const paragraphs = combinedText.split('\n\n');
  if (paragraphs.length > 0) {
    resumeData.summary = sanitizeString(paragraphs[0]);
  }

  globalLogger.info('Mapped DOCX data to resume schema');
  return resumeData;
}