import React, { useState, useEffect } from 'react';
import { useResumeStore } from '@/store/resumeStore';
import { getLocaleByCode, ILocale } from '@/lib/localeService';

interface ResumeBuilderProps {
  locale: string;
}

const ResumeBuilder: React.FC<ResumeBuilderProps> = ({ locale }) => {
  const { resume, updatePersonalInfo, updateSummary, addWorkExperience, updateWorkExperience, removeWorkExperience, addEducation, updateEducation, removeEducation, updateSkills, updateProjects, updateAwardsCertifications, updateLocale, updateVersion } = useResumeStore();
  const [message, setMessage] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

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

  if (!selectedLocaleData) {
    return <div>Loading locale data...</div>;
  }

  return (
    <div className="p-4 border rounded-lg shadow-md bg-white text-black">
      <h2 className="text-2xl font-bold mb-4">Resume Builder</h2>
      <div className="text-right text-sm mb-2">
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
                return (
                  <input
                    key={fieldName}
                    type="text"
                    name={fieldName}
                    placeholder={field.placeholder}
                    value={(resume[sectionKey as keyof typeof resume] as any)?.[fieldName] || ''}
                    onChange={(e) => handleFieldChange(sectionKey, fieldName, e.target.value)}
                    className="p-2 border rounded text-black"
                  />
                );
              })}
            </div>
          )}
          {section.placeholder && !section.fields && (
            <textarea
              name={sectionKey}
              placeholder={section.placeholder}
              value={resume[sectionKey as keyof typeof resume] as string}
              onChange={(e) => handleFieldChange(sectionKey, sectionKey, e.target.value)}
              className="p-2 border rounded w-full text-black"
              rows={5}
            ></textarea>
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
                return (
                  <input
                    key={fieldName}
                    type="text"
                    name={fieldName}
                    placeholder={field.placeholder}
                    value={exp[fieldName as keyof typeof exp]}
                    onChange={(e) => handleWorkExperienceChange(index, e)}
                    className="p-2 border rounded text-black"
                  />
                );
              })}
            </div>
            <textarea
              name="description"
              placeholder={selectedLocaleData.sections.workExperience.fields!.description.placeholder}
              value={exp.description}
              onChange={(e) => handleWorkExperienceChange(index, e)}
              className="p-2 border rounded w-full text-black"
              rows={4}
            ></textarea>
            <button
              onClick={() => removeWorkExperienceEntry(index)}
              className="mt-2 p-2 bg-red-500 text-white rounded"
            >
              Remove Experience
            </button>
          </div>
        ))}
        <button
          onClick={addWorkExperienceEntry}
          className="p-2 bg-blue-500 text-white rounded"
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
                return (
                  <input
                    key={fieldName}
                    type="text"
                    name={fieldName}
                    placeholder={field.placeholder}
                    value={edu[fieldName as keyof typeof edu]}
                    onChange={(e) => handleEducationChange(index, e)}
                    className="p-2 border rounded text-black"
                  />
                );
              })}
            </div>
            <button
              onClick={() => removeEducationEntry(index)}
              className="mt-2 p-2 bg-red-500 text-white rounded"
            >
              Remove Education
            </button>
          </div>
        ))}
        <button
          onClick={addEducationEntry}
          className="p-2 bg-blue-500 text-white rounded"
        >
          Add Education
        </button>
      </section>

      <div className="mt-6 text-center">
        <input type="file" id="pdf-upload" style={{ display: 'none' }} onChange={handlePdfUpload} />
        <button
          onClick={() => document.getElementById('pdf-upload')!.click()}
          className="p-3 bg-blue-600 text-white rounded-lg text-lg font-semibold mr-4"
        >
          Import from PDF
        </button>
        <button
          onClick={updateVersion}
          className="p-3 bg-yellow-500 text-white rounded-lg text-lg font-semibold mr-4"
        >
          New Version ({resume.version})
        </button>
        <button
          onClick={handleExportPdf}
          className="p-3 bg-green-600 text-white rounded-lg text-lg font-semibold"
        >
          Export to PDF
        </button>
      </div>
    </div>
  );
};

export default ResumeBuilder;
