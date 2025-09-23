/// <reference types="jest" />
import {
  parseDocxContent,
  extractTables,
  extractBullets,
  mapToResumeSchema,
  ParsedDocxData
} from '../../backend/lib/docxParser';
import { generateDocx, ResumeData } from '../../backend/lib/docxGenerator';

// Mock dependencies
jest.mock('../../backend/lib/validations', () => ({
  validateSecureInput: jest.fn(() => ({})),
  sanitizeString: jest.fn((str: string) => str),
}));

jest.mock('../../backend/lib/logger', () => ({
  globalLogger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe('DOCX Roundtrip Integration Tests', () => {
  const mockLogger = require('../../backend/lib/logger').globalLogger;
  const mockValidateSecureInput = require('../../backend/lib/validations').validateSecureInput;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Roundtrip: Parse -> Map -> Generate', () => {
    it('should successfully roundtrip simple resume data', async () => {
      // Original DOCX content simulation
      const originalHtml = `
        <p>John Doe is a skilled developer with 5 years of experience.</p>
        <p>Email: john.doe@example.com</p>
        <table>
          <tr><th>Title</th><th>Company</th><th>Description</th></tr>
          <tr><td>Senior Developer</td><td>Tech Corp</td><td>Led development team</td></tr>
          <tr><td>Junior Developer</td><td>StartUp Inc</td><td>Built web applications</td></tr>
        </table>
        <ul>
          <li>JavaScript</li>
          <li>React</li>
          <li>Node.js</li>
        </ul>
      `;

      const mockParsedData: ParsedDocxData = {
        html: originalHtml,
        messages: [],
      };

      // Mock mammoth to return our test HTML
      const mammoth = require('mammoth');
      mammoth.convertToHtml.mockResolvedValue({
        value: originalHtml,
        messages: [],
      });

      // Mock docx Packer
      const mockGeneratedBuffer = Buffer.from('generated-docx-content');
      const { Packer } = require('docx');
      Packer.toBuffer.mockResolvedValue(mockGeneratedBuffer);

      // Step 1: Parse DOCX
      const mockBuffer = Buffer.from('original-docx');
      const parsedData = await parseDocxContent(mockBuffer);

      // Step 2: Extract components
      const tables = extractTables(parsedData);
      const bullets = extractBullets(parsedData);

      // Step 3: Map to resume schema
      const resumeData = mapToResumeSchema(parsedData, tables, bullets);

      // Step 4: Generate new DOCX
      const generatedBuffer = await generateDocx(resumeData);

      // Assertions
      expect(parsedData.html).toContain('John Doe');
      expect(tables).toHaveLength(1);
      expect(tables[0].rows).toHaveLength(3); // Header + 2 data rows
      expect(bullets).toEqual(['JavaScript', 'React', 'Node.js']);
      expect(resumeData.personalInfo).toEqual({ email: 'john.doe@example.com' });
      expect(resumeData.workExperience).toHaveLength(2);
      expect(resumeData.skills).toEqual(['JavaScript', 'React', 'Node.js']);
      expect(generatedBuffer).toBe(mockGeneratedBuffer);

      expect(mockLogger.info).toHaveBeenCalledWith('DOCX parsing completed successfully');
      expect(mockLogger.info).toHaveBeenCalledWith('Mapped DOCX data to resume schema');
      expect(mockLogger.info).toHaveBeenCalledWith('DOCX generation completed successfully');
    });

    it('should handle complex resume with multiple sections', async () => {
      const complexHtml = `
        <p>Experienced software engineer with expertise in full-stack development.</p>
        <p>Contact: jane.smith@company.com | Phone: 555-0123</p>
        <h2>Work Experience</h2>
        <table>
          <tr><th>Position</th><th>Company</th><th>Duration</th><th>Description</th></tr>
          <tr><td>Lead Developer</td><td>Big Tech</td><td>2020-Present</td><td>Architected scalable systems</td></tr>
          <tr><td>Senior Developer</td><td>Mid Corp</td><td>2018-2020</td><td>Developed microservices</td></tr>
        </table>
        <h2>Education</h2>
        <table>
          <tr><th>Degree</th><th>University</th><th>Year</th></tr>
          <tr><td>MS Computer Science</td><td>State University</td><td>2018</td></tr>
          <tr><td>BS Computer Science</td><td>State University</td><td>2016</td></tr>
        </table>
        <h2>Skills</h2>
        <ul>
          <li>Programming Languages: JavaScript, Python, Java</li>
          <li>Frameworks: React, Angular, Express</li>
          <li>Databases: MongoDB, PostgreSQL</li>
          <li>Tools: Docker, Kubernetes, AWS</li>
        </ul>
        <h2>Certifications</h2>
        <ul>
          <li>AWS Certified Solutions Architect</li>
          <li>Certified Kubernetes Administrator</li>
        </ul>
      `;

      const mockParsedData: ParsedDocxData = {
        html: complexHtml,
        messages: [],
      };

      const mammoth = require('mammoth');
      mammoth.convertToHtml.mockResolvedValue({
        value: complexHtml,
        messages: [],
      });

      const mockGeneratedBuffer = Buffer.from('complex-generated-docx');
      const { Packer } = require('docx');
      Packer.toBuffer.mockResolvedValue(mockGeneratedBuffer);

      // Parse
      const parsedData = await parseDocxContent(Buffer.from('complex-docx'));
      const tables = extractTables(parsedData);
      const bullets = extractBullets(parsedData);
      const resumeData = mapToResumeSchema(parsedData, tables, bullets);

      // Generate
      const generatedBuffer = await generateDocx(resumeData);

      expect(tables).toHaveLength(2); // Work experience and education tables
      expect(bullets).toHaveLength(6); // All skills and certifications
      expect(resumeData.workExperience).toHaveLength(2);
      expect(resumeData.education).toHaveLength(2);
      expect(resumeData.skills).toEqual(bullets);
      expect(generatedBuffer).toBe(mockGeneratedBuffer);
    });

    it('should preserve data integrity through roundtrip', async () => {
      // Test data with special characters and formatting
      const testData = {
        summary: 'Professional summary with spécial characters: café, résumé, ñoño',
        personalInfo: {
          name: 'José María González',
          email: 'jose.maria@example.com',
          phone: '+1-555-ñúmeros',
        },
        workExperience: [
          {
            title: 'Développeur Senior',
            company: 'Tech Corp © 2023',
            description: 'Développé des applications web scalables',
          },
        ],
        education: [
          {
            degree: 'Maîtrise en Informatique',
            university: 'Université Paris-Saclay',
          },
        ],
        skills: ['JavaScript & TypeScript', 'React & Angular', 'Node.js & Express'],
      };

      // Simulate parsing from DOCX
      const htmlFromDocx = `
        <p>${testData.summary}</p>
        <p>Name: ${testData.personalInfo.name}</p>
        <p>Email: ${testData.personalInfo.email}</p>
        <table>
          <tr><td>Title</td><td>Company</td><td>Description</td></tr>
          <tr><td>${testData.workExperience[0].title}</td><td>${testData.workExperience[0].company}</td><td>${testData.workExperience[0].description}</td></tr>
        </table>
        <table>
          <tr><td>Degree</td><td>University</td></tr>
          <tr><td>${testData.education[0].degree}</td><td>${testData.education[0].university}</td></tr>
        </table>
        <ul>
          ${testData.skills.map(skill => `<li>${skill}</li>`).join('')}
        </ul>
      `;

      const mammoth = require('mammoth');
      mammoth.convertToHtml.mockResolvedValue({
        value: htmlFromDocx,
        messages: [],
      });

      const { Packer } = require('docx');
      Packer.toBuffer.mockResolvedValue(Buffer.from('special-chars-docx'));

      // Roundtrip
      const parsedData = await parseDocxContent(Buffer.from('special-docx'));
      const tables = extractTables(parsedData);
      const bullets = extractBullets(parsedData);
      const resumeData = mapToResumeSchema(parsedData, tables, bullets);
      const generatedBuffer = await generateDocx(resumeData);

      // Verify data preservation
      expect(resumeData.summary).toContain('café');
      expect(resumeData.summary).toContain('résumé');
      expect((resumeData.personalInfo as any)?.email).toBe('jose.maria@example.com');
      expect(resumeData.workExperience?.[0].title).toBe('Développeur Senior');
      expect(resumeData.workExperience?.[0].company).toContain('© 2023');
      expect(resumeData.education?.[0].degree).toContain('Maîtrise');
      expect(resumeData.skills).toEqual(testData.skills);
      expect(generatedBuffer).toBeInstanceOf(Buffer);
    });
  });

  describe('Edge Cases in Roundtrip', () => {
    it('should handle empty DOCX files', async () => {
      const mammoth = require('mammoth');
      mammoth.convertToHtml.mockResolvedValue({
        value: '',
        messages: [],
      });

      const { Packer } = require('docx');
      Packer.toBuffer.mockResolvedValue(Buffer.from('empty-docx'));

      const parsedData = await parseDocxContent(Buffer.from(''));
      const tables = extractTables(parsedData);
      const bullets = extractBullets(parsedData);
      const resumeData = mapToResumeSchema(parsedData, tables, bullets);
      const generatedBuffer = await generateDocx(resumeData);

      expect(resumeData).toEqual({});
      expect(tables).toHaveLength(0);
      expect(bullets).toHaveLength(0);
      expect(generatedBuffer).toBeInstanceOf(Buffer);
    });

    it('should handle DOCX with only tables', async () => {
      const tableOnlyHtml = `
        <table>
          <tr><td>Skill1</td><td>Expert</td></tr>
          <tr><td>Skill2</td><td>Advanced</td></tr>
        </table>
        <table>
          <tr><td>Project1</td><td>Description1</td></tr>
        </table>
      `;

      const mammoth = require('mammoth');
      mammoth.convertToHtml.mockResolvedValue({
        value: tableOnlyHtml,
        messages: [],
      });

      const { Packer } = require('docx');
      Packer.toBuffer.mockResolvedValue(Buffer.from('tables-only-docx'));

      const parsedData = await parseDocxContent(Buffer.from('tables-docx'));
      const tables = extractTables(parsedData);
      const bullets = extractBullets(parsedData);
      const resumeData = mapToResumeSchema(parsedData, tables, bullets);
      const generatedBuffer = await generateDocx(resumeData);

      expect(tables).toHaveLength(2);
      expect(bullets).toHaveLength(0);
      expect(resumeData.workExperience).toHaveLength(2); // First table mapped as work exp
      expect(resumeData.education).toHaveLength(1); // Second table mapped as education
      expect(generatedBuffer).toBeInstanceOf(Buffer);
    });

    it('should handle DOCX with only bullets', async () => {
      const bulletsOnlyHtml = `
        <ul>
          <li>Technical Skill 1</li>
          <li>Technical Skill 2</li>
          <li>Soft Skill 1</li>
        </ul>
        <ol>
          <li>Certification 1</li>
          <li>Certification 2</li>
        </ol>
      `;

      const mammoth = require('mammoth');
      mammoth.convertToHtml.mockResolvedValue({
        value: bulletsOnlyHtml,
        messages: [],
      });

      const { Packer } = require('docx');
      Packer.toBuffer.mockResolvedValue(Buffer.from('bullets-only-docx'));

      const parsedData = await parseDocxContent(Buffer.from('bullets-docx'));
      const tables = extractTables(parsedData);
      const bullets = extractBullets(parsedData);
      const resumeData = mapToResumeSchema(parsedData, tables, bullets);
      const generatedBuffer = await generateDocx(resumeData);

      expect(tables).toHaveLength(0);
      expect(bullets).toHaveLength(5);
      expect(resumeData.skills).toEqual(bullets);
      expect(generatedBuffer).toBeInstanceOf(Buffer);
    });

    it('should handle malformed HTML in DOCX', async () => {
      const malformedHtml = `
        <p>Unclosed paragraph
        <table>
          <tr><td>Incomplete table
        <ul>
          <li>Unclosed list item
          <li>Another item</li>
        </ul>
      `;

      const mammoth = require('mammoth');
      mammoth.convertToHtml.mockResolvedValue({
        value: malformedHtml,
        messages: [{ type: 'warning', message: 'Malformed HTML detected' }],
      });

      const { Packer } = require('docx');
      Packer.toBuffer.mockResolvedValue(Buffer.from('malformed-docx'));

      const parsedData = await parseDocxContent(Buffer.from('malformed-docx'));
      const tables = extractTables(parsedData);
      const bullets = extractBullets(parsedData);
      const resumeData = mapToResumeSchema(parsedData, tables, bullets);
      const generatedBuffer = await generateDocx(resumeData);

      // Should still process what it can
      expect(bullets).toContain('Another item');
      expect(generatedBuffer).toBeInstanceOf(Buffer);
    });

    it('should handle very large DOCX files', async () => {
      const largeHtml = '<p>' + 'A'.repeat(100000) + '</p>' +
        '<table>' + Array.from({ length: 1000 }, (_, i) =>
          `<tr><td>Row${i}</td><td>Data${i}</td></tr>`
        ).join('') + '</table>' +
        '<ul>' + Array.from({ length: 500 }, (_, i) =>
          `<li>Bullet ${i}</li>`
        ).join('') + '</ul>';

      const mammoth = require('mammoth');
      mammoth.convertToHtml.mockResolvedValue({
        value: largeHtml,
        messages: [],
      });

      const { Packer } = require('docx');
      Packer.toBuffer.mockResolvedValue(Buffer.from('large-docx'));

      const parsedData = await parseDocxContent(Buffer.from('large-docx'.repeat(1000)));
      const tables = extractTables(parsedData);
      const bullets = extractBullets(parsedData);
      const resumeData = mapToResumeSchema(parsedData, tables, bullets);
      const generatedBuffer = await generateDocx(resumeData);

      expect(tables[0].rows).toHaveLength(1000);
      expect(bullets).toHaveLength(500);
      expect(generatedBuffer).toBeInstanceOf(Buffer);
    });
  });

  describe('ATS-Safe Formatting Validation', () => {
    it('should generate ATS-safe DOCX from parsed resume', async () => {
      // Simulate a resume that would be ATS-friendly
      const atsFriendlyHtml = `
        <p>Experienced software developer with 5+ years in JavaScript development.</p>
        <table>
          <tr><td>Software Developer</td><td>ABC Company</td><td>Developed web applications using React and Node.js</td></tr>
          <tr><td>Junior Developer</td><td>XYZ Corp</td><td>Built REST APIs and database integrations</td></tr>
        </table>
        <ul>
          <li>JavaScript</li>
          <li>React</li>
          <li>Node.js</li>
          <li>SQL</li>
          <li>Git</li>
        </ul>
      `;

      const mammoth = require('mammoth');
      mammoth.convertToHtml.mockResolvedValue({
        value: atsFriendlyHtml,
        messages: [],
      });

      const { Packer } = require('docx');
      const mockDocxBuffer = Buffer.from('ats-safe-docx');
      Packer.toBuffer.mockResolvedValue(mockDocxBuffer);

      // Parse and generate
      const parsedData = await parseDocxContent(Buffer.from('ats-resume'));
      const tables = extractTables(parsedData);
      const bullets = extractBullets(parsedData);
      const resumeData = mapToResumeSchema(parsedData, tables, bullets);
      const generatedBuffer = await generateDocx(resumeData);

      // Verify ATS-friendly content structure
      expect(resumeData.summary).toBeDefined();
      expect(resumeData.workExperience).toHaveLength(2);
      expect(resumeData.skills).toHaveLength(5);
      expect(generatedBuffer).toBe(mockDocxBuffer);

      // Verify no complex formatting that could confuse ATS
      expect(mockLogger.info).toHaveBeenCalledWith('Applied ATS-safe formatting to document');
    });

    it('should preserve keyword-rich content for ATS parsing', async () => {
      const keywordRichHtml = `
        <p>Results-driven software engineer specializing in full-stack development, cloud architecture, and agile methodologies.</p>
        <ul>
          <li>Programming Languages: JavaScript, TypeScript, Python</li>
          <li>Frameworks: React, Angular, Vue.js, Express, Django</li>
          <li>Cloud Platforms: AWS, Azure, Google Cloud</li>
          <li>Databases: MongoDB, PostgreSQL, MySQL</li>
          <li>DevOps Tools: Docker, Kubernetes, Jenkins, GitLab CI</li>
        </ul>
      `;

      const mammoth = require('mammoth');
      mammoth.convertToHtml.mockResolvedValue({
        value: keywordRichHtml,
        messages: [],
      });

      const { Packer } = require('docx');
      Packer.toBuffer.mockResolvedValue(Buffer.from('keyword-rich-docx'));

      const parsedData = await parseDocxContent(Buffer.from('keyword-docx'));
      const tables = extractTables(parsedData);
      const bullets = extractBullets(parsedData);
      const resumeData = mapToResumeSchema(parsedData, tables, bullets);
      const generatedBuffer = await generateDocx(resumeData);

      expect(resumeData.skills).toHaveLength(5);
      expect((resumeData.skills as string[]).some(skill => skill.includes('JavaScript'))).toBe(true);
      expect((resumeData.skills as string[]).some(skill => skill.includes('AWS'))).toBe(true);
      expect(generatedBuffer).toBeInstanceOf(Buffer);
    });
  });

  describe('Error Handling in Roundtrip', () => {
    it('should handle parsing errors gracefully in roundtrip', async () => {
      const mammoth = require('mammoth');
      mammoth.convertToHtml.mockRejectedValue(new Error('Corrupted DOCX'));

      await expect(parseDocxContent(Buffer.from('corrupted'))).rejects.toThrow('Failed to parse DOCX file');

      // Should not proceed to mapping/generation
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle generation errors in roundtrip', async () => {
      const validHtml = '<p>Valid content</p>';
      const mammoth = require('mammoth');
      mammoth.convertToHtml.mockResolvedValue({
        value: validHtml,
        messages: [],
      });

      const { Packer } = require('docx');
      Packer.toBuffer.mockRejectedValue(new Error('Generation failed'));

      const parsedData = await parseDocxContent(Buffer.from('valid-docx'));
      const tables = extractTables(parsedData);
      const bullets = extractBullets(parsedData);
      const resumeData = mapToResumeSchema(parsedData, tables, bullets);

      await expect(generateDocx(resumeData)).rejects.toThrow('Failed to generate DOCX');
      expect(mockLogger.error).toHaveBeenCalledWith('Error generating DOCX', expect.any(Error));
    });

    it('should handle validation failures in roundtrip', async () => {
      const resumeData: ResumeData = {
        // Invalid data that fails validation
        maliciousField: '<script>alert("xss")</script>',
      };

      mockValidateSecureInput.mockReturnValue({
        maliciousField: 'Invalid input detected',
      });

      await expect(generateDocx(resumeData)).rejects.toThrow('Invalid resume data');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle multiple roundtrips concurrently', async () => {
      const html1 = '<p>Resume 1</p><ul><li>Skill A</li></ul>';
      const html2 = '<p>Resume 2</p><ul><li>Skill B</li></ul>';
      const html3 = '<p>Resume 3</p><ul><li>Skill C</li></ul>';

      const mammoth = require('mammoth');
      mammoth.convertToHtml
        .mockResolvedValueOnce({ value: html1, messages: [] })
        .mockResolvedValueOnce({ value: html2, messages: [] })
        .mockResolvedValueOnce({ value: html3, messages: [] });

      const { Packer } = require('docx');
      Packer.toBuffer
        .mockResolvedValue(Buffer.from('docx1'))
        .mockResolvedValue(Buffer.from('docx2'))
        .mockResolvedValue(Buffer.from('docx3'));

      // Concurrent roundtrips
      const results = await Promise.all([
        (async () => {
          const parsed = await parseDocxContent(Buffer.from('docx1'));
          const tables = extractTables(parsed);
          const bullets = extractBullets(parsed);
          const resume = mapToResumeSchema(parsed, tables, bullets);
          return generateDocx(resume);
        })(),
        (async () => {
          const parsed = await parseDocxContent(Buffer.from('docx2'));
          const tables = extractTables(parsed);
          const bullets = extractBullets(parsed);
          const resume = mapToResumeSchema(parsed, tables, bullets);
          return generateDocx(resume);
        })(),
        (async () => {
          const parsed = await parseDocxContent(Buffer.from('docx3'));
          const tables = extractTables(parsed);
          const bullets = extractBullets(parsed);
          const resume = mapToResumeSchema(parsed, tables, bullets);
          return generateDocx(resume);
        })(),
      ]);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toBeInstanceOf(Buffer);
      });
    });
  });
});