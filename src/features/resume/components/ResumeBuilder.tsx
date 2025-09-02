import React, { useState, useEffect } from 'react';
import { useResumeStore } from '@/store/resumeStore';
import { getLocaleByCode, ILocale } from '@/lib/localeService';
import Comment from './Comment';

interface ResumeBuilderProps {
  locale: string;
}

const ResumeBuilder: React.FC<ResumeBuilderProps> = ({ locale }) => {
  const { resume, updatePersonalInfo, updateSummary, addWorkExperience, updateWorkExperience, removeWorkExperience, addEducation, updateEducation, removeEducation, updateSkills, updateProjects, updateAwardsCertifications, updateLocale, updateVersion } = useResumeStore();
  const [message, setMessage] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [showComments, setShowComments] = useState<Record<string, boolean>>({});
  const [comments, setComments] = useState<any[]>([]);

  const selectedLocaleData = getLocaleByCode(locale);

  useEffect(() => {
    updateLocale(locale);
  }, [locale, updateLocale]);

  useEffect(() => {
    setSaveStatus('saving');
    const handler = setTimeout(async () => {
      try {
        console.log('Autosaving resume:', resume);
        await new Promise(resolve => setTimeout(resolve, 1000));
        setSaveStatus('saved');
      } catch (error) {
        console.error('Failed to autosave:', error);
        setSaveStatus('error');
      }
    }, 1000);

    return () => {
      clearTimeout(handler);
    };
  }, [resume]);

  const handleFieldChange = (sectionKey: string, fieldName: string, value: string) => {
    switch (sectionKey) {
      case 'personalInfo':
        updatePersonalInfo({ [fieldName]: value });
        break;
      case 'summary':
        updateSummary(value);
        break;
      case 'skills':
        updateSkills(value.split(',').map(skill => skill.trim()).filter(skill => skill.length > 0));
        break;
      case 'projects':
        updateProjects(value);
        break;
      case 'awardsCertifications':
        updateAwardsCertifications(value);
        break;
      // Add cases for workExperience and education if they become single fields
      default:
        break;
    }
  };

  const handleWorkExperienceChange = (index: number, e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    updateWorkExperience(index, { [name]: value });
  };

  const addWorkExperienceEntry = () => {
    addWorkExperience({
      title: '',
      company: '',
      location: '',
      startDate: '',
      endDate: '',
      description: '',
    });
  };

  const removeWorkExperienceEntry = (index: number) => {
    removeWorkExperience(index);
  };

  const handleEducationChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    updateEducation(index, { [name]: value });
  };

  const addEducationEntry = () => {
    addEducation({
      degree: '',
      major: '',
      university: '',
      location: '',
      startDate: '',
      endDate: '',
    });
  };

  const removeEducationEntry = (index: number) => {
    removeEducation(index);
  };

  const handleExportPdf = async () => {
    console.log('Exporting resume to PDF...', resume);
    try {
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(resume),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'resume.pdf';
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        setMessage('PDF generated successfully!');
      } else {
        const errorData = await response.json();
        setMessage(errorData.error || 'Failed to generate PDF');
      }
    } catch (error: any) {
      setMessage(error.message || 'An error occurred during PDF generation');
    }
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/import-pdf', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        updatePersonalInfo(data.personalInfo);
        updateSummary(data.summary);
        resume.workExperience.forEach((_, index) => removeWorkExperience(index));
        data.workExperience.forEach((exp: any) => addWorkExperience(exp));
        resume.education.forEach((_, index) => removeEducation(index));
        data.education.forEach((edu: any) => addEducation(edu));
        updateSkills(data.skills);
        // TODO: Update other sections
        setMessage('Resume imported successfully!');
      } else {
        const errorData = await response.json();
        setMessage(errorData.error || 'Failed to import resume');
      }
    } catch (error: any) {
      setMessage(error.message || 'An error occurred during import');
    }
  };

  const [commentText, setCommentText] = useState('');

  const toggleComments = (field: string) => {
    setShowComments(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleAddComment = async (field: string, text: string) => {
    try {
      const response = await fetch(`/api/resumes/${resume._id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ field, text, author: 'User' }), // Replace 'User' with actual user
      });
      const data = await response.json();
      if (data.success) {
        setComments(data.data);
        setCommentText('');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  if (!selectedLocaleData) {
    return <div>Loading locale data...</div>;
  }

  return (
    <div className="p-4 border rounded-lg shadow-md bg-white text-black">
      <h2 className="text-2xl font-bold mb-4">Resume Builder</h2>
      <div className="text-right text-sm mb-2" aria-live="polite">
        {saveStatus === 'saving' && <span className="text-yellow-600">Saving...</span>}
        {saveStatus === 'saved' && <span className="text-green-600">Saved!</span>}
        {saveStatus === 'error' && <span className="text-red-600">Error saving!</span>}
      </div>

      {Object.entries(selectedLocaleData.sections).map(([sectionKey, section]) => (
        <section key={sectionKey} className="mb-6">
          <h3 className="text-xl font-semibold mb-3">{section.label}</h3>
          {section.fields && section.order && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {section.order.map((fieldName: string) => {
                const field = section.fields![fieldName];
                const inputId = `${sectionKey}-${fieldName}`;
                return (
                  <div key={fieldName} className="relative">
                    <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
                    <input
                      id={inputId}
                      type="text"
                      name={fieldName}
                      placeholder={field.placeholder}
                      value={(resume[sectionKey as keyof typeof resume] as any)?.[fieldName] || ''}
                      onChange={(e) => handleFieldChange(sectionKey, fieldName, e.target.value)}
                      className="p-2 border rounded text-black w-full focus:ring-2 focus:ring-blue-500"
                    />
                    <button onClick={() => toggleComments(inputId)} className="absolute top-0 right-0 p-1 text-gray-500 hover:text-black" aria-label={`Comment on ${field.label}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zM9 11a1 1 0 112 0v1a1 1 0 11-2 0v-1zm0-4a1 1 0 112 0v1a1 1 0 11-2 0V7z" clipRule="evenodd" />
                      </svg>
                    </button>
                    {showComments[inputId] && (
                      <div className="absolute top-full right-0 w-64 bg-white border rounded-lg shadow-lg z-10" data-testid={`comment-thread-${inputId}`}>
                        <div className="p-2">
                          <h4 className="font-semibold">Comments</h4>
                          {comments.filter(c => c.field === inputId).map((comment, index) => (
                            <Comment key={index} comment={comment} />
                          ))}
                          <textarea className="w-full p-1 border rounded mt-2" placeholder="Add a comment..." value={commentText} onChange={(e) => setCommentText(e.target.value)}></textarea>
                          <button onClick={() => handleAddComment(inputId, commentText)} className="mt-1 p-1 bg-blue-500 text-white rounded">Add</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {section.placeholder && !section.fields && (
            <div className="relative">
              <label htmlFor={sectionKey} className="block text-sm font-medium text-gray-700 mb-1">{section.label}</label>
              <textarea
                id={sectionKey}
                name={sectionKey}
                placeholder={section.placeholder}
                value={resume[sectionKey as keyof typeof resume] as string}
                onChange={(e) => handleFieldChange(sectionKey, sectionKey, e.target.value)}
                className="p-2 border rounded w-full text-black focus:ring-2 focus:ring-blue-500"
                rows={5}
              ></textarea>
              <button onClick={() => toggleComments(sectionKey)} className="absolute top-0 right-0 p-1 text-gray-500 hover:text-black" aria-label={`Comment on ${section.label}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zM9 11a1 1 0 112 0v1a1 1 0 11-2 0v-1zm0-4a1 1 0 112 0v1a1 1 0 11-2 0V7z" clipRule="evenodd" />
                </svg>
              </button>
              {showComments[sectionKey] && (
                <div className="absolute top-full right-0 w-64 bg-white border rounded-lg shadow-lg z-10" data-testid={`comment-thread-${sectionKey}`}>
                  <div className="p-2">
                    <h4 className="font-semibold">Comments</h4>
                    {comments.filter(c => c.field === sectionKey).map((comment, index) => (
                      <Comment key={index} comment={comment} />
                    ))}
                    <textarea className="w-full p-1 border rounded mt-2" placeholder="Add a comment..." value={commentText} onChange={(e) => setCommentText(e.target.value)}></textarea>
                    <button onClick={() => handleAddComment(sectionKey, commentText)} className="mt-1 p-1 bg-blue-500 text-white rounded">Add</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      ))}

      {/* Work Experience Section */}
      <section className="mb-6">
        <h3 className="text-xl font-semibold mb-3">Work Experience</h3>
        {resume.workExperience.map((exp, index) => (
          <div key={index} className="border p-4 rounded-lg mb-4 bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {selectedLocaleData.sections.workExperience.order.map((fieldName: string) => {
                const field = selectedLocaleData.sections.workExperience.fields![fieldName];
                const inputId = `workExperience-${index}-${fieldName}`;
                return (
                  <div key={fieldName} className="relative">
                    <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
                    <input
                      id={inputId}
                      type="text"
                      name={fieldName}
                      placeholder={field.placeholder}
                      value={exp[fieldName as keyof typeof exp]}
                      onChange={(e) => handleWorkExperienceChange(index, e)}
                      className="p-2 border rounded text-black w-full focus:ring-2 focus:ring-blue-500"
                    />
                    <button onClick={() => toggleComments(inputId)} className="absolute top-0 right-0 p-1 text-gray-500 hover:text-black" aria-label={`Comment on ${field.label}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zM9 11a1 1 0 112 0v1a1 1 0 11-2 0v-1zm0-4a1 1 0 112 0v1a1 1 0 11-2 0V7z" clipRule="evenodd" />
                      </svg>
                    </button>
                    {showComments[inputId] && (
                      <div className="absolute top-full right-0 w-64 bg-white border rounded-lg shadow-lg z-10" data-testid={`comment-thread-${inputId}`}>
                        <div className="p-2">
                          <h4 className="font-semibold">Comments</h4>
                          {comments.filter(c => c.field === inputId).map((comment, index) => (
                            <Comment key={index} comment={comment} />
                          ))}
                          <textarea className="w-full p-1 border rounded mt-2" placeholder="Add a comment..." value={commentText} onChange={(e) => setCommentText(e.target.value)}></textarea>
                          <button onClick={() => handleAddComment(inputId, commentText)} className="mt-1 p-1 bg-blue-500 text-white rounded">Add</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="relative">
              <label htmlFor={`workExperience-description-${index}`} className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                id={`workExperience-description-${index}`}
                name="description"
                placeholder={selectedLocaleData.sections.workExperience.fields!.description.placeholder}
                value={exp.description}
                onChange={(e) => handleWorkExperienceChange(index, e)}
                className="p-2 border rounded w-full text-black focus:ring-2 focus:ring-blue-500"
                rows={4}
              ></textarea>
              <button onClick={() => toggleComments(`workExperience-description-${index}`)} className="absolute top-0 right-0 p-1 text-gray-500 hover:text-black" aria-label={`Comment on work experience description`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zM9 11a1 1 0 112 0v1a1 1 0 11-2 0v-1zm0-4a1 1 0 112 0v1a1 1 0 11-2 0V7z" clipRule="evenodd" />
                </svg>
              </button>
              {showComments[`workExperience-description-${index}`] && (
                <div className="absolute top-full right-0 w-64 bg-white border rounded-lg shadow-lg z-10" data-testid={`comment-thread-workExperience-description-${index}`}>
                  <div className="p-2">
                    <h4 className="font-semibold">Comments</h4>
                    {comments.filter(c => c.field === `workExperience-description-${index}`).map((comment, index) => (
                      <Comment key={index} comment={comment} />
                    ))}
                    <textarea className="w-full p-1 border rounded mt-2" placeholder="Add a comment..." value={commentText} onChange={(e) => setCommentText(e.target.value)}></textarea>
                    <button onClick={() => handleAddComment(`workExperience-description-${index}`, commentText)} className="mt-1 p-1 bg-blue-500 text-white rounded">Add</button>
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={() => removeWorkExperienceEntry(index)}
              className="mt-2 p-2 bg-red-500 text-white rounded focus:ring-2 focus:ring-red-500"
              aria-label={`Remove ${exp.title} work experience`}
            >
              Remove Experience
            </button>
          </div>
        ))}
        <button
          onClick={addWorkExperienceEntry}
          className="p-2 bg-blue-500 text-white rounded focus:ring-2 focus:ring-blue-500"
        >
          Add Work Experience
        </button>
      </section>

      {/* Education Section */}
      <section className="mb-6">
        <h3 className="text-xl font-semibold mb-3">Education</h3>
        {resume.education.map((edu, index) => (
          <div key={index} className="border p-4 rounded-lg mb-4 bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {selectedLocaleData.sections.education.order.map((fieldName: string) => {
                const field = selectedLocaleData.sections.education.fields![fieldName];
                const inputId = `education-${index}-${fieldName}`;
                return (
                  <div key={fieldName} className="relative">
                    <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
                    <input
                      id={inputId}
                      type="text"
                      name={fieldName}
                      placeholder={field.placeholder}
                      value={edu[fieldName as keyof typeof edu]}
                      onChange={(e) => handleEducationChange(index, e)}
                      className="p-2 border rounded text-black w-full focus:ring-2 focus:ring-blue-500"
                    />
                    <button onClick={() => toggleComments(inputId)} className="absolute top-0 right-0 p-1 text-gray-500 hover:text-black" aria-label={`Comment on ${field.label}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zM9 11a1 1 0 112 0v1a1 1 0 11-2 0v-1zm0-4a1 1 0 112 0v1a1 1 0 11-2 0V7z" clipRule="evenodd" />
                      </svg>
                    </button>
                    {showComments[inputId] && (
                      <div className="absolute top-full right-0 w-64 bg-white border rounded-lg shadow-lg z-10" data-testid={`comment-thread-${inputId}`}>
                        <div className="p-2">
                          <h4 className="font-semibold">Comments</h4>
                          {comments.filter(c => c.field === inputId).map((comment, index) => (
                            <Comment key={index} comment={comment} />
                          ))}
                          <textarea className="w-full p-1 border rounded mt-2" placeholder="Add a comment..." value={commentText} onChange={(e) => setCommentText(e.target.value)}></textarea>
                          <button onClick={() => handleAddComment(inputId, commentText)} className="mt-1 p-1 bg-blue-500 text-white rounded">Add</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <button
              onClick={() => removeEducationEntry(index)}
              className="mt-2 p-2 bg-red-500 text-white rounded focus:ring-2 focus:ring-red-500"
              aria-label={`Remove ${edu.degree} education entry`}
            >
              Remove Education
            </button>
          </div>
        ))}
        <button
          onClick={addEducationEntry}
          className="p-2 bg-blue-500 text-white rounded focus:ring-2 focus:ring-blue-500"
        >
          Add Education
        </button>
      </section>

      <div className="mt-6 text-center">
        <input type="file" id="pdf-upload" style={{ display: 'none' }} onChange={handlePdfUpload} aria-hidden="true" />
        <button
          onClick={() => document.getElementById('pdf-upload')!.click()}
          className="p-3 bg-blue-600 text-white rounded-lg text-lg font-semibold mr-4 focus:ring-2 focus:ring-blue-600"
        >
          Import from PDF
        </button>
        <button
          onClick={updateVersion}
          className="p-3 bg-yellow-500 text-white rounded-lg text-lg font-semibold mr-4 focus:ring-2 focus:ring-yellow-500"
        >
          New Version ({resume.version})
        </button>
        <button
          onClick={handleExportPdf}
          className="p-3 bg-green-600 text-white rounded-lg text-lg font-semibold focus:ring-2 focus:ring-green-600"
        >
          Export to PDF
        </button>
      </div>
    </div>
  );
};

export default ResumeBuilder;
