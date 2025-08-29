import React, { useState, useEffect } from 'react';
import { useResumeStore } from '@/store/resumeStore';

interface Locale {
  _id: string;
  name: string;
  code: string;
}

interface ResumeBuilderProps {
  // Props will be defined here later
}

const ResumeBuilder: React.FC<ResumeBuilderProps> = () => {
  const { resume, updatePersonalInfo, updateSummary, addWorkExperience, updateWorkExperience, removeWorkExperience, addEducation, updateEducation, removeEducation, updateSkills, updateProjects, updateAwardsCertifications, updateLocale } = useResumeStore();
  const [locales, setLocales] = useState<Locale[]>([]);
  const [message, setMessage] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  useEffect(() => {
    fetchLocales();
  }, []);

  // Autosave effect
  useEffect(() => {
    setSaveStatus('saving');
    const handler = setTimeout(async () => {
      try {
        // In a real application, you would send `resume` data to your backend here
        console.log('Autosaving resume:', resume);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        setSaveStatus('saved');
      } catch (error) {
        console.error('Failed to autosave:', error);
        setSaveStatus('error');
      }
    }, 1000); // Save after 1 second of inactivity

    return () => {
      clearTimeout(handler);
    };
  }, [resume]); // Depend on the entire resume object

  const fetchLocales = async () => {
    try {
      const res = await fetch('/api/locales');
      const data = await res.json();
      if (data.success) {
        setLocales(data.data);
        if (data.data.length > 0 && !resume.locale) {
          updateLocale(data.data[0]._id); // Select first locale by default if not already set
        }
      } else {
        setMessage(data.error || 'Failed to fetch locales');
      }
    } catch (error: any) {
      setMessage(error.message || 'An error occurred');
    }
  };

  const handleLocaleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateLocale(e.target.value);
  };

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
    // In a real application, you would send `resume` data to your backend
    // and receive a PDF file in response.
    try {
      // Simulate API call for PDF generation
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

      {/* Locale Selection */}
      <section className="mb-6">
        <h3 className="text-xl font-semibold mb-3">Select Locale</h3>
        <select
          value={resume.locale}
          onChange={handleLocaleChange}
          className="p-2 border rounded w-full text-black"
          required
        >
          {locales.length === 0 ? (
            <option value="">Loading locales...</option>
          ) : (
            locales.map((locale) => (
              <option key={locale._id} value={locale._id}>
                {locale.name} ({locale.code})
              </option>
            ))
          )}
        </select>
        {message && <p className="mt-2 text-red-500">{message}</p>}
      </section>

      {/* Personal Information Section */}
      <section className="mb-6">
        <h3 className="text-xl font-semibold mb-3">Personal Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            name="name"
            placeholder="Full Name"
            value={resume.personalInfo.name}
            onChange={handlePersonalInfoChange}
            className="p-2 border rounded text-black"
            required
          />
          <input
            type="email"
            name="email"
            placeholder="Email Address"
            value={resume.personalInfo.email}
            onChange={handlePersonalInfoChange}
            className="p-2 border rounded text-black"
            required
          />
          <input
            type="tel"
            name="phone"
            placeholder="Phone Number"
            value={resume.personalInfo.phone}
            onChange={handlePersonalInfoChange}
            className="p-2 border rounded text-black"
          />
          <input
            type="url"
            name="linkedin"
            placeholder="LinkedIn Profile URL"
            value={resume.personalInfo.linkedin}
            onChange={handlePersonalInfoChange}
            className="p-2 border rounded text-black"
          />
          <input
            type="url"
            name="github"
            placeholder="GitHub Profile URL"
            value={resume.personalInfo.github}
            onChange={handlePersonalInfoChange}
            className="p-2 border rounded text-black"
          />
          <input
            type="url"
            name="website"
            placeholder="Personal Website URL"
            value={resume.personalInfo.website}
            onChange={handlePersonalInfoChange}
            className="p-2 border rounded text-black"
          />
        </div>
      </section>

      {/* Summary/Objective Section */}
      <section className="mb-6">
        <h3 className="text-xl font-semibold mb-3">Summary/Objective</h3>
        <textarea
          name="summary"
          placeholder="A brief summary or objective statement"
          value={resume.summary}
          onChange={(e) => updateSummary(e.target.value)}
          className="p-2 border rounded w-full text-black"
          rows={5}
        ></textarea>
      </section>

      {/* Work Experience Section */}
      <section className="mb-6">
        <h3 className="text-xl font-semibold mb-3">Work Experience</h3>
        {resume.workExperience.map((exp, index) => (
          <div key={index} className="border p-4 rounded-lg mb-4 bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <input
                type="text"
                name="title"
                placeholder="Job Title"
                value={exp.title}
                onChange={(e) => handleWorkExperienceChange(index, e)}
                className="p-2 border rounded text-black"
              />
              <input
                type="text"
                name="company"
                placeholder="Company"
                value={exp.company}
                onChange={(e) => handleWorkExperienceChange(index, e)}
                className="p-2 border rounded text-black"
              />
              <input
                type="text"
                name="location"
                placeholder="Location"
                value={exp.location}
                onChange={(e) => handleWorkExperienceChange(index, e)}
                className="p-2 border rounded text-black"
              />
              <input
                type="text"
                name="startDate"
                placeholder="Start Date (e.g., Jan 2020)"
                value={exp.startDate}
                onChange={(e) => handleWorkExperienceChange(index, e)}
                className="p-2 border rounded text-black"
              />
              <input
                type="text"
                name="endDate"
                placeholder="End Date (e.g., Dec 2022 or Present)"
                value={exp.endDate}
                onChange={(e) => handleWorkExperienceChange(index, e)}
                className="p-2 border rounded text-black"
              />
            </div>
            <textarea
              name="description"
              placeholder="Responsibilities and achievements (use bullet points)"
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
              <input
                type="text"
                name="degree"
                placeholder="Degree (e.g., Bachelor of Science)"
                value={edu.degree}
                onChange={(e) => handleEducationChange(index, e)}
                className="p-2 border rounded text-black"
              />
              <input
                type="text"
                name="major"
                placeholder="Major (e.g., Computer Science)"
                value={edu.major}
                onChange={(e) => handleEducationChange(index, e)}
                className="p-2 border rounded text-black"
              />
              <input
                type="text"
                name="university"
                placeholder="University Name"
                value={edu.university}
                onChange={(e) => handleEducationChange(index, e)}
                className="p-2 border rounded text-black"
              />
              <input
                type="text"
                name="location"
                placeholder="Location"
                value={edu.location}
                onChange={(e) => handleEducationChange(index, e)}
                className="p-2 border rounded text-black"
              />
              <input
                type="text"
                name="startDate"
                placeholder="Start Date (e.g., Sep 2018)"
                value={edu.startDate}
                onChange={(e) => handleEducationChange(index, e)}
                className="p-2 border rounded text-black"
              />
              <input
                type="text"
                name="endDate"
                placeholder="End Date (e.g., May 2022 or Present)"
                value={edu.endDate}
                onChange={(e) => handleEducationChange(index, e)}
                className="p-2 border rounded text-black"
              />
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

      {/* Skills Section */}
      <section className="mb-6">
        <h3 className="text-xl font-semibold mb-3">Skills</h3>
        <textarea
          name="skills"
          placeholder="Enter your skills, separated by commas (e.g., JavaScript, React, Node.js)"
          value={resume.skills.join(', ')}
          onChange={handleSkillsChange}
          className="p-2 border rounded w-full text-black"
          rows={3}
        ></textarea>
      </section>

      {/* Projects Section */}
      <section className="mb-6">
        <h3 className="text-xl font-semibold mb-3">Projects</h3>
        <textarea
          name="projects"
          placeholder="Describe your projects (e.g., Project Name: Description, Technologies used)"
          value={resume.projects}
          onChange={(e) => updateProjects(e.target.value)}
          className="p-2 border rounded w-full text-black"
          rows={5}
        ></textarea>
      </section>

      {/* Awards and Certifications Section */}
      <section className="mb-6">
        <h3 className="text-xl font-semibold mb-3">Awards and Certifications</h3>
        <textarea
          name="awardsCertifications"
          placeholder="List your awards and certifications"
          value={resume.awardsCertifications}
          onChange={(e) => updateAwardsCertifications(e.target.value)}
          className="p-2 border rounded w-full text-black"
          rows={3}
        ></textarea>
      </section>

      {/* Other sections will go here */}

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