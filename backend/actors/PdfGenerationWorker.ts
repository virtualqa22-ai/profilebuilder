// backend/actors/PdfGenerationWorker.ts
// Worker actor for PDF generation tasks

import { Worker } from './Worker';
import { logger } from '../lib/logger';

/**
 * Worker actor specialized in PDF generation tasks.
 * Generates PDF documents from resume data using HTML templating.
 */
export class PdfGenerationWorker extends Worker {
  constructor(id: string, supervisorId: string) {
    super(id, supervisorId);
  }

  /**
   * Executes PDF generation tasks
   */
  protected async executeTask(taskType: string, data: any): Promise<any> {
    if (taskType !== 'pdf-generation') {
      throw new Error(`PdfGenerationWorker cannot handle task type: ${taskType}`);
    }

    const { resumeData, userId } = data;

    if (!resumeData) {
      throw new Error('Resume data is required for PDF generation task');
    }

    logger.info(`PdfGenerationWorker ${this.id} processing PDF generation for user ${userId}`);

    try {
      // Generate HTML content from resume data
      const htmlContent = this.generateHtmlContent(resumeData);

      // Generate PDF buffer (simplified - in real implementation would use puppeteer)
      // For now, return HTML as placeholder; actual PDF generation would require puppeteer
      const pdfBuffer = await this.generatePdfBuffer(htmlContent);

      return {
        pdfBuffer: pdfBuffer.toString('base64'), // Base64 encoded for transport
        fileName: `resume_v${resumeData.version || '1.0'}.pdf`,
        taskType: 'pdf-generation',
        processedAt: new Date().toISOString(),
      };
    } catch (error) {
      logger.error(`PDF generation failed for worker ${this.id}:`, error);
      throw new Error(`PDF generation service error: ${(error as Error).message}`);
    }
  }

  /**
   * Generates HTML content from resume data
   */
  private generateHtmlContent(resumeData: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Resume</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { width: 80%; margin: auto; padding: 20px; }
          h1, h2, h3 { color: #0056b3; }
          section { margin-bottom: 20px; }
          .section-title { border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-bottom: 10px; }
          ul { list-style-type: none; padding: 0; }
          ul li { margin-bottom: 5px; }
          .experience-item, .education-item { margin-bottom: 15px; border-left: 2px solid #0056b3; padding-left: 10px; }
          .date-range { float: right; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>${resumeData.personalInfo?.name || 'Name'}</h1>
          <p>${resumeData.personalInfo?.email || ''} | ${resumeData.personalInfo?.phone || ''} | ${resumeData.personalInfo?.linkedin || ''}</p>
          <p>Version: ${resumeData.version || '1.0'}</p>

          <section>
            <h2 class="section-title">Summary</h2>
            <p>${resumeData.summary || ''}</p>
          </section>

          <section>
            <h2 class="section-title">Work Experience</h2>
            ${(resumeData.workExperience || []).map((exp: any) => `
              <div class="experience-item">
                <h3>${exp.title || ''} at ${exp.company || ''}</h3>
                <p>${exp.location || ''} <span class="date-range">${exp.startDate || ''} - ${exp.endDate || ''}</span></p>
                <p>${exp.description || ''}</p>
              </div>
            `).join('')}
          </section>

          <section>
            <h2 class="section-title">Education</h2>
            ${(resumeData.education || []).map((edu: any) => `
              <div class="education-item">
                <h3>${edu.degree || ''} in ${edu.major || ''}</h3>
                <p>${edu.university || ''}, ${edu.location || ''} <span class="date-range">${edu.startDate || ''} - ${edu.endDate || ''}</span></p>
              </div>
            `).join('')}
          </section>

          <section>
            <h2 class="section-title">Skills</h2>
            <p>${(resumeData.skills || []).join(', ')}</p>
          </section>

          <section>
            <h2 class="section-title">Projects</h2>
            <p>${resumeData.projects || ''}</p>
          </section>

          <section>
            <h2 class="section-title">Awards and Certifications</h2>
            <p>${resumeData.awardsCertifications || ''}</p>
          </section>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generates PDF buffer from HTML content
   * Note: In a real implementation, this would use puppeteer or similar
   * For now, returns a placeholder buffer
   */
  private async generatePdfBuffer(htmlContent: string): Promise<Buffer> {
    // Placeholder implementation
    // In production, would use puppeteer.launch() etc.
    logger.warn('PDF generation using placeholder - implement with puppeteer for production');
    return Buffer.from('PDF_PLACEHOLDER_' + Date.now());
  }
}