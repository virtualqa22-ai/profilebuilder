import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ResumeBuilder from '../../../frontend/features/resume/components/ResumeBuilder';
import { useResumeStore } from '../../../frontend/store/resumeStore';
import { LocaleProvider } from '../../../backend/lib/locale';

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({
    data: { user: { id: '1', name: 'Test User' } },
    status: 'authenticated',
  })),
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock the resume store
jest.mock('../../../frontend/store/resumeStore', () => ({
  useResumeStore: jest.fn(),
}));

// Mock the moduleNameMapper for @/backend/lib/locale
jest.mock('../../../backend/lib/locale', () => {
  const React = require('react');
  const LocaleContext = React.createContext({
    locale: 'en-US',
    setLocale: jest.fn(),
    availableLocales: [{ locale: 'en-US' }],
  });

  const useLocale = () => React.useContext(LocaleContext);

  const LocaleProvider = ({ children }: { children: React.ReactNode }) => (
    <LocaleContext.Provider value={{ locale: 'en-US', setLocale: jest.fn(), availableLocales: [{ locale: 'en-US' }] }}>
      {children}
    </LocaleContext.Provider>
  );

  return { useLocale, LocaleProvider };
});

// Mock getLocaleByCode
jest.mock('@/backend/lib/localeService', () => ({
  getLocaleByCode: jest.fn(() => ({
    sections: {
      personalInfo: {
        label: 'Personal Information',
        fields: {
          name: { label: 'Name', placeholder: 'Enter your name', optional: false },
          email: { label: 'Email', placeholder: 'Enter your email', optional: false },
        },
        order: ['name', 'email'],
      },
      summary: {
        label: 'Summary',
        placeholder: 'Enter your summary',
        optional: false,
      },
      workExperience: {
        label: 'Work Experience',
        fields: {
          title: { label: 'Title', placeholder: 'Enter job title', optional: false },
          company: { label: 'Company', placeholder: 'Enter company name', optional: false },
          startDate: { label: 'Start Date', placeholder: 'Enter start date', optional: false },
          endDate: { label: 'End Date', placeholder: 'Enter end date', optional: true },
          location: { label: 'Location', placeholder: 'Enter location', optional: true },
          description: { label: 'Description', placeholder: 'Enter description', optional: false },
        },
        order: ['title', 'company', 'startDate', 'endDate', 'location'],
      },
      education: {
        label: 'Education',
        fields: {
          degree: { label: 'Degree', placeholder: 'Enter degree', optional: false },
          major: { label: 'Major', placeholder: 'Enter major', optional: false },
          university: { label: 'University', placeholder: 'Enter university', optional: false },
          startDate: { label: 'Start Date', placeholder: 'Enter start date', optional: false },
          endDate: { label: 'End Date', placeholder: 'Enter end date', optional: false },
          location: { label: 'Location', placeholder: 'Enter location', optional: true },
        },
        order: ['degree', 'major', 'university', 'startDate', 'endDate', 'location'],
      },
      skills: {
        label: 'Skills',
        placeholder: 'Enter your skills',
        optional: false,
      },
      projects: {
        label: 'Projects',
        placeholder: 'Enter your projects',
        optional: true,
      },
      awardsCertifications: {
        label: 'Awards & Certifications',
        placeholder: 'Enter awards and certifications',
        optional: true,
      },
    },
  })),
}));

// Mock the fetch function
global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({ success: true, data: [] }),
    ok: true,
    blob: () => Promise.resolve(new Blob()),
  })
) as jest.Mock;

describe('ResumeBuilder', () => {
  beforeEach(() => {
    (useResumeStore as unknown as jest.Mock).mockReturnValue({
      resume: {
        _id: '123',
        personalInfo: {
          name: 'John Doe',
          email: 'john@example.com',
        },
        summary: 'A summary',
        workExperience: [],
        education: [],
        skills: 'JavaScript, React',
        projects: '',
        awardsCertifications: '',
        comments: [],
        version: 1,
      },
      updatePersonalInfo: jest.fn(),
      updateSummary: jest.fn(),
      addWorkExperience: jest.fn(),
      updateWorkExperience: jest.fn(),
      removeWorkExperience: jest.fn(),
      addEducation: jest.fn(),
      updateEducation: jest.fn(),
      removeEducation: jest.fn(),
      updateSkills: jest.fn(),
      updateProjects: jest.fn(),
      updateAwardsCertifications: jest.fn(),
      updateLocale: jest.fn(),
      updateVersion: jest.fn(),
      setResume: jest.fn(),
    });
  });

  it('should render the ResumeBuilder component', () => {
    render(
      <LocaleProvider>
        <ResumeBuilder locale="en-US" />
      </LocaleProvider>
    );

    expect(screen.getByText('Resume Builder')).toBeInTheDocument();
  });

  it('should display personal information fields', () => {
    render(
      <LocaleProvider>
        <ResumeBuilder locale="en-US" />
      </LocaleProvider>
    );

    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('should display summary field', () => {
    render(
      <LocaleProvider>
        <ResumeBuilder locale="en-US" />
      </LocaleProvider>
    );

    expect(screen.getByLabelText('Summary')).toBeInTheDocument();
  });

  it('should display work experience section', () => {
    render(
      <LocaleProvider>
        <ResumeBuilder locale="en-US" />
      </LocaleProvider>
    );

    expect(screen.getByRole('heading', { name: /work experience/i })).toBeInTheDocument();
    expect(screen.getByText('Add Work Experience')).toBeInTheDocument();
  });

  it('should display education section', () => {
    render(
      <LocaleProvider>
        <ResumeBuilder locale="en-US" />
      </LocaleProvider>
    );

    expect(screen.getByRole('heading', { name: /education/i })).toBeInTheDocument();
    expect(screen.getByText('Add Education')).toBeInTheDocument();
  });

  it('should display skills field', () => {
    render(
      <LocaleProvider>
        <ResumeBuilder locale="en-US" />
      </LocaleProvider>
    );

    expect(screen.getByLabelText('Skills')).toBeInTheDocument();
  });

  it('should display export to PDF button', () => {
    render(
      <LocaleProvider>
        <ResumeBuilder locale="en-US" />
      </LocaleProvider>
    );

    expect(screen.getByText('Export to PDF')).toBeInTheDocument();
  });

  it('should display import from PDF button', () => {
    render(
      <LocaleProvider>
        <ResumeBuilder locale="en-US" />
      </LocaleProvider>
    );

    expect(screen.getByText('Import from PDF')).toBeInTheDocument();
  });

  it('should allow adding work experience', () => {
    render(
      <LocaleProvider>
        <ResumeBuilder locale="en-US" />
      </LocaleProvider>
    );

    const addButton = screen.getByText('Add Work Experience');
    fireEvent.click(addButton);

    // After adding, there should be a remove button
    expect(screen.getByText('Remove Experience')).toBeInTheDocument();
  });

  it('should allow adding education', () => {
    render(
      <LocaleProvider>
        <ResumeBuilder locale="en-US" />
      </LocaleProvider>
    );

    const addButton = screen.getByText('Add Education');
    fireEvent.click(addButton);

    // After adding, there should be a remove button
    expect(screen.getByText('Remove Education')).toBeInTheDocument();
  });

  it('should handle PDF export', async () => {
    render(
      <LocaleProvider>
        <ResumeBuilder locale="en-US" />
      </LocaleProvider>
    );

    const exportButton = screen.getByText('Export to PDF');
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/generate-pdf', expect.any(Object));
    });
  });

  it('should show validation errors for required fields on PDF export', () => {
    // Mock empty resume
    (useResumeStore as unknown as jest.Mock).mockReturnValue({
      resume: {
        _id: '123',
        personalInfo: {},
        summary: '',
        workExperience: [],
        education: [],
        skills: '',
        projects: '',
        awardsCertifications: '',
        comments: [],
        version: 1,
      },
      updatePersonalInfo: jest.fn(),
      updateSummary: jest.fn(),
      addWorkExperience: jest.fn(),
      updateWorkExperience: jest.fn(),
      removeWorkExperience: jest.fn(),
      addEducation: jest.fn(),
      updateEducation: jest.fn(),
      removeEducation: jest.fn(),
      updateSkills: jest.fn(),
      updateProjects: jest.fn(),
      updateAwardsCertifications: jest.fn(),
      updateLocale: jest.fn(),
      updateVersion: jest.fn(),
      setResume: jest.fn(),
    });

    render(
      <LocaleProvider>
        <ResumeBuilder locale="en-US" />
      </LocaleProvider>
    );

    const exportButton = screen.getByText('Export to PDF');
    fireEvent.click(exportButton);

    expect(screen.getByText('Please fill in all required fields.')).toBeInTheDocument();
  });
});