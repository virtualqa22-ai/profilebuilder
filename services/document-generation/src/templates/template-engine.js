// Template Engine for Document Generation Service
// Handles loading, processing, and applying document templates

const fs = require('fs').promises;
const path = require('path');
const { TEMPLATE_CONFIG } = require('../utils/constants');
const { createError, ERROR_CODES } = require('../utils/error-handling');
const { info: logInfo, error: logError } = require('../utils/logger');

/**
 * Template Engine class for managing document templates
 */
class TemplateEngine {
  constructor() {
    this.templates = new Map();
    this.templateDir = path.join(__dirname, '../../templates');
  }

  /**
   * Loads a template from file system
   * @param {string} templateName - Name of the template file (without extension)
   * @returns {Promise<Object>} Template object
   */
  async loadTemplate(templateName) {
    try {
      const templatePath = path.join(this.templateDir, `${templateName}.json`);

      // Check if template exists in cache
      if (this.templates.has(templateName)) {
        logInfo('Template loaded from cache', { templateName });
        return this.templates.get(templateName);
      }

      // Load template from file
      const templateContent = await fs.readFile(templatePath, 'utf8');
      const template = JSON.parse(templateContent);

      // Validate template structure
      this._validateTemplate(template);

      // Cache the template
      this.templates.set(templateName, template);

      logInfo('Template loaded from file', { templateName, path: templatePath });
      return template;

    } catch (err) {
      logError('Template loading failed', { templateName, error: err.message });
      throw createError(ERROR_CODES.TEMPLATE_ERROR, `Template loading failed: ${err.message}`);
    }
  }

  /**
   * Applies data to a template using placeholder replacement
   * @param {Object} template - Template object
   * @param {Object} data - Data to apply
   * @returns {Object} Processed template
   */
  async applyTemplate(template, data) {
    try {
      const result = JSON.parse(JSON.stringify(template)); // Deep clone

      // Replace placeholders in content
      if (result.content) {
        result.content = this._replacePlaceholders(result.content, data);
      }

      // Replace placeholders in sections
      if (result.sections && Array.isArray(result.sections)) {
        result.sections = result.sections.map(section => ({
          ...section,
          content: section.content ? this._replacePlaceholders(section.content, data) : section.content,
          title: section.title ? this._replacePlaceholders(section.title, data) : section.title,
        }));
      }

      logInfo('Template applied successfully', {
        templateName: template.name,
        dataKeys: Object.keys(data),
      });

      return result;

    } catch (err) {
      logError('Template application failed', { error: err.message });
      throw createError(ERROR_CODES.TEMPLATE_ERROR, `Template application failed: ${err.message}`);
    }
  }

  /**
   * Creates a new template and saves it to file
   * @param {string} templateName - Name of the template
   * @param {Object} templateData - Template data
   * @returns {Promise<void>}
   */
  async createTemplate(templateName, templateData) {
    try {
      // Validate template data
      this._validateTemplate(templateData);

      const templatePath = path.join(this.templateDir, `${templateName}.json`);
      await fs.writeFile(templatePath, JSON.stringify(templateData, null, 2));

      // Update cache
      this.templates.set(templateName, templateData);

      logInfo('Template created successfully', { templateName, path: templatePath });

    } catch (err) {
      logError('Template creation failed', { templateName, error: err.message });
      throw createError(ERROR_CODES.TEMPLATE_ERROR, `Template creation failed: ${err.message}`);
    }
  }

  /**
   * Lists all available templates
   * @returns {Promise<string[]>} Array of template names
   */
  async listTemplates() {
    try {
      const files = await fs.readdir(this.templateDir);
      const templates = files
        .filter(file => file.endsWith('.json'))
        .map(file => file.replace('.json', ''));

      return templates;

    } catch (err) {
      logError('Failed to list templates', { error: err.message });
      return [];
    }
  }

  /**
   * Validates template structure
   * @param {Object} template - Template to validate
   * @private
   */
  _validateTemplate(template) {
    if (!template.name) {
      throw new Error('Template name is required');
    }

    if (!template.content && !template.sections) {
      throw new Error('Template must have content or sections');
    }

    if (template.fontSize && (template.fontSize < 8 || template.fontSize > 72)) {
      throw new Error('Font size must be between 8 and 72');
    }

    // Check file size
    const templateSize = JSON.stringify(template).length;
    if (templateSize > TEMPLATE_CONFIG.MAX_TEMPLATE_SIZE) {
      throw new Error(`Template size exceeds maximum of ${TEMPLATE_CONFIG.MAX_TEMPLATE_SIZE} bytes`);
    }
  }

  /**
   * Replaces placeholders in text with data values
   * @param {string} text - Text with placeholders
   * @param {Object} data - Data object
   * @returns {string} Text with placeholders replaced
   * @private
   */
  _replacePlaceholders(text, data) {
    let result = text;

    // Replace all placeholders
    Object.keys(data).forEach(key => {
      const placeholder = `{{${key}}}`;
      const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      result = result.replace(regex, data[key] || '');
    });

    return result;
  }

  /**
   * Clears the template cache
   */
  clearCache() {
    this.templates.clear();
    logInfo('Template cache cleared');
  }

  /**
   * Gets template from cache
   * @param {string} templateName - Template name
   * @returns {Object|null} Cached template or null
   */
  getCachedTemplate(templateName) {
    return this.templates.get(templateName) || null;
  }
}

module.exports = TemplateEngine;