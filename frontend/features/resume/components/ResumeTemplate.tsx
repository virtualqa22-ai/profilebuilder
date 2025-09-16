import React from 'react';
import { ResumeData } from '@/store/resumeStore';

interface ResumeTemplateProps {
  resume: ResumeData;
}

const ResumeTemplate: React.FC<ResumeTemplateProps> = ({ resume }) => {
  return (
    <html>
      <head>
        <title>Resume</title>
        <style>
          {`
            @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap');
            body { font-family: 'Roboto', Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { width: 80%; margin: auto; padding: 20px; }
            h1, h2, h3 { color: #0056b3; }
            section { margin-bottom: 20px; }
            .section-title { border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-bottom: 10px; }
            ul { list-style-type: none; padding: 0; }
            ul li { margin-bottom: 5px; }
            .experience-item, .education-item { margin-bottom: 15px; border-left: 2px solid #0056b3; padding-left: 10px; }
            .date-range { float: right; }
          `}
        </style>
      </head>
      <body>
        <div className="container">
          <h1>{resume.personalInfo.name}</h1>
          <p>{resume.personalInfo.email} | {resume.personalInfo.phone} | {resume.personalInfo.linkedin}</p>
          <p>Version: {resume.version}</p>

          <section>
            <h2 className="section-title">Summary</h2>
            <p>{resume.summary}</p>
          </section>

          <section>
            <h2 className="section-title">Work Experience</h2>
            {resume.workExperience.map((exp, index) => (
              <div key={index} className="experience-item">
                <h3>{exp.title} at {exp.company}</h3>
                <p>{exp.location} <span className="date-range">{exp.startDate} - {exp.endDate}</span></p>
                <p>{exp.description}</p>
              </div>
            ))}
          </section>

          <section>
            <h2 className="section-title">Education</h2>
            {resume.education.map((edu, index) => (
              <div key={index} className="education-item">
                <h3>{edu.degree} in {edu.major}</h3>
                <p>{edu.university}, {edu.location} <span className="date-range">{edu.startDate} - {edu.endDate}</span></p>
              </div>
            ))}
          </section>

          <section>
            <h2 className="section-title">Skills</h2>
            <p>{resume.skills.join(', ')}</p>
          </section>

          <section>
            <h2 className="section-title">Projects</h2>
            <p>{resume.projects}</p>
          </section>

          <section>
            <h2 className="section-title">Awards and Certifications</h2>
            <p>{resume.awardsCertifications}</p>
          </section>
        </div>
      </body>
    </html>
  );
};

export default ResumeTemplate;
