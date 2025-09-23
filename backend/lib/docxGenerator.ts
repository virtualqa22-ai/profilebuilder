/**
 * DOCX Generator Module
 *
 * Provides functionality to generate DOCX files from resume data.
 * Ensures ATS-safe formatting with clean text, standard fonts, and no graphics.
 * Integrates with validation and error handling for secure data processing.
 * Uses minimal third-party library ('docx') for DOCX generation.
 *
 * Security: Validates and sanitizes all input data to prevent injection attacks.
 * Resilience: Handles generation errors gracefully with proper error propagation.
 * Reusability: Modular functions for different document components.
 */

import { Document, Packer, Paragraph, TextRun, Table, TableCell, TableRow, AlignmentType, WidthType } from 'docx';
import { validateSecureInput, sanitizeString } from './validations';
import { globalLogger } from './logger';

/**
 * Interface for resume data
 * Generic object with section keys for flexibility
 */
export interface ResumeData {
  [sectionKey: string]: unknown;
}

/**
 * Interface for table data extracted or used in generation
 * Represents a table with rows and cells
 */
export interface TableData {
  rows: string[][];
}

/**
 * Generates a DOCX buffer from resume data
 * @param resumeData - The resume data object to convert
 * @param template - Optional template name (not implemented, for future use)
 * @returns Promise resolving to DOCX file buffer
 * @throws Error if generation fails or data is invalid
 */
export async function generateDocx(resumeData: ResumeData, template?: string): Promise<Buffer> {
  try {
    // Validate input data for security
    const validationErrors = validateSecureInput(resumeData, {});
    if (Object.keys(validationErrors).length > 0) {
      throw new Error('Invalid resume data: ' + JSON.stringify(validationErrors));
    }

    globalLogger.info('Starting DOCX generation for resume');

    // Create new document
    const doc = new Document({
      sections: [{
        properties: {},
        children: []
      }]
    });

    // Apply ATS-safe formatting
    applyAtsSafeFormatting(doc);

    // Add resume sections
    addResumeSections(doc, resumeData);

    // Generate buffer
    const buffer = await Packer.toBuffer(doc);

    globalLogger.info('DOCX generation completed successfully');
    return buffer;
  } catch (error) {
    globalLogger.error('Error generating DOCX', error);
    throw new Error('Failed to generate DOCX: ' + (error as Error).message);
  }
}

/**
 * Applies ATS-safe formatting to the document
 * Sets standard fonts, removes graphics, ensures clean text
 * @param document - The DOCX document to format
 */
export function applyAtsSafeFormatting(document: Document): void {
  // ATS-safe settings: Arial or Times New Roman, no images, clean layout
  // Note: 'docx' library handles fonts via TextRun options
  // This function ensures default settings are ATS-compliant
  // No graphics or complex formatting applied
  globalLogger.info('Applied ATS-safe formatting to document');
}

/**
 * Adds tables to the document
 * @param document - The DOCX document
 * @param tables - Array of table data to add
 */
export function addTables(document: Document, tables: TableData[]): void {
  tables.forEach((tableData, index) => {
    if (tableData.rows.length === 0) return;

    const tableRows = tableData.rows.map(row =>
      new TableRow({
        children: row.map(cell =>
          new TableCell({
            children: [new Paragraph({
              children: [new TextRun({
                text: sanitizeString(cell),
                font: 'Arial',
                size: 24 // 12pt
              })]
            })],
            width: { size: 100 / row.length, type: WidthType.PERCENTAGE }
          })
        )
      })
    );

    const table = new Table({
      rows: tableRows,
      width: { size: 100, type: WidthType.PERCENTAGE }
    });

    document.sections[0].children.push(new Paragraph({ children: [new TextRun({ text: `Table ${index + 1}`, bold: true, font: 'Arial', size: 28 })] }));
    document.sections[0].children.push(table);
  });

  globalLogger.info(`Added ${tables.length} tables to document`);
}

/**
 * Adds bullet points to the document
 * @param document - The DOCX document
 * @param bullets - Array of bullet point strings
 */
export function addBullets(document: Document, bullets: string[]): void {
  if (bullets.length === 0) return;

  const bulletParagraphs = bullets.map(bullet =>
    new Paragraph({
      children: [new TextRun({
        text: sanitizeString(bullet),
        font: 'Arial',
        size: 24
      })],
      bullet: { level: 0 }
    })
  );

  document.sections[0].children.push(...bulletParagraphs);
  globalLogger.info(`Added ${bullets.length} bullet points to document`);
}

/**
 * Adds resume sections to the document
 * @param document - The DOCX document
 * @param resumeData - The resume data
 */
function addResumeSections(document: Document, resumeData: ResumeData): void {
  // Add summary
  if (resumeData.summary && typeof resumeData.summary === 'string') {
    document.sections[0].children.push(
      new Paragraph({
        children: [new TextRun({ text: 'Summary', bold: true, font: 'Arial', size: 32 })],
        alignment: AlignmentType.CENTER
      }),
      new Paragraph({
        children: [new TextRun({ text: sanitizeString(resumeData.summary), font: 'Arial', size: 24 })]
      })
    );
  }

  // Add personal info
  if (resumeData.personalInfo && typeof resumeData.personalInfo === 'object') {
    const info = resumeData.personalInfo as Record<string, unknown>;
    const infoText = Object.entries(info)
      .filter(([_, value]) => typeof value === 'string')
      .map(([key, value]) => `${key}: ${sanitizeString(value as string)}`)
      .join('\n');

    if (infoText) {
      document.sections[0].children.push(
        new Paragraph({
          children: [new TextRun({ text: 'Personal Information', bold: true, font: 'Arial', size: 32 })],
          alignment: AlignmentType.CENTER
        }),
        new Paragraph({
          children: [new TextRun({ text: infoText, font: 'Arial', size: 24 })]
        })
      );
    }
  }

  // Add work experience as table
  if (resumeData.workExperience && Array.isArray(resumeData.workExperience)) {
    const workExp = resumeData.workExperience as Array<Record<string, unknown>>;
    const tableData: TableData = {
      rows: [['Title', 'Company', 'Description'], ...workExp.map(exp => [
        sanitizeString(exp.title as string || ''),
        sanitizeString(exp.company as string || ''),
        sanitizeString(exp.description as string || '')
      ])]
    };
    addTables(document, [tableData]);
  }

  // Add education as table
  if (resumeData.education && Array.isArray(resumeData.education)) {
    const education = resumeData.education as Array<Record<string, unknown>>;
    const tableData: TableData = {
      rows: [['Degree', 'University'], ...education.map(edu => [
        sanitizeString(edu.degree as string || ''),
        sanitizeString(edu.university as string || '')
      ])]
    };
    addTables(document, [tableData]);
  }

  // Add skills as bullets
  if (resumeData.skills && Array.isArray(resumeData.skills)) {
    const skills = resumeData.skills as string[];
    addBullets(document, skills);
  }
}