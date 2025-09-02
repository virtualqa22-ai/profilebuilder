import React, { useState } from 'react';
import { useResumeStore } from '@/store/resumeStore';

interface LivePreviewProps {
  // Props will be defined here later, e.g., for theme switching
}

const LivePreview: React.FC<LivePreviewProps> = () => {
  const { resume } = useResumeStore();
  const [theme, setTheme] = useState('default'); // 'default', 'modern', etc.

  const getThemeStyles = (currentTheme: string) => {
    switch (currentTheme) {
      case 'modern':
        return {
          preview: {
            fontFamily: 'Montserrat, sans-serif',
            lineHeight: '1.8',
            color: '#2c3e50',
            padding: '30px',
            border: 'none',
            borderRadius: '10px',
            backgroundColor: '#f8f9fa',
            minHeight: '297mm',
            boxShadow: '0 8px 16px rgba(0,0,0,0.15)',
          },
          sectionTitle: {
            color: '#3498db',
            borderBottom: '2px solid #3498db',
            paddingBottom: '8px',
            marginBottom: '15px',
            marginTop: '25px',
          },
          listItem: {
            marginBottom: '8px',
          },
          experienceItem: {
            marginBottom: '20px',
            borderLeft: '3px solid #3498db',
            paddingLeft: '15px',
          },
          dateRange: {
            float: 'right',
            color: '#7f8c8d',
          } as React.CSSProperties,
        };
      case 'default':
      default:
        return {
          preview: {
            fontFamily: 'Arial, sans-serif',
            lineHeight: '1.6',
            color: '#333',
            padding: '20px',
            border: '1px solid #ccc',
            borderRadius: '8px',
            backgroundColor: '#fff',
            minHeight: '297mm',
            boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
          },
          sectionTitle: {
            color: '#0056b3',
            borderBottom: '1px solid #ccc',
            paddingBottom: '5px',
            marginBottom: '10px',
            marginTop: '20px',
          },
          listItem: {
            marginBottom: '5px',
          },
          experienceItem: {
            marginBottom: '15px',
            borderLeft: '2px solid #0056b3',
            paddingLeft: '10px',
          },
          dateRange: {
            float: 'right',
          } as React.CSSProperties,
        };
    }
  };

  const currentStyles = getThemeStyles(theme);

  return (
    <div style={currentStyles.preview}>
      <div className="flex justify-center mb-4">
        <button
          onClick={() => setTheme('default')}
          className={`p-2 mx-1 rounded ${theme === 'default' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-black'}`}
        >
          Default Theme
        </button>
        <button
          onClick={() => setTheme('modern')}
          className={`p-2 mx-1 rounded ${theme === 'modern' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-black'}`}
        >
          Modern Theme
        </button>
      </div>
      <h1>{resume.personalInfo.name}</h1>
      <p>{resume.personalInfo.email} | {resume.personalInfo.phone} | {resume.personalInfo.linkedin}</p>

      {resume.summary && (
        <section>
          <h2 style={currentStyles.sectionTitle}>Summary</h2>
          <p>{resume.summary}</p>
        </section>
      )}

      {resume.workExperience.length > 0 && (
        <section>
          <h2 style={currentStyles.sectionTitle}>Work Experience</h2>
          {resume.workExperience.map((exp, index) => (
            <div key={index} style={currentStyles.experienceItem}>
              <h3>{exp.title} at {exp.company}</h3>
              <p>{exp.location} <span style={currentStyles.dateRange}>{exp.startDate} - {exp.endDate}</span></p>
              <p>{exp.description}</p>
            </div>
          ))}
        </section>
      )}

      {resume.education.length > 0 && (
        <section>
          <h2 style={currentStyles.sectionTitle}>Education</h2>
          {resume.education.map((edu, index) => (
            <div key={index} style={currentStyles.experienceItem}>
              <h3>{edu.degree} in {edu.major}</h3>
              <p>{edu.university}, {edu.location} <span style={currentStyles.dateRange}>{edu.startDate} - {edu.endDate}</span></p>
            </div>
          ))}
        </section>
      )}

      {resume.skills.length > 0 && (
        <section>
          <h2 style={currentStyles.sectionTitle}>Skills</h2>
          <p>{resume.skills.join(', ')}</p>
        </section>
      )}

      {resume.projects && (
        <section>
          <h2 style={currentStyles.sectionTitle}>Projects</h2>
          <p>{resume.projects}</p>
        </section>
      )}

      {resume.awardsCertifications && (
        <section>
          <h2 style={currentStyles.sectionTitle}>Awards and Certifications</h2>
          <p>{resume.awardsCertifications}</p>
        </section>
      )}
    </div>
  );
};

export default LivePreview;
