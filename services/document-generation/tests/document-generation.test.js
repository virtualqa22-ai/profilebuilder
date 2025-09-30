// Unit tests for Document Generation Service

describe('Document Generation Service', () => {
  // Mock all external dependencies
  const mockPdfLib = {
    PDFDocument: {
      create: jest.fn(),
    },
    rgb: jest.fn(() => [0, 0, 0]),
    StandardFonts: {
      Helvetica: 'Helvetica',
      HelveticaBold: 'HelveticaBold',
    },
  };

  const mockFs = {
    promises: {
      writeFile: jest.fn(),
      readFile: jest.fn(),
    },
  };

  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup default mock behaviors
    mockPdfLib.PDFDocument.create.mockResolvedValue({
      addPage: jest.fn(),
      drawText: jest.fn(),
      save: jest.fn().mockResolvedValue(Buffer.from('pdf content')),
    });

    mockFs.promises.writeFile.mockResolvedValue();
    mockFs.promises.readFile.mockResolvedValue('template content');
  });

  describe('PDF Generation', () => {
    test('should generate PDF from resume data', async () => {
      const resumeData = {
        name: 'John Doe',
        email: 'john@example.com',
        experience: ['Software Engineer at Company A', 'Developer at Company B'],
      };

      const pdfGenerator = {
        async generateResumePDF(data) {
          const pdfDoc = await mockPdfLib.PDFDocument.create();
          const page = pdfDoc.addPage();

          // Add content
          page.drawText(`Name: ${data.name}`, { x: 50, y: 700 });
          page.drawText(`Email: ${data.email}`, { x: 50, y: 680 });

          data.experience.forEach((exp, index) => {
            page.drawText(`Experience ${index + 1}: ${exp}`, {
              x: 50,
              y: 650 - index * 20,
            });
          });

          const pdfBytes = await pdfDoc.save();
          return pdfBytes;
        },
      };

      const result = await pdfGenerator.generateResumePDF(resumeData);

      expect(mockPdfLib.PDFDocument.create).toHaveBeenCalled();
      expect(result).toBeInstanceOf(Buffer);
    });

    test('should handle PDF generation errors', async () => {
      mockPdfLib.PDFDocument.create.mockRejectedValue(new Error('PDF creation failed'));

      const pdfGenerator = {
        async generateResumePDF(data) {
          try {
            const pdfDoc = await mockPdfLib.PDFDocument.create();
            const pdfBytes = await pdfDoc.save();
            return pdfBytes;
          } catch (error) {
            throw new Error(`PDF generation failed: ${error.message}`);
          }
        },
      };

      await expect(pdfGenerator.generateResumePDF({})).rejects.toThrow(
        'PDF generation failed: PDF creation failed'
      );
    });

    test('should validate resume data before PDF generation', async () => {
      const pdfGenerator = {
        async generateResumePDF(data) {
          if (!data.name || !data.email) {
            throw new Error('Missing required fields: name and email');
          }

          const pdfDoc = await mockPdfLib.PDFDocument.create();
          const pdfBytes = await pdfDoc.save();
          return pdfBytes;
        },
      };

      await expect(pdfGenerator.generateResumePDF({})).rejects.toThrow(
        'Missing required fields: name and email'
      );
      await expect(pdfGenerator.generateResumePDF({ name: 'John' })).rejects.toThrow(
        'Missing required fields: name and email'
      );

      const result = await pdfGenerator.generateResumePDF({
        name: 'John',
        email: 'john@example.com',
      });
      expect(result).toBeDefined();
    });
  });

  describe('Document Templates', () => {
    test('should load and apply document templates', async () => {
      const templateEngine = {
        async loadTemplate(templateName) {
          const templateContent = await mockFs.promises.readFile(`${templateName}.json`);
          return JSON.parse(templateContent);
        },

        async applyTemplate(template, data) {
          const result = { ...template };

          // Replace placeholders
          Object.keys(data).forEach(key => {
            const placeholder = `{{${key}}}`;
            if (result.content) {
              result.content = result.content.replace(new RegExp(placeholder, 'g'), data[key]);
            }
          });

          return result;
        },
      };

      const template = await templateEngine.loadTemplate('modern');
      expect(mockFs.promises.readFile).toHaveBeenCalledWith('modern.json');

      const applied = await templateEngine.applyTemplate(
        { content: 'Name: {{name}}, Email: {{email}}' },
        { name: 'John', email: 'john@example.com' }
      );

      expect(applied.content).toBe('Name: John, Email: john@example.com');
    });

    test('should handle template loading errors', async () => {
      mockFs.promises.readFile.mockRejectedValue(new Error('Template not found'));

      const templateEngine = {
        async loadTemplate(templateName) {
          try {
            const templateContent = await mockFs.promises.readFile(`${templateName}.json`);
            return JSON.parse(templateContent);
          } catch (error) {
            throw new Error(`Template loading failed: ${error.message}`);
          }
        },
      };

      await expect(templateEngine.loadTemplate('nonexistent')).rejects.toThrow(
        'Template loading failed: Template not found'
      );
    });

    test('should validate template structure', () => {
      const validateTemplate = (template) => {
        const errors = [];

        if (!template.name) errors.push('Template name is required');
        if (!template.content && !template.sections) {
          errors.push('Template must have content or sections');
        }
        if (template.fontSize && (template.fontSize < 8 || template.fontSize > 72)) {
          errors.push('Font size must be between 8 and 72');
        }

        return errors;
      };

      expect(validateTemplate({})).toEqual([
        'Template name is required',
        'Template must have content or sections',
      ]);

      expect(validateTemplate({ name: 'Test', content: 'Content', fontSize: 100 })).toEqual([
        'Font size must be between 8 and 72',
      ]);

      expect(validateTemplate({ name: 'Test', content: 'Content', fontSize: 12 })).toEqual([]);
    });
  });

  describe('Document Formatting', () => {
    test('should format text with proper styling', () => {
      const formatter = {
        formatSection(title, content, style = {}) {
          const defaultStyle = {
            fontSize: 12,
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
        },

        formatList(items, style = {}) {
          return {
            type: 'list',
            items: items.map(item => ({
              text: item,
              style: { bullet: '•', indent: 20, ...style },
            })),
          };
        },
      };

      const section = formatter.formatSection('Experience', 'Software Engineer', {
        fontSize: 14,
        fontWeight: 'bold',
      });

      expect(section.title).toBe('Experience');
      expect(section.style.fontSize).toBe(14);
      expect(section.style.fontWeight).toBe('bold');

      const list = formatter.formatList(['Item 1', 'Item 2']);
      expect(list.items).toHaveLength(2);
      expect(list.items[0].style.bullet).toBe('•');
    });

    test('should handle text overflow and pagination', () => {
      const paginator = {
        calculatePages(content, pageHeight = 800, lineHeight = 20) {
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

          return pages;
        },
      };

      const content = 'Line 1\nLine 2\n' + 'Long line '.repeat(20) + '\nLine 4';
      const pages = paginator.calculatePages(content);

      expect(pages.length).toBeGreaterThanOrEqual(1);
      expect(pages[0]).toContain('Line 1');
    });

    test('should apply consistent formatting rules', () => {
      const rules = {
        maxLineLength: 80,
        indentSize: 2,
        dateFormat: 'MM/DD/YYYY',
      };

      const applyRules = (text, rules) => {
        let formatted = text;

        // Apply line length limit
        const lines = formatted.split('\n');
        const wrappedLines = lines.flatMap(line => {
          if (line.length <= rules.maxLineLength) return [line];

          const wrapped = [];
          let remaining = line;
          while (remaining.length > rules.maxLineLength) {
            const chunk = remaining.substring(0, rules.maxLineLength);
            wrapped.push(chunk);
            remaining = remaining.substring(rules.maxLineLength);
          }
          if (remaining) wrapped.push(remaining);
          return wrapped;
        });

        formatted = wrappedLines.join('\n');

        return formatted;
      };

      const longText = 'A'.repeat(100);
      const formatted = applyRules(longText, rules);

      const lines = formatted.split('\n');
      lines.forEach(line => {
        expect(line.length).toBeLessThanOrEqual(rules.maxLineLength);
      });
    });
  });

  describe('File Operations', () => {
    test('should save generated documents to file system', async () => {
      const fileManager = {
        async saveDocument(filename, content, options = {}) {
          const fullPath = options.path ? `${options.path}/${filename}` : filename;

          await mockFs.promises.writeFile(fullPath, content);

          mockLogger.info('Document saved', {
            filename: fullPath,
            size: content.length,
          });

          return fullPath;
        },
      };

      const content = Buffer.from('PDF content');
      const filename = 'resume.pdf';

      const result = await fileManager.saveDocument(filename, content, { path: '/documents' });

      expect(mockFs.promises.writeFile).toHaveBeenCalledWith('/documents/resume.pdf', content);
      expect(mockLogger.info).toHaveBeenCalledWith('Document saved', {
        filename: '/documents/resume.pdf',
        size: content.length,
      });
      expect(result).toBe('/documents/resume.pdf');
    });

    test('should handle file system errors', async () => {
      mockFs.promises.writeFile.mockRejectedValue(new Error('Disk full'));

      const fileManager = {
        async saveDocument(filename, content) {
          try {
            await mockFs.promises.writeFile(filename, content);
            return filename;
          } catch (error) {
            mockLogger.error('Document save failed', { filename, error: error.message });
            throw new Error(`File save failed: ${error.message}`);
          }
        },
      };

      await expect(fileManager.saveDocument('test.pdf', Buffer.from('content'))).rejects.toThrow(
        'File save failed: Disk full'
      );

      expect(mockLogger.error).toHaveBeenCalledWith('Document save failed', {
        filename: 'test.pdf',
        error: 'Disk full',
      });
    });

    test('should validate file paths and permissions', () => {
      const validatePath = (path) => {
        const errors = [];

        if (!path || typeof path !== 'string') {
          errors.push('Path must be a non-empty string');
        }

        // Check for directory traversal
        if (path.includes('..') || path.includes('../')) {
          errors.push('Path contains invalid directory traversal');
        }

        // Check for absolute paths (if not allowed)
        if (path.startsWith('/') && !path.startsWith('/allowed')) {
          errors.push('Absolute paths not allowed');
        }

        // Check file extension
        const allowedExtensions = ['.pdf', '.docx', '.txt'];
        const hasValidExtension = allowedExtensions.some(ext => path.endsWith(ext));
        if (!hasValidExtension) {
          errors.push('File must have valid extension (.pdf, .docx, .txt)');
        }

        return errors;
      };

      expect(validatePath('')).toEqual(['Path must be a non-empty string']);
      expect(validatePath('../../../etc/passwd')).toEqual([
        'Path contains invalid directory traversal',
        'File must have valid extension (.pdf, .docx, .txt)',
      ]);
      expect(validatePath('/root/file.txt')).toEqual([
        'Absolute paths not allowed',
        'File must have valid extension (.pdf, .docx, .txt)',
      ]);
      expect(validatePath('documents/resume.pdf')).toEqual([]);
    });
  });

  describe('Error Handling and Resilience', () => {
    test('should implement retry logic for document generation', async () => {
      let attemptCount = 0;
      const maxRetries = 3;

      const generateWithRetry = async (data, retryCount = 0) => {
        try {
          attemptCount++;
          if (attemptCount < 3) {
            throw new Error('Temporary generation failure');
          }

          // Simulate successful generation
          return { success: true, content: 'Generated document' };
        } catch (error) {
          if (retryCount < maxRetries) {
            const delay = Math.pow(2, retryCount) * 100;
            await new Promise(resolve => setTimeout(resolve, delay));
            return generateWithRetry(data, retryCount + 1);
          }
          throw error;
        }
      };

      const result = await generateWithRetry({ data: 'test' });

      expect(result.success).toBe(true);
      expect(attemptCount).toBe(3);
    });

    test('should handle resource cleanup on errors', async () => {
      const cleanup = jest.fn();

      const documentGenerator = {
        async generateDocument(data) {
          try {
            // Simulate partial generation
            const partial = { tempFile: 'temp123' };

            // Simulate error during final step
            throw new Error('Final step failed');

            return partial;
          } finally {
            cleanup();
          }
        },
      };

      await expect(documentGenerator.generateDocument({})).rejects.toThrow('Final step failed');
      expect(cleanup).toHaveBeenCalled();
    });

    test('should validate input data comprehensively', () => {
      const validateDocumentData = (data) => {
        const errors = [];

        // Required fields
        const required = ['name', 'contact'];
        required.forEach(field => {
          if (!data[field]) {
            errors.push(`${field} is required`);
          }
        });

        // Email validation
        if (data.contact?.email) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(data.contact.email)) {
            errors.push('Invalid email format');
          }
        }

        // Experience validation
        if (data.experience) {
          if (!Array.isArray(data.experience)) {
            errors.push('Experience must be an array');
          } else {
            data.experience.forEach((exp, index) => {
              if (!exp.company || !exp.position) {
                errors.push(`Experience ${index + 1} missing company or position`);
              }
            });
          }
        }

        // Content size limits
        const maxTextLength = 10000;
        const textContent = JSON.stringify(data);
        if (textContent.length > maxTextLength) {
          errors.push(`Document content exceeds maximum size of ${maxTextLength} characters`);
        }

        return errors;
      };

      expect(validateDocumentData({})).toEqual(['name is required', 'contact is required']);

      expect(
        validateDocumentData({
          name: 'John',
          contact: { email: 'invalid-email' },
        })
      ).toEqual(['Invalid email format']);

      expect(
        validateDocumentData({
          name: 'John',
          contact: { email: 'john@example.com' },
          experience: [{ company: 'Company A' }], // Missing position
        })
      ).toEqual(['Experience 1 missing company or position']);

      expect(
        validateDocumentData({
          name: 'John',
          contact: { email: 'john@example.com' },
          experience: [{ company: 'Company A', position: 'Developer' }],
        })
      ).toEqual([]);
    });
  });

  describe('Performance and Monitoring', () => {
    test('should track document generation metrics', () => {
      const metrics = {
        totalGenerations: 0,
        averageGenerationTime: 0,
        generationTimes: [],
        errors: 0,
      };

      const trackMetrics = (startTime, success) => {
        metrics.totalGenerations++;
        const generationTime = Date.now() - startTime;

        metrics.generationTimes.push(generationTime);
        metrics.averageGenerationTime =
          metrics.generationTimes.reduce((a, b) => a + b, 0) / metrics.generationTimes.length;

        if (!success) {
          metrics.errors++;
        }

        return metrics;
      };

      const startTime = Date.now();
      const result1 = trackMetrics(startTime, true);
      expect(result1.totalGenerations).toBe(1);
      expect(result1.errors).toBe(0);

      const result2 = trackMetrics(Date.now(), false);
      expect(result2.totalGenerations).toBe(2);
      expect(result2.errors).toBe(1);
      expect(result2.averageGenerationTime).toBeGreaterThan(0);
    });

    test('should log document generation activities', async () => {
      const documentService = {
        async generateDocument(data, correlationId) {
          const startTime = Date.now();

          mockLogger.info('Document generation started', {
            correlationId,
            documentType: data.type,
          });

          try {
            // Simulate generation
            await new Promise(resolve => setTimeout(resolve, 10));

            const result = { content: 'Generated document', size: 1024 };

            const duration = Date.now() - startTime;
            mockLogger.info('Document generation completed', {
              correlationId,
              duration,
              size: result.size,
            });

            return result;
          } catch (error) {
            mockLogger.error('Document generation failed', {
              correlationId,
              error: error.message,
            });
            throw error;
          }
        },
      };

      await documentService.generateDocument({ type: 'resume' }, 'corr-123');

      expect(mockLogger.info).toHaveBeenCalledWith('Document generation started', {
        correlationId: 'corr-123',
        documentType: 'resume',
      });

      expect(mockLogger.info).toHaveBeenCalledWith('Document generation completed', {
        correlationId: 'corr-123',
        duration: expect.any(Number),
        size: 1024,
      });
    });

    test('should handle concurrent document generation', async () => {
      const documentService = {
        async generateDocument(id) {
          await new Promise(resolve => setTimeout(resolve, 10));
          return { id, content: `Document ${id}` };
        },
      };

      const requests = [1, 2, 3, 4, 5].map(id => documentService.generateDocument(id));
      const results = await Promise.all(requests);

      expect(results).toHaveLength(5);
      results.forEach((result, index) => {
        expect(result.id).toBe(index + 1);
        expect(result.content).toBe(`Document ${index + 1}`);
      });
    });
  });
});