import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

export async function POST(req: Request) {
  try {
    const resumeData = await req.json();

    // Basic HTML generation from resumeData
    // This part would be more sophisticated in a real app,
    // potentially using a templating engine or React components rendered to string.
    const htmlContent = `
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
          <h1>${resumeData.personalInfo.name}</h1>
          <p>${resumeData.personalInfo.email} | ${resumeData.personalInfo.phone} | ${resumeData.personalInfo.linkedin}</p>

          <section>
            <h2 class="section-title">Summary</h2>
            <p>${resumeData.summary}</p>
          </section>

          <section>
            <h2 class="section-title">Work Experience</h2>
            ${resumeData.workExperience.map((exp: any) => `
              <div class="experience-item">
                <h3>${exp.title} at ${exp.company}</h3>
                <p>${exp.location} <span class="date-range">${exp.startDate} - ${exp.endDate}</span></p>
                <p>${exp.description}</p>
              </div>
            `).join('')}
          </section>

          <section>
            <h2 class="section-title">Education</h2>
            ${resumeData.education.map((edu: any) => `
              <div class="education-item">
                <h3>${edu.degree} in ${edu.major}</h3>
                <p>${edu.university}, ${edu.location} <span class="date-range">${edu.startDate} - ${edu.endDate}</span></p>
              </div>
            `).join('')}
          </section>

          <section>
            <h2 class="section-title">Skills</h2>
            <p>${resumeData.skills.join(', ')}</p>
          </section>

          <section>
            <h2 class="section-title">Projects</h2>
            <p>${resumeData.projects}</p>
          </section>

          <section>
            <h2 class="section-title">Awards and Certifications</h2>
            <p>${resumeData.awardsCertifications}</p>
          </section>
        </div>
      </body>
      </html>
    `;

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4' });
    await browser.close();

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="resume.pdf"',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
