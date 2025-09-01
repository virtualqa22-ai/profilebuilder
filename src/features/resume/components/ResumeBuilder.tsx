import React, { useState, useEffect } from 'react';
import { useResumeStore } from '@/store/resumeStore';
import { getLocaleByCode, ILocale } from '@/lib/localeService';

interface ResumeBuilderProps {
  locale: string;
}

const ResumeBuilder: React.FC<ResumeBuilderProps> = ({ locale }) => {
  const { resume, updatePersonalInfo, updateSummary, addWorkExperience, updateWorkExperience, removeWorkExperience, addEducation, updateEducation, removeEducation, updateSkills, updateProjects, updateAwardsCertifications, updateLocale } = useResumeStore();
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

  const handlePersonalInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    updatePersonalInfo({ [name]: value });
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

  const handleSkillsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const skillsArray = e.target.value.split(',').map(skill => skill.trim()).filter(skill => skill.length > 0);
    updateSkills(skillsArray);
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

  return (
    <div className="p-4 border rounded-lg shadow-md bg-white text-black">
      <h2 className="text-2xl font-bold mb-4">Resume Builder</h2>
      <div className="text-right text-sm mb-2">
        {saveStatus === 'saving' && <span className="text-yellow-600">Saving...</span>}
        {saveStatus === 'saved' && <span className="text-green-600">Saved!</span>}
        {saveStatus === 'error' && <span className="text-red-600">Error saving!</span>}
      </div>

      {selectedLocaleData && (
        <>
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
                        onChange={handlePersonalInfoChange}
                        className="p-2 border rounded text-black"
                      />
                    );
                  })}
                </div>
              )}
              {section.placeholder && (
                <textarea
                  name={sectionKey}
                  placeholder={section.placeholder}
                  value={resume[sectionKey as keyof typeof resume] as string}
                  onChange={(e) => updateSummary(e.target.value)}
                  className="p-2 border rounded w-full text-black"
                  rows={5}
                ></textarea>
              )}
            </section>
          ))}
        </>
      )}

      <div className="mt-6 text-center">
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