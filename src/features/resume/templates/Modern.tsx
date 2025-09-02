import React from 'react';
import { ResumeData } from '@/store/resumeStore';

interface TemplateProps {
  resume: ResumeData;
}

const ModernTemplate: React.FC<TemplateProps> = ({ resume }) => {
  return (
    <div className="p-8 bg-gray-100 text-gray-800">
      <div className="grid grid-cols-3 gap-8">
        <div className="col-span-1">
          <h1 className="text-4xl font-bold text-blue-600 mb-2">{resume.personalInfo.name}</h1>
          <p className="text-lg mb-4">{resume.personalInfo.email}</p>
          <p className="text-lg mb-4">{resume.personalInfo.phone}</p>
          <p className="text-lg mb-4">{resume.personalInfo.linkedin}</p>
        </div>
        <div className="col-span-2">
          <h2 className="text-2xl font-bold text-blue-600 border-b-2 border-blue-600 pb-1 mb-2">Summary</h2>
          <p>{resume.summary}</p>

          <h2 className="text-2xl font-bold text-blue-600 border-b-2 border-blue-600 pb-1 mb-2 mt-4">Work Experience</h2>
          {resume.workExperience.map((exp, index) => (
            <div key={index} className="mb-2">
              <h3 className="text-xl font-semibold">{exp.title}</h3>
              <p className="text-sm text-gray-600">{exp.company} | {exp.location} | {exp.startDate} - {exp.endDate}</p>
              <p>{exp.description}</p>
            </div>
          ))}

          <h2 className="text-2xl font-bold text-blue-600 border-b-2 border-blue-600 pb-1 mb-2 mt-4">Education</h2>
          {resume.education.map((edu, index) => (
            <div key={index} className="mb-2">
              <h3 className="text-xl font-semibold">{edu.degree} in {edu.major}</h3>
              <p className="text-sm text-gray-600">{edu.university}, {edu.location} | {edu.startDate} - {edu.endDate}</p>
            </div>
          ))}

          <h2 className="text-2xl font-bold text-blue-600 border-b-2 border-blue-600 pb-1 mb-2 mt-4">Skills</h2>
          <p>{resume.skills.join(', ')}</p>
        </div>
      </div>
    </div>
  );
};

export default ModernTemplate;
