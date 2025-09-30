// Main Document Generation Service
// Orchestrates document generation with templates, formatting, and output

const PDFGenerator = require('../generators/pdf-generator');
const TemplateEngine = require('../templates/template-engine');
const { DocumentFormatter } = require('../formatters/document-formatter');
const FileManager = require('./file-manager');
const { validateDocumentData } = require('../utils/validation');
const { withPerformanceMonitoring, metricsTracker } = require('../utils/performance');
const { retryOperation } = require('../utils/error-handling');
const { info: logInfo, error: logError } = require('../utils/logger');
const { sanitizeInput, checkRateLimit } = require('../utils/security');

/**
 * Main Document Service class
 */
class DocumentService {
  constructor() {
    this.pdfGenerator = new PDFGenerator();
    this.templateEngine = new TemplateEngine();
    this.formatter = new DocumentFormatter();
    this.fileManager = new FileManager();
  }

  /**
   * Generates a document from data and template
   * @param {Object} data - Document data
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Generation result
   */
  async generateDocument(data, options = {}) {
    const correlationId = options.correlationId || this._generateCorrelationId();
    const startTime = Date.now();

    try {
      // Rate limiting check
      if (!checkRateLimit(correlationId)) {
        throw new Error('Rate limit exceeded');
      }

      // Sanitize input data
      const sanitizedData = sanitizeInput(data);

      // Validate data
      const validationErrors = validateDocumentData(sanitizedData);
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
      }

      logInfo('Document generation started', {
        correlationId,
        documentType: options.type || 'unknown',
        dataKeys: Object.keys(sanitizedData),
      });

      let documentBuffer;
      let template;

      // Load and apply template if specified
      if (options.template) {
        template = await this.templateEngine.loadTemplate(options.template);
        const appliedTemplate = await this.templateEngine.applyTemplate(template, sanitizedData);

        // Generate PDF from template
        documentBuffer = await this.pdfGenerator.generateDocumentPDF(appliedTemplate);
      } else {
        // Generate PDF directly from data
        documentBuffer = await this.pdfGenerator.generateResumePDF(sanitizedData);
      }

      // Save document if output path specified
      let filePath;
      if (options.outputPath) {
        filePath = await this.fileManager.saveDocument(
          options.outputPath,
          documentBuffer,
          { type: options.type || 'document' }
        );
      }

      const result = {
        success: true,
        content: documentBuffer,
        size: documentBuffer.length,
        filePath,
        correlationId,
        generationTime: Date.now() - startTime,
      };

      logInfo('Document generation completed', {
        correlationId,
        size: result.size,
        generationTime: result.generationTime,
        filePath,
      });

      // Track metrics
      metricsTracker.trackGeneration(startTime, true);

      return result;

    } catch (err) {
      const generationTime = Date.now() - startTime;

      logError('Document generation failed', {
        correlationId,
        error: err.message,
        generationTime,
      });

      // Track metrics
      metricsTracker.trackGeneration(startTime, false);

      throw err;
    }
  }

  /**
   * Generates multiple documents concurrently
   * @param {Object[]} documentRequests - Array of document generation requests
   * @returns {Promise<Object[]>} Array of generation results
   */
  async generateDocuments(documentRequests) {
    const startTime = Date.now();

    logInfo('Bulk document generation started', {
      count: documentRequests.length,
    });

    try {
      const results = await Promise.allSettled(
        documentRequests.map((request, index) =>
          this.generateDocument(request.data, {
            ...request.options,
            correlationId: request.options?.correlationId || `bulk-${startTime}-${index}`,
          })
        )
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      logInfo('Bulk document generation completed', {
        total: documentRequests.length,
        successful,
        failed,
        totalTime: Date.now() - startTime,
      });

      return results.map(result => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          return {
            success: false,
            error: result.reason.message,
            correlationId: result.reason.correlationId,
          };
        }
      });

    } catch (err) {
      logError('Bulk document generation failed', {
        error: err.message,
        count: documentRequests.length,
      });
      throw err;
    }
  }

  /**
   * Lists available templates
   * @returns {Promise<string[]>} Array of template names
   */
  async listTemplates() {
    return await this.templateEngine.listTemplates();
  }

  /**
   * Creates a new template
   * @param {string} templateName - Template name
   * @param {Object} templateData - Template data
   * @returns {Promise<void>}
   */
  async createTemplate(templateName, templateData) {
    return await this.templateEngine.createTemplate(templateName, templateData);
  }

  /**
   * Gets service health status
   * @returns {Promise<Object>} Health status
   */
  async getHealthStatus() {
    try {
      const metrics = metricsTracker.getMetrics();
      const templates = await this.listTemplates();

      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        metrics,
        templates: templates.length,
        uptime: process.uptime(),
      };
    } catch (err) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: err.message,
      };
    }
  }

  /**
   * Generates a unique correlation ID
   * @returns {string} Correlation ID
   * @private
   */
  _generateCorrelationId() {
    return `doc-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}

// Create monitored version of the service
const MonitoredDocumentService = class extends DocumentService {
  async generateDocument(data, options = {}) {
    return withPerformanceMonitoring(
      super.generateDocument.bind(this),
      'document-generation'
    )(data, options);
  }

  async generateDocuments(documentRequests) {
    return withPerformanceMonitoring(
      super.generateDocuments.bind(this),
      'bulk-document-generation'
    )(documentRequests);
  }
};

module.exports = MonitoredDocumentService;