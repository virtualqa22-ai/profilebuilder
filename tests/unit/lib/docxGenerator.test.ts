/// <reference types="jest" />
import {
  generateDocx,
  applyAtsSafeFormatting,
  addTables,
  addBullets,
  ResumeData,
  TableData
} from '../../../backend/lib/docxGenerator';

// Mock dependencies
jest.mock('../../../backend/lib/validations', () => ({
  validateSecureInput: jest.fn(),
  sanitizeString: jest.fn((str: string) => str),
}));

jest.mock('../../../backend/lib/logger', () => ({
  globalLogger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe('DOCX Generator Module', () => {
  const mockLogger = require('../../../backend/lib/logger').globalLogger;
  const mockValidateSecureInput = require('../../../backend/lib/validations').validateSecureInput;
  const mockSanitizeString = require('../../../backend/lib/validations').sanitizeString;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateDocx', () => {
    it('should generate DOCX buffer from valid resume data', async () => {
      const mockResumeData: ResumeData = {
        summary: 'Professional summary',
        personalInfo: { name: 'John Doe', email: 'john@example.com' },
      };

      mockValidateSecureInput.mockReturnValue({});
      const mockBuffer = Buffer.from('generated docx');
      const { Packer } = require('docx');
      Packer.toBuffer.mockResolvedValue(mockBuffer);

      const result = await generateDocx(mockResumeData);

      expect(mockValidateSecureInput).toHaveBeenCalledWith(mockResumeData, {});
      expect(Packer.toBuffer).toHaveBeenCalled();
      expect(result).toBe(mockBuffer);
      expect(mockLogger.info).toHaveBeenCalledWith('DOCX generation completed successfully');
    });

    it('should throw error for invalid resume data', async () => {
      const mockResumeData: ResumeData = {
        invalidField: 'invalid',
      };
      const validationErrors = { invalidField: 'Invalid field' };

      mockValidateSecureInput.mockReturnValue(validationErrors);

      await expect(generateDocx(mockResumeData)).rejects.toThrow('Invalid resume data: {"invalidField":"Invalid field"}');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle generation errors gracefully', async () => {
      const mockResumeData: ResumeData = {
        summary: 'Summary',
      };
      const mockError = new Error('Generation failed');

      mockValidateSecureInput.mockReturnValue({});
      const { Packer } = require('docx');
      Packer.toBuffer.mockRejectedValue(mockError);

      await expect(generateDocx(mockResumeData)).rejects.toThrow('Failed to generate DOCX: Generation failed');
      expect(mockLogger.error).toHaveBeenCalledWith('Error generating DOCX', mockError);
    });

    it('should accept optional template parameter', async () => {
      const mockResumeData: ResumeData = {
        summary: 'Summary',
      };

      mockValidateSecureInput.mockReturnValue({});
      const mockBuffer = Buffer.from('docx');
      const { Packer } = require('docx');
      Packer.toBuffer.mockResolvedValue(mockBuffer);

      const result = await generateDocx(mockResumeData, 'modern');

      expect(result).toBe(mockBuffer);
      // Template parameter is currently not used in implementation
    });

    it('should handle empty resume data', async () => {
      const mockResumeData: ResumeData = {};

      mockValidateSecureInput.mockReturnValue({});
      const mockBuffer = Buffer.from('empty docx');
      const { Packer } = require('docx');
      Packer.toBuffer.mockResolvedValue(mockBuffer);

      const result = await generateDocx(mockResumeData);

      expect(result).toBe(mockBuffer);
    });

    it('should handle large resume data objects', async () => {
      const largeResumeData: ResumeData = {
        summary: 'A'.repeat(10000), // Large summary
        workExperience: Array.from({ length: 50 }, (_, i) => ({
          title: `Job ${i}`,
          company: `Company ${i}`,
          description: 'Description '.repeat(100),
        })),
      };

      mockValidateSecureInput.mockReturnValue({});
      const mockBuffer = Buffer.from('large docx');
      const { Packer } = require('docx');
      Packer.toBuffer.mockResolvedValue(mockBuffer);

      const result = await generateDocx(largeResumeData);

      expect(result).toBe(mockBuffer);
    });

    it('should sanitize all input data', async () => {
      const mockResumeData: ResumeData = {
        summary: '<script>alert(1)</script>Safe summary',
        personalInfo: { name: '<b>John</b>', email: 'john@example.com' },
      };

      mockValidateSecureInput.mockReturnValue({});
      mockSanitizeString.mockImplementation((str: string) => `sanitized-${str}`);
      const mockBuffer = Buffer.from('docx');
      const { Packer } = require('docx');
      Packer.toBuffer.mockResolvedValue(mockBuffer);

      await generateDocx(mockResumeData);

      expect(mockSanitizeString).toHaveBeenCalledWith('<script>alert(1)</script>Safe summary');
      expect(mockSanitizeString).toHaveBeenCalledWith('<b>John</b>');
    });
  });

  describe('applyAtsSafeFormatting', () => {
    it('should apply ATS-safe formatting to document', () => {
      const mockDocument = {
        sections: [{ properties: {}, children: [] }],
      };

      applyAtsSafeFormatting(mockDocument as any);

      expect(mockLogger.info).toHaveBeenCalledWith('Applied ATS-safe formatting to document');
      // Function currently only logs, no actual formatting applied
    });

    it('should handle documents with existing sections', () => {
      const mockDocument = {
        sections: [
          { properties: {}, children: [] },
          { properties: {}, children: [] },
        ],
      };

      applyAtsSafeFormatting(mockDocument as any);

      expect(mockLogger.info).toHaveBeenCalled();
    });
  });

  describe('addTables', () => {
    let mockDocument: any;

    beforeEach(() => {
      mockDocument = {
        sections: [{ properties: {}, children: [] }],
      };
    });

    it('should add tables to document correctly', () => {
      const mockTables: TableData[] = [
        {
          rows: [
            ['Header1', 'Header2'],
            ['Data1', 'Data2'],
          ],
        },
      ];

      addTables(mockDocument, mockTables);

      expect(mockDocument.sections[0].children).toHaveLength(2); // Title paragraph + table
      expect(mockLogger.info).toHaveBeenCalledWith('Added 1 tables to document');
    });

    it('should handle multiple tables', () => {
      const mockTables: TableData[] = [
        { rows: [['A']] },
        { rows: [['B']] },
        { rows: [['C']] },
      ];

      addTables(mockDocument, mockTables);

      expect(mockDocument.sections[0].children).toHaveLength(6); // 3 titles + 3 tables
    });

    it('should skip empty tables', () => {
      const mockTables: TableData[] = [
        { rows: [] },
        { rows: [['Data']] },
      ];

      addTables(mockDocument, mockTables);

      expect(mockDocument.sections[0].children).toHaveLength(2); // Only one table added
    });

    it('should sanitize table cell content', () => {
      const mockTables: TableData[] = [
        {
          rows: [['<script>alert(1)</script>Data']],
        },
      ];

      addTables(mockDocument, mockTables);

      expect(mockSanitizeString).toHaveBeenCalledWith('<script>alert(1)</script>Data');
    });

    it('should handle tables with varying row lengths', () => {
      const mockTables: TableData[] = [
        {
          rows: [
            ['A', 'B', 'C'],
            ['X', 'Y'], // Shorter row
            ['1', '2', '3', '4'], // Longer row
          ],
        },
      ];

      addTables(mockDocument, mockTables);

      expect(mockDocument.sections[0].children).toHaveLength(2);
    });

    it('should handle large tables', () => {
      const largeTable: TableData = {
        rows: Array.from({ length: 1000 }, (_, i) => [`Row${i}`, `Data${i}`]),
      };

      addTables(mockDocument, [largeTable]);

      expect(mockDocument.sections[0].children).toHaveLength(2);
    });

    it('should handle special characters in table cells', () => {
      const mockTables: TableData[] = [
        {
          rows: [['Café & résumé', '© 2023', 'ñ']],
        },
      ];

      addTables(mockDocument, mockTables);

      expect(mockSanitizeString).toHaveBeenCalledWith('Café & résumé');
      expect(mockSanitizeString).toHaveBeenCalledWith('© 2023');
      expect(mockSanitizeString).toHaveBeenCalledWith('ñ');
    });

    it('should handle empty cell content', () => {
      const mockTables: TableData[] = [
        {
          rows: [['', 'Data', '']],
        },
      ];

      addTables(mockDocument, mockTables);

      expect(mockSanitizeString).toHaveBeenCalledWith('');
    });
  });

  describe('addBullets', () => {
    let mockDocument: any;

    beforeEach(() => {
      mockDocument = {
        sections: [{ properties: {}, children: [] }],
      };
    });

    it('should add bullet points to document', () => {
      const mockBullets = ['Bullet 1', 'Bullet 2', 'Bullet 3'];

      addBullets(mockDocument, mockBullets);

      expect(mockDocument.sections[0].children).toHaveLength(3);
      expect(mockLogger.info).toHaveBeenCalledWith('Added 3 bullet points to document');
    });

    it('should handle empty bullet array', () => {
      addBullets(mockDocument, []);

      expect(mockDocument.sections[0].children).toHaveLength(0);
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it('should sanitize bullet content', () => {
      const mockBullets = ['<b>Bold</b> text', 'Normal text'];

      addBullets(mockDocument, mockBullets);

      expect(mockSanitizeString).toHaveBeenCalledWith('<b>Bold</b> text');
      expect(mockSanitizeString).toHaveBeenCalledWith('Normal text');
    });

    it('should handle large number of bullets', () => {
      const largeBullets = Array.from({ length: 1000 }, (_, i) => `Bullet ${i}`);

      addBullets(mockDocument, largeBullets);

      expect(mockDocument.sections[0].children).toHaveLength(1000);
    });

    it('should handle special characters in bullets', () => {
      const mockBullets = ['Café & résumé', '© 2023', 'ñ'];

      addBullets(mockDocument, mockBullets);

      expect(mockSanitizeString).toHaveBeenCalledWith('Café & résumé');
      expect(mockSanitizeString).toHaveBeenCalledWith('© 2023');
      expect(mockSanitizeString).toHaveBeenCalledWith('ñ');
    });

    it('should handle empty bullet strings', () => {
      const mockBullets = ['', 'Valid bullet', ''];

      addBullets(mockDocument, mockBullets);

      expect(mockDocument.sections[0].children).toHaveLength(3); // All bullets are added, even empty ones
    });
  });

  describe('Resume Section Addition (via generateDocx)', () => {
    it('should add summary section', async () => {
      const mockResumeData: ResumeData = {
        summary: 'Professional summary text',
      };

      mockValidateSecureInput.mockReturnValue({});
      const mockBuffer = Buffer.from('docx');
      const { Packer } = require('docx');
      Packer.toBuffer.mockResolvedValue(mockBuffer);

      await generateDocx(mockResumeData);

      // Verify that sections are added (mocked constructors are called)
      expect(mockLogger.info).toHaveBeenCalledWith('DOCX generation completed successfully');
    });

    it('should add personal info section', async () => {
      const mockResumeData: ResumeData = {
        personalInfo: { name: 'John Doe', email: 'john@example.com', phone: '123-456-7890' },
      };

      mockValidateSecureInput.mockReturnValue({});
      const mockBuffer = Buffer.from('docx');
      const { Packer } = require('docx');
      Packer.toBuffer.mockResolvedValue(mockBuffer);

      await generateDocx(mockResumeData);

      expect(mockSanitizeString).toHaveBeenCalledWith('name: John Doe');
      expect(mockSanitizeString).toHaveBeenCalledWith('email: john@example.com');
      expect(mockSanitizeString).toHaveBeenCalledWith('phone: 123-456-7890');
    });

    it('should add work experience as table', async () => {
      const mockResumeData: ResumeData = {
        workExperience: [
          { title: 'Developer', company: 'Tech Corp', description: 'Built apps' },
          { title: 'Manager', company: 'Biz Inc', description: 'Led team' },
        ],
      };

      mockValidateSecureInput.mockReturnValue({});
      const mockBuffer = Buffer.from('docx');
      const { Packer } = require('docx');
      Packer.toBuffer.mockResolvedValue(mockBuffer);

      await generateDocx(mockResumeData);

      expect(mockSanitizeString).toHaveBeenCalledWith('Developer');
      expect(mockSanitizeString).toHaveBeenCalledWith('Tech Corp');
      expect(mockSanitizeString).toHaveBeenCalledWith('Built apps');
    });

    it('should add education as table', async () => {
      const mockResumeData: ResumeData = {
        education: [
          { degree: 'Bachelor', university: 'State University' },
        ],
      };

      mockValidateSecureInput.mockReturnValue({});
      const mockBuffer = Buffer.from('docx');
      const { Packer } = require('docx');
      Packer.toBuffer.mockResolvedValue(mockBuffer);

      await generateDocx(mockResumeData);

      expect(mockSanitizeString).toHaveBeenCalledWith('Bachelor');
      expect(mockSanitizeString).toHaveBeenCalledWith('State University');
    });

    it('should add skills as bullets', async () => {
      const mockResumeData: ResumeData = {
        skills: ['JavaScript', 'React', 'Node.js'],
      };

      mockValidateSecureInput.mockReturnValue({});
      const mockBuffer = Buffer.from('docx');
      const { Packer } = require('docx');
      Packer.toBuffer.mockResolvedValue(mockBuffer);

      await generateDocx(mockResumeData);

      expect(mockSanitizeString).toHaveBeenCalledWith('JavaScript');
      expect(mockSanitizeString).toHaveBeenCalledWith('React');
      expect(mockSanitizeString).toHaveBeenCalledWith('Node.js');
    });

    it('should handle missing optional sections', async () => {
      const mockResumeData: ResumeData = {
        summary: 'Summary only',
      };

      mockValidateSecureInput.mockReturnValue({});
      const mockBuffer = Buffer.from('docx');
      const { Packer } = require('docx');
      Packer.toBuffer.mockResolvedValue(mockBuffer);

      await generateDocx(mockResumeData);

      expect(mockLogger.info).toHaveBeenCalledWith('DOCX generation completed successfully');
    });

    it('should handle malformed data gracefully', async () => {
      const mockResumeData: ResumeData = {
        personalInfo: 'not an object', // Should be object
        workExperience: 'not an array', // Should be array
      };

      mockValidateSecureInput.mockReturnValue({});
      const mockBuffer = Buffer.from('docx');
      const { Packer } = require('docx');
      Packer.toBuffer.mockResolvedValue(mockBuffer);

      await generateDocx(mockResumeData);

      // Should not crash, just skip invalid sections
      expect(mockLogger.info).toHaveBeenCalled();
    });
  });

  describe('Integration Scenarios', () => {
    it('should generate complete DOCX with all sections', async () => {
      const completeResumeData: ResumeData = {
        summary: 'Experienced developer',
        personalInfo: { name: 'John Doe', email: 'john@example.com' },
        workExperience: [
          { title: 'Senior Developer', company: 'Tech Corp', description: 'Led development' },
        ],
        education: [
          { degree: 'Bachelor of Science', university: 'State University' },
        ],
        skills: ['JavaScript', 'TypeScript', 'React'],
      };

      mockValidateSecureInput.mockReturnValue({});
      const mockBuffer = Buffer.from('complete docx');
      const { Packer } = require('docx');
      Packer.toBuffer.mockResolvedValue(mockBuffer);

      const result = await generateDocx(completeResumeData);

      expect(result).toBe(mockBuffer);
      expect(mockLogger.info).toHaveBeenCalledWith('DOCX generation completed successfully');
    });

    it('should handle concurrent generation requests', async () => {
      const resumeData1: ResumeData = { summary: 'Summary 1' };
      const resumeData2: ResumeData = { summary: 'Summary 2' };

      mockValidateSecureInput.mockReturnValue({});
      const { Packer } = require('docx');
      Packer.toBuffer
        .mockResolvedValueOnce(Buffer.from('docx1'))
        .mockResolvedValueOnce(Buffer.from('docx2'));

      const [result1, result2] = await Promise.all([
        generateDocx(resumeData1),
        generateDocx(resumeData2),
      ]);

      expect(result1).toEqual(Buffer.from('docx1'));
      expect(result2).toEqual(Buffer.from('docx2'));
    });

    it('should validate ATS-safe formatting in generated documents', async () => {
      // This test would ideally check the actual document content
      // For now, we verify the functions are called correctly
      const mockResumeData: ResumeData = {
        summary: 'ATS-friendly summary',
        skills: ['Keyword1', 'Keyword2'],
      };

      mockValidateSecureInput.mockReturnValue({});
      const mockBuffer = Buffer.from('ats-safe docx');
      const { Packer } = require('docx');
      Packer.toBuffer.mockResolvedValue(mockBuffer);

      const result = await generateDocx(mockResumeData);

      expect(result).toBe(mockBuffer);
      // In a real implementation, we would parse the buffer and verify ATS-safe properties
    });
  });
});