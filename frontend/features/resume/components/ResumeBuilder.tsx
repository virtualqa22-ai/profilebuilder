import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useResumeStore } from '@/store/resumeStore';
import { getLocaleByCode, ILocale } from '@/backend/lib/localeService';
import { useLocale } from '@/backend/lib/locale';
import { validateResumeData } from '@/shared/validations';
import Comment from './Comment';
import LocaleSelector from '@/frontend/components/ui/LocaleSelector';
import ErrorBoundary from '@/frontend/components/ui/ErrorBoundary';
import AdComponent from '@/frontend/components/AdComponent';
import Toast from '@/frontend/components/ui/Toast';
import PersonalInfoForm from './forms/PersonalInfoForm';
import WorkExperienceSection from './sections/WorkExperienceSection';
import EducationSection from './sections/EducationSection';
import OptionalFieldsManager from './managers/OptionalFieldsManager';
import CommentSystem from './comments/CommentSystem';
import ExportControls from './controls/ExportControls';
import HighlightedTextarea from './HighlightedTextarea';

interface ResumeBuilderProps {
  locale: string;
}


const ResumeBuilder: React.FC<ResumeBuilderProps> = ({ locale }) => {
  // prefer context locale when present
  let contextLocale = undefined;
  try {
    contextLocale = (useLocale() as any).locale;
  } catch (e) {
    contextLocale = undefined;
  }
  const effectiveLocale = locale || contextLocale || 'en-US';
  const { resume, updatePersonalInfo, updateSummary, addWorkExperience, updateWorkExperience, removeWorkExperience, addEducation, updateEducation, removeEducation, updateSkills, updateProjects, updateAwardsCertifications, updateLocale, updateVersion, setResume } = useResumeStore();
  // Handle optional fields (photos, certifications, hobbies, references)
  // Handle file upload for photos and certifications
  const handleOptionalFileUpload = async (field: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setResume({ ...resume, [field]: data.url });
      } else {
        setToast({ message: data.error || 'Upload failed', type: 'error' });
      }
    } catch (e) {
      setToast({ message: 'Upload failed', type: 'error' });
    }
  };

  const handleOptionalFieldChange = (field: string, value: string) => {
    setResume({
      ...resume,
      [field]: value,
    });
  };
  // Render optional fields UI if enabled in locale
  const renderOptionalFields = () => {
    if (!selectedLocaleData?.optionalFields) return null;


    
    const fields = [
      { key: 'photos', label: 'Photos', type: 'file' },
      { key: 'certifications', label: 'Certifications', type: 'file' },
      { key: 'hobbies', label: 'Hobbies', type: 'text' },
      { key: 'references', label: 'References', type: 'text' },
    ];
    return (
      <section className="mb-6">
        <h3 className="text-xl font-semibold mb-3">Optional Fields</h3>
        <div className="mb-4">
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              checked={photoPrivacy}
              onChange={() => setPhotoPrivacy(!photoPrivacy)}
              className="mr-2"
            />
            Show photo in resume (privacy toggle)
          </label>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fields.map(({ key, label, type }) => {
            const config = selectedLocaleData.optionalFields?.[key];
            if (!config?.enabled) return null;
            if (key === 'photos' && !photoPrivacy) return null;
            return (
              <div key={key}>
                <label htmlFor={key} className="block text-sm font-medium text-gray-700 mb-1">
                  {label}
                  {config.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                {type === 'file' ? (
                  <>
                    <input
                      id={key}
                      type="file"
                      name={key}
                      accept={key === 'photos' ? 'image/*' : '*'}
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) handleOptionalFileUpload(key, file);
                      }}
                      className="p-2 border rounded text-black w-full focus:ring-2"
                      required={!!config.required && !(resume as any)[key]}
                    />
                    {(resume as any)[key] && (
                      <div className="mt-2">
                        {key === 'photos' ? (
                          <img src={(resume as any)[key]} alt="Uploaded" className="max-h-32" />
                        ) : (
                          <a href={(resume as any)[key]} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">View Uploaded</a>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <input
                    id={key}
                    type={type}
                    name={key}
                    placeholder={`Enter ${label.toLowerCase()}`}
                    value={(resume as any)[key] || ''}
                    onChange={e => handleOptionalFieldChange(key, e.target.value)}
                    className={`p-2 border rounded text-black w-full focus:ring-2`}
                    required={!!config.required}
                  />
                )}
              </div>
            );
          })}
        </div>
      </section>
   );
  };
  const [photoPrivacy, setPhotoPrivacy] = useState(true);
  const [message, setMessage] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [showComments, setShowComments] = useState<Record<string, boolean>>({});
  const [comments, setComments] = useState<any[]>([]);
  const [showOptionalFields, setShowOptionalFields] = useState<Record<string, boolean>>({});
  
  const [lintResults, setLintResults] = useState<Record<string, { issues: any[], score: number }>>({});

  const selectedLocaleData = getLocaleByCode(effectiveLocale);
  const { data: session } = useSession();
  const lintTimeouts = useRef<Record<string, NodeJS.Timeout>>({});
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  const debouncedLint = useCallback(async (fieldId: string, content: string) => {
    if (lintTimeouts.current[fieldId]) {
      clearTimeout(lintTimeouts.current[fieldId]);
    }
    lintTimeouts.current[fieldId] = setTimeout(async () => {
      try {
        const response = await fetch('/api/v1/ai/lint', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ content }),
        });
        const data = await response.json();
        if (data.success) {
          setLintResults(prev => ({ ...prev, [fieldId]: { issues: data.data.issues, score: data.data.score } }));
        }
      } catch (error) {
        console.error('Lint error:', error);
      }
    }, 500);
  }, []);

  const debouncedSave = useCallback((resumeId: string, data: any) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/resumes/${resumeId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });
        const result = await response.json();
        if (!result.success) {
          throw new Error(result.error || 'Save failed');
        }
      } catch (error) {
        console.error('Failed to autosave:', error);
        setSaveStatus('error');
      }
    }, 2500);
  }, []);

  useEffect(() => {
    updateLocale(locale);
  }, [locale, updateLocale]);

  useEffect(() => {
    setSaveStatus('saved');
    debouncedSave(resume._id, resume);
  }, [resume, debouncedSave]);
  // Memoize validation errors to only recalculate when resume or locale data changes
  const validationErrors = useMemo(() => {
    if (!selectedLocaleData) {
      return {};
    }
    return validateResumeData(resume, selectedLocaleData);
  }, [resume, selectedLocaleData]);

  const handleFieldChange = (sectionKey: string, fieldName: string, value: string) => {
    const field = selectedLocaleData?.sections[sectionKey]?.fields?.[fieldName];
    if (field?.optional && !showOptionalFields[fieldName]) {
      // If an optional field is being hidden, clear its value
      switch (sectionKey) {
        case 'personalInfo':
          updatePersonalInfo({ [fieldName]: '' });
          break;
        // Add other sections if they have optional fields
        default:
          break;
      }
      return;
    }

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

  const validateResume = useCallback(() => {
    return Object.keys(validationErrors).length === 0;
  }, [validationErrors]);

  const handleExportPdf = async () => {
    if (!validateResume()) {
      setMessage('Please fill in all required fields.');
      return;
    }
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
    if (!validateResume()) {
      setMessage('Please fill in all required fields before importing.');
      return;
    }
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
        updateProjects(data.projects);
        updateAwardsCertifications(data.awardsCertifications);
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
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const toggleComments = (field: string) => {
    setShowComments(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleAddComment = async (field: string, text: string) => {
    try {
      const author = session?.user?.name || session?.user?.email || 'Anonymous';
      const response = await fetch(`/api/resumes/${resume._id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ field, text, author }),
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
      <div className="mb-4">
        <ErrorBoundary>
          <LocaleSelector />
        </ErrorBoundary>
      </div>
      <h2 className="text-2xl font-bold mb-4">Resume Builder</h2>
      <div className="text-right text-sm mb-2" aria-live="polite">
        {saveStatus === 'saving' && <span className="text-yellow-600">Saving...</span>}
        {saveStatus === 'saved' && <span className="text-green-600">Saved!</span>}
        {saveStatus === 'error' && <span className="text-red-600">Error saving!</span>}
      </div>

      {Object.entries(selectedLocaleData.sections).map(([sectionKey, section]) => {
        if (sectionKey === 'personalInfo') {
          return (
            <PersonalInfoForm
              key={sectionKey}
              selectedLocaleData={selectedLocaleData}
              resume={resume}
              handleFieldChange={handleFieldChange}
              showOptionalFields={showOptionalFields}
              setShowOptionalFields={setShowOptionalFields}
              validationErrors={validationErrors}
              toggleComments={toggleComments}
              showComments={showComments}
              comments={comments}
              commentText={commentText}
              setCommentText={setCommentText}
              handleAddComment={handleAddComment}
              CommentComponent={Comment}
            />
          );
        }
        if (sectionKey === 'workExperience') {
          return (
            <WorkExperienceSection
              key={sectionKey}
              selectedLocaleData={selectedLocaleData}
              resume={resume}
              handleWorkExperienceChange={handleWorkExperienceChange}
              debouncedLint={debouncedLint}
              addWorkExperienceEntry={addWorkExperienceEntry}
              removeWorkExperienceEntry={removeWorkExperienceEntry}
              validationErrors={validationErrors}
              toggleComments={toggleComments}
              showComments={showComments}
              comments={comments}
              commentText={commentText}
              setCommentText={setCommentText}
              handleAddComment={handleAddComment}
              CommentComponent={Comment}
            />
          );
        }
        if (sectionKey === 'education') {
          return (
            <EducationSection
              key={sectionKey}
              selectedLocaleData={selectedLocaleData}
              resume={resume}
              handleEducationChange={handleEducationChange}
              addEducationEntry={addEducationEntry}
              removeEducationEntry={removeEducationEntry}
              validationErrors={validationErrors}
              toggleComments={toggleComments}
              showComments={showComments}
              comments={comments}
              commentText={commentText}
              setCommentText={setCommentText}
              handleAddComment={handleAddComment}
              CommentComponent={Comment}
            />
          );
        }
        return (
          <section key={sectionKey} className="mb-6">
            <h3 className="text-xl font-semibold mb-3">{section.label}</h3>
            {section.fields && section.order && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {section.order.map((fieldName: string) => {
                  const field = section.fields![fieldName];
                  const inputId = `${sectionKey}-${fieldName}`;
                  return (
                    <div key={fieldName} className="relative">
                      <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">
                        {field.label}
                        {field.optional && (
                          <input
                            type="checkbox"
                            className="ml-2"
                            checked={showOptionalFields[fieldName] || false}
                            onChange={() => setShowOptionalFields(prev => ({ ...prev, [fieldName]: !prev[fieldName] }))}
                          />
                        )}
                      </label>
                      {(field.optional === undefined || !field.optional || showOptionalFields[fieldName]) && (
                        <input
                          id={inputId}
                          type="text"
                          name={fieldName}
                          placeholder={field.placeholder}
                          value={(resume[sectionKey as keyof typeof resume] as any)?.[fieldName] || ''}
                          onChange={(e) => handleFieldChange(sectionKey, fieldName, e.target.value)}
                          className={`p-2 border rounded text-black w-full focus:ring-2 ${validationErrors[inputId] ? 'border-red-500' : 'focus:ring-blue-500'}`}
                        />
                      )}
                      {validationErrors[inputId] && <p className="text-red-500 text-xs mt-1">{validationErrors[inputId]}</p>}
                      <button onClick={() => toggleComments(inputId)} className="absolute top-0 right-0 p-1 text-gray-500 hover:text-black" aria-label={`Comment on ${field.label}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zM9 11a1 1 0 112 0v1a1 1 0 11-2 0v-1zm0-4a1 1 0 112 0v1a1 1 0 11-2 0V7z" clipRule="evenodd" />
                        </svg>
                      </button>
                      <CommentSystem
                        fieldId={inputId}
                        showComments={showComments[inputId]}
                        comments={comments}
                        commentText={commentText}
                        setCommentText={setCommentText}
                        handleAddComment={handleAddComment}
                        CommentComponent={Comment}
                      />
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
                  onChange={(e) => { handleFieldChange(sectionKey, sectionKey, e.target.value); debouncedLint(sectionKey, e.target.value); }}
                  className={`p-2 border rounded w-full text-black focus:ring-2 ${validationErrors[sectionKey] ? 'border-red-500' : 'focus:ring-blue-500'}`}
                  rows={5}
                ></textarea>
                {validationErrors[sectionKey] && <p className="text-red-500 text-xs mt-1">{validationErrors[sectionKey]}</p>}
                <button onClick={() => toggleComments(sectionKey)} className="absolute top-0 right-0 p-1 text-gray-500 hover:text-black" aria-label={`Comment on ${section.label}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zM9 11a1 1 0 112 0v1a1 1 0 11-2 0v-1zm0-4a1 1 0 112 0v1a1 1 0 11-2 0V7z" clipRule="evenodd" />
                  </svg>
                </button>
                <CommentSystem
                  fieldId={sectionKey}
                  showComments={showComments[sectionKey]}
                  comments={comments}
                  commentText={commentText}
                  setCommentText={setCommentText}
                  handleAddComment={handleAddComment}
                  CommentComponent={Comment}
                />
              </div>
            )}
          </section>
        );
      })}

      {/* Optional Fields Section */}
      <OptionalFieldsManager
        selectedLocaleData={selectedLocaleData}
        resume={resume}
        photoPrivacy={photoPrivacy}
        setPhotoPrivacy={setPhotoPrivacy}
        handleOptionalFileUpload={handleOptionalFileUpload}
        handleOptionalFieldChange={handleOptionalFieldChange}
      />


      <ExportControls
        handlePdfUpload={handlePdfUpload}
        updateVersion={updateVersion}
        resume={resume}
        handleExportPdf={handleExportPdf}
      />

      {/* Non-intrusive ad placement in footer */}
      <div className="mt-8 flex justify-center border-t pt-4">
        <AdComponent
          adUnitId={process.env.NEXT_PUBLIC_ADMOB_BANNER_UNIT_ID || ''}
          size="banner"
        />
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default ResumeBuilder;
