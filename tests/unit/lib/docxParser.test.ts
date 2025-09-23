/// <reference types="jest" />
import {
  parseDocxContent,
  extractTables,
  extractBullets,
  mapToResumeSchema,
  ParsedDocxData,
  TableData,
  ResumeData
} from '../../../backend/lib/docxParser';

// Mock dependencies
jest.mock('../../../backend/lib/validations', () => ({
  sanitizeString: jest.fn((str: string) => str), // Mock sanitizeString to return input unchanged for testing
}));

jest.mock('../../../backend/lib/logger', () => ({
  globalLogger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe('DOCX Parser Module', () => {
  const mockLogger = require('../../../backend/lib/logger').globalLogger;
  const mockSanitizeString = require('../../../backend/lib/validations').sanitizeString;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('parseDocxContent', () => {
    it('should successfully parse valid DOCX buffer', async () => {
      const mockBuffer = Buffer.from('mock docx content');
      const mockResult = {
        value: '<p>Parsed HTML content</p>',
        messages: [{ type: 'warning', message: 'Test warning' }],
      };

      const mammoth = require('mammoth');
      mammoth.convertToHtml.mockResolvedValue(mockResult);

      const result = await parseDocxContent(mockBuffer);

      expect(mammoth.convertToHtml).toHaveBeenCalledWith({ buffer: mockBuffer });
      expect(mockSanitizeString).toHaveBeenCalledWith('<p>Parsed HTML content</p>');
      expect(result).toEqual({
        html: '<p>Parsed HTML content</p>',
        messages: [{ type: 'warning', message: 'Test warning' }],
      });
      expect(mockLogger.info).toHaveBeenCalledWith('DOCX parsing completed successfully');
    });

    it('should handle parsing errors gracefully', async () => {
      const mockBuffer = Buffer.from('invalid docx');
      const mockError = new Error('Invalid DOCX format');

      const mammoth = require('mammoth');
      mammoth.convertToHtml.mockRejectedValue(mockError);

      await expect(parseDocxContent(mockBuffer)).rejects.toThrow('Failed to parse DOCX file: Invalid DOCX format');
      expect(mockLogger.error).toHaveBeenCalledWith('Error parsing DOCX content', mockError);
    });

    it('should handle empty buffer', async () => {
      const mockBuffer = Buffer.from('');
      const mockResult = {
        value: '',
        messages: [],
      };

      const mammoth = require('mammoth');
      mammoth.convertToHtml.mockResolvedValue(mockResult);

      const result = await parseDocxContent(mockBuffer);

      expect(result).toEqual({
        html: '',
        messages: [],
      });
    });

    it('should handle large DOCX files', async () => {
      const largeBuffer = Buffer.alloc(10 * 1024 * 1024, 'a'); // 10MB buffer
      const mockResult = {
        value: '<p>Large content</p>',
        messages: [],
      };

      const mammoth = require('mammoth');
      mammoth.convertToHtml.mockResolvedValue(mockResult);

      const result = await parseDocxContent(largeBuffer);

      expect(result.html).toBe('<p>Large content</p>');
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should sanitize HTML content for security', async () => {
      const mockBuffer = Buffer.from('content');
      const mockResult = {
        value: '<script>alert("xss")</script><p>Safe content</p>',
        messages: [],
      };

      const mammoth = require('mammoth');
      mammoth.convertToHtml.mockResolvedValue(mockResult);
      mockSanitizeString.mockReturnValue('<p>Safe content</p>');

      const result = await parseDocxContent(mockBuffer);

      expect(mockSanitizeString).toHaveBeenCalledWith('<script>alert("xss")</script><p>Safe content</p>');
      expect(result.html).toBe('<p>Safe content</p>');
    });
  });

  describe('extractTables', () => {
    it('should extract tables from HTML correctly', () => {
      const mockParsedData: ParsedDocxData = {
        html: `
          <table>
            <tr><td>Header1</td><td>Header2</td></tr>
            <tr><td>Data1</td><td>Data2</td></tr>
          </table>
          <table>
            <tr><td>Another</td></tr>
          </table>
        `,
        messages: [],
      };

      const tables = extractTables(mockParsedData);

      expect(tables).toHaveLength(2);
      expect(tables[0]).toEqual({
        rows: [['Header1', 'Header2'], ['Data1', 'Data2']],
      });
      expect(tables[1]).toEqual({
        rows: [['Another']],
      });
      expect(mockLogger.info).toHaveBeenCalledWith('Extracted 2 tables from DOCX');
    });

    it('should handle tables with th and td elements', () => {
      const mockParsedData: ParsedDocxData = {
        html: `
          <table>
            <tr><th>Name</th><th>Age</th></tr>
            <tr><td>John</td><td>30</td></tr>
          </table>
        `,
        messages: [],
      };

      const tables = extractTables(mockParsedData);

      expect(tables[0].rows).toEqual([['Name', 'Age'], ['John', '30']]);
    });

    it('should sanitize cell content', () => {
      const mockParsedData: ParsedDocxData = {
        html: `
          <table>
            <tr><td><script>alert(1)</script>Safe</td></tr>
          </table>
        `,
        messages: [],
      };

      extractTables(mockParsedData);

      expect(mockSanitizeString).toHaveBeenCalledWith('<script>alert(1)</script>Safe');
    });

    it('should handle empty tables', () => {
      const mockParsedData: ParsedDocxData = {
        html: '<table></table>',
        messages: [],
      };

      const tables = extractTables(mockParsedData);

      expect(tables).toHaveLength(0);
    });

    it('should handle tables with empty cells', () => {
      const mockParsedData: ParsedDocxData = {
        html: `
          <table>
            <tr><td></td><td>Data</td></tr>
          </table>
        `,
        messages: [],
      };

      const tables = extractTables(mockParsedData);

      expect(tables[0].rows).toEqual([['', 'Data']]);
    });

    it('should handle large tables with many rows', () => {
      const rows = Array.from({ length: 1000 }, (_, i) => `<tr><td>Row${i}</td></tr>`).join('');
      const mockParsedData: ParsedDocxData = {
        html: `<table>${rows}</table>`,
        messages: [],
      };

      const tables = extractTables(mockParsedData);

      expect(tables[0].rows).toHaveLength(1000);
    });

    it('should handle special characters in table cells', () => {
      const mockParsedData: ParsedDocxData = {
        html: `
          <table>
            <tr><td>Café & résumé</td><td>© 2023</td></tr>
          </table>
        `,
        messages: [],
      };

      const tables = extractTables(mockParsedData);

      expect(tables[0].rows).toEqual([['Café & résumé', '© 2023']]);
    });

    it('should skip rows with no cells', () => {
      const mockParsedData: ParsedDocxData = {
        html: `
          <table>
            <tr></tr>
            <tr><td>Data</td></tr>
          </table>
        `,
        messages: [],
      };

      const tables = extractTables(mockParsedData);

      expect(tables[0].rows).toEqual([['Data']]);
    });
  });

  describe('extractBullets', () => {
    it('should extract bullets from unordered lists', () => {
      const mockParsedData: ParsedDocxData = {
        html: `
          <ul>
            <li>Bullet 1</li>
            <li>Bullet 2</li>
          </ul>
        `,
        messages: [],
      };

      const bullets = extractBullets(mockParsedData);

      expect(bullets).toEqual(['Bullet 1', 'Bullet 2']);
      expect(mockLogger.info).toHaveBeenCalledWith('Extracted 2 bullet points from DOCX');
    });

    it('should extract bullets from ordered lists', () => {
      const mockParsedData: ParsedDocxData = {
        html: `
          <ol>
            <li>Item 1</li>
            <li>Item 2</li>
          </ol>
        `,
        messages: [],
      };

      const bullets = extractBullets(mockParsedData);

      expect(bullets).toEqual(['Item 1', 'Item 2']);
    });

    it('should handle nested lists', () => {
      const mockParsedData: ParsedDocxData = {
        html: `
          <ul>
            <li>Parent
              <ul>
                <li>Child 1</li>
                <li>Child 2</li>
              </ul>
            </li>
          </ul>
        `,
        messages: [],
      };

      const bullets = extractBullets(mockParsedData);

      expect(bullets).toEqual(['Parent', 'Child 1', 'Child 2']);
    });

    it('should sanitize bullet content', () => {
      const mockParsedData: ParsedDocxData = {
        html: `
          <ul>
            <li><b>Bold</b> text</li>
          </ul>
        `,
        messages: [],
      };

      extractBullets(mockParsedData);

      expect(mockSanitizeString).toHaveBeenCalledWith('<b>Bold</b> text');
    });

    it('should skip empty bullets', () => {
      const mockParsedData: ParsedDocxData = {
        html: `
          <ul>
            <li></li>
            <li>Valid bullet</li>
          </ul>
        `,
        messages: [],
      };

      const bullets = extractBullets(mockParsedData);

      expect(bullets).toEqual(['Valid bullet']);
    });

    it('should handle special characters in bullets', () => {
      const mockParsedData: ParsedDocxData = {
        html: `
          <ul>
            <li>Café & résumé</li>
            <li>© 2023</li>
          </ul>
        `,
        messages: [],
      };

      const bullets = extractBullets(mockParsedData);

      expect(bullets).toEqual(['Café & résumé', '© 2023']);
    });

    it('should handle large number of bullets', () => {
      const bulletsHtml = Array.from({ length: 500 }, (_, i) => `<li>Bullet ${i}</li>`).join('');
      const mockParsedData: ParsedDocxData = {
        html: `<ul>${bulletsHtml}</ul>`,
        messages: [],
      };

      const bullets = extractBullets(mockParsedData);

      expect(bullets).toHaveLength(500);
    });
  });

  describe('mapToResumeSchema', () => {
    it('should map basic data to resume schema', () => {
      const mockParsedData: ParsedDocxData = {
        html: 'John Doe john@example.com Professional summary',
        messages: [],
      };
      const mockTables: TableData[] = [];
      const mockBullets: string[] = ['Skill 1', 'Skill 2'];

      const result = mapToResumeSchema(mockParsedData, mockTables, mockBullets);

      expect(result.personalInfo).toEqual({ email: 'john@example.com' });
      expect(result.skills).toEqual(['Skill 1', 'Skill 2']);
      expect(result.summary).toBe('John Doe john@example.com Professional summary');
      expect(mockLogger.info).toHaveBeenCalledWith('Mapped DOCX data to resume schema');
    });

    it('should extract email from text', () => {
      const mockParsedData: ParsedDocxData = {
        html: 'Contact: test.email@domain.com',
        messages: [],
      };

      const result = mapToResumeSchema(mockParsedData, [], []);

      expect(result.personalInfo).toEqual({ email: 'test.email@domain.com' });
    });

    it('should map work experience from tables', () => {
      const mockTables: TableData[] = [
        {
          rows: [
            ['Title', 'Company', 'Description'],
            ['Developer', 'Tech Corp', 'Built applications'],
            ['Manager', 'Biz Inc', 'Led team'],
          ],
        },
      ];

      const result = mapToResumeSchema({ html: '', messages: [] }, mockTables, []);

      expect(result.workExperience).toEqual([
        { title: 'Developer', company: 'Tech Corp', description: 'Built applications' },
        { title: 'Manager', company: 'Biz Inc', description: 'Led team' },
      ]);
    });

    it('should map education from second table', () => {
      const mockTables: TableData[] = [
        { rows: [['Title', 'Company']] },
        {
          rows: [
            ['Degree', 'University'],
            ['Bachelor', 'State University'],
          ],
        },
      ];

      const result = mapToResumeSchema({ html: '', messages: [] }, mockTables, []);

      expect(result.education).toEqual([
        { degree: 'Bachelor', university: 'State University' },
      ]);
    });

    it('should handle tables with insufficient columns', () => {
      const mockTables: TableData[] = [
        {
          rows: [
            ['Title', 'Company'],
            ['Developer'], // Missing company and description
          ],
        },
      ];

      const result = mapToResumeSchema({ html: '', messages: [] }, mockTables, []);

      expect(result.workExperience).toEqual([]); // Should not include incomplete rows
    });

    it('should sanitize all extracted data', () => {
      const mockParsedData: ParsedDocxData = {
        html: '<script>alert(1)</script>Summary',
        messages: [],
      };
      const mockTables: TableData[] = [
        {
          rows: [
            ['<b>Title</b>', 'Company'],
          ],
        },
      ];
      const mockBullets: string[] = ['<i>Skill</i>'];

      mapToResumeSchema(mockParsedData, mockTables, mockBullets);

      expect(mockSanitizeString).toHaveBeenCalledTimes(4); // summary, title, skill, and email extraction
    });

    it('should handle empty inputs', () => {
      const result = mapToResumeSchema({ html: '', messages: [] }, [], []);

      expect(result).toEqual({});
    });

    it('should extract summary from first paragraph', () => {
      const mockParsedData: ParsedDocxData = {
        html: 'First paragraph\n\nSecond paragraph\n\nThird paragraph',
        messages: [],
      };

      const result = mapToResumeSchema(mockParsedData, [], []);

      expect(result.summary).toBe('First paragraph');
    });

    it('should handle special characters in mapping', () => {
      const mockParsedData: ParsedDocxData = {
        html: 'Name: José María résumé@domain.com',
        messages: [],
      };

      const result = mapToResumeSchema(mockParsedData, [], []);

      expect(result.personalInfo).toEqual({ email: 'résumé@domain.com' });
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete DOCX parsing workflow', async () => {
      const mockBuffer = Buffer.from('docx content');
      const mockResult = {
        value: `
          <p>John Doe john@example.com</p>
          <table>
            <tr><td>Title</td><td>Company</td><td>Description</td></tr>
            <tr><td>Developer</td><td>Tech Corp</td><td>Built apps</td></tr>
          </table>
          <ul>
            <li>JavaScript</li>
            <li>React</li>
          </ul>
        `,
        messages: [],
      };

      const mammoth = require('mammoth');
      mammoth.convertToHtml.mockResolvedValue(mockResult);

      const parsedData = await parseDocxContent(mockBuffer);
      const tables = extractTables(parsedData);
      const bullets = extractBullets(parsedData);
      const resume = mapToResumeSchema(parsedData, tables, bullets);

      expect(resume.personalInfo).toEqual({ email: 'john@example.com' });
      expect(resume.workExperience).toHaveLength(1);
      expect(resume.skills).toEqual(['JavaScript', 'React']);
    });

    it('should handle malformed HTML gracefully', () => {
      const mockParsedData: ParsedDocxData = {
        html: '<table><tr><td>Unclosed tags',
        messages: [],
      };

      const tables = extractTables(mockParsedData);
      const bullets = extractBullets(mockParsedData);

      expect(tables).toHaveLength(0);
      expect(bullets).toHaveLength(0);
    });

    it('should handle concurrent parsing operations', async () => {
      const buffers = [
        Buffer.from('docx1'),
        Buffer.from('docx2'),
        Buffer.from('docx3'),
      ];

      const mammoth = require('mammoth');
      mammoth.convertToHtml
        .mockResolvedValueOnce({ value: '<p>Content 1</p>', messages: [] })
        .mockResolvedValueOnce({ value: '<p>Content 2</p>', messages: [] })
        .mockResolvedValueOnce({ value: '<p>Content 3</p>', messages: [] });

      const results = await Promise.all(buffers.map(parseDocxContent));

      expect(results).toHaveLength(3);
      expect(results[0].html).toBe('<p>Content 1</p>');
      expect(results[1].html).toBe('<p>Content 2</p>');
      expect(results[2].html).toBe('<p>Content 3</p>');
    });
  });
});