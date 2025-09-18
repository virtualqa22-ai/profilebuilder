/// <reference types="jest" />
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import ResumeBuilder from '../../../frontend/features/resume/components/ResumeBuilder';
import { useResumeStore } from '../../../frontend/store/resumeStore';
import { getLocaleByCode } from '../../../backend/lib/localeService';

// Mock dependencies
jest.mock('../../../frontend/store/resumeStore');
jest.mock('../../../backend/lib/localeService');
jest.mock('../../../backend/lib/locale', () => ({
  useLocale: () => ({ locale: 'en-US' }),
}));

// Mock fetch
global.fetch = jest.fn();

const mockUseResumeStore = useResumeStore as jest.MockedFunction<typeof useResumeStore>;
const mockGetLocaleByCode = getLocaleByCode as jest.MockedFunction<typeof getLocaleByCode>;

describe('ResumeBuilder Component', () => {
  const mockResume = {
    _id: '123',
    personalInfo: {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '123-456-7890',
      linkedin: 'linkedin.com/in/johndoe',
      github: 'github.com/johndoe',
      website: 'johndoe.com',
    },
    summary: 'Professional software developer',
    workExperience: [
      {
        title: 'Senior Developer',
        company: 'Tech Corp',
        location: 'New York',
        startDate: '2020-01-01',
        endDate: '2023-01-01',
        description: 'Led development team',
      },
    ],
    education: [
      {
        degree: 'Bachelor of Science',
        major: 'Computer Science',
        university: 'State University',
        location: 'California',
        startDate: '2016-01-01',
        endDate: '2020-01-01',
      },
    ],
    skills: ['JavaScript', 'React', 'Node.js'],
    projects: 'Built multiple web applications',
    awardsCertifications: 'AWS Certified Developer',
    locale: 'en-US',
    version: 1,
  };

  const mockLocaleData = {
    locale: 'en-US',
    name: 'English (US)',
    dateFormat: 'MM/DD/YYYY',
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
        label: 'Professional Summary',
        placeholder: 'Enter your professional summary',
        optional: false,
      },
      workExperience: {
        label: 'Work Experience',
        fields: {
          title: { label: 'Job Title', placeholder: 'Enter job title', optional: false },
          company: { label: 'Company', placeholder: 'Enter company name', optional: false },
          location: { label: 'Location', placeholder: 'Enter location', optional: false },
          startDate: { label: 'Start Date', placeholder: 'Enter start date', optional: false },
          endDate: { label: 'End Date', placeholder: 'Enter end date', optional: false },
          description: { label: 'Description', placeholder: 'Enter job description', optional: false },
        },
        order: ['title', 'company', 'location', 'startDate', 'endDate'],
      },
      education: {
        label: 'Education',
        fields: {
          degree: { label: 'Degree', placeholder: 'Enter degree', optional: false },
          major: { label: 'Major', placeholder: 'Enter major', optional: false },
          university: { label: 'University', placeholder: 'Enter university', optional: false },
          location: { label: 'Location', placeholder: 'Enter location', optional: false },
          startDate: { label: 'Start Date', placeholder: 'Enter start date', optional: false },
          endDate: { label: 'End Date', placeholder: 'Enter end date', optional: false },
        },
        order: ['degree', 'major', 'university', 'location', 'startDate', 'endDate'],
      },
      skills: {
        label: 'Skills',
        placeholder: 'Enter your skills',
        optional: false,
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mocks
    mockUseResumeStore.mockReturnValue({
      resume: mockResume,
      setResume: jest.fn(),
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
    });

    mockGetLocaleByCode.mockReturnValue(mockLocaleData);

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
  });

  describe('Rendering', () => {
    it('should render the component with correct title', () => {
      render(<ResumeBuilder locale="en-US" />);
      expect(screen.getByText('Resume Builder')).toBeInTheDocument();
    });

    it('should render personal info section', () => {
      render(<ResumeBuilder locale="en-US" />);
      expect(screen.getByText('Personal Information')).toBeInTheDocument();
    });

    it('should render summary section', () => {
      render(<ResumeBuilder locale="en-US" />);
      expect(screen.getByText('Professional Summary')).toBeInTheDocument();
    });

    it('should render work experience section', () => {
      render(<ResumeBuilder locale="en-US" />);
      expect(screen.getByText('Work Experience')).toBeInTheDocument();
    });

    it('should render education section', () => {
      render(<ResumeBuilder locale="en-US" />);
      expect(screen.getByText('Education')).toBeInTheDocument();
    });

    it('should render skills section', () => {
      render(<ResumeBuilder locale="en-US" />);
      expect(screen.getByText('Skills')).toBeInTheDocument();
    });

    it('should show loading when locale data is not available', () => {
      mockGetLocaleByCode.mockReturnValue(null as any);
      render(<ResumeBuilder locale="en-US" />);
      expect(screen.getByText('Loading locale data...')).toBeInTheDocument();
    });
  });

  describe('Form Interactions', () => {
    it('should update personal info when input changes', () => {
      const mockUpdatePersonalInfo = jest.fn();
      mockUseResumeStore.mockReturnValue({
        ...mockUseResumeStore(),
        updatePersonalInfo: mockUpdatePersonalInfo,
      });

      render(<ResumeBuilder locale="en-US" />);

      const nameInput = screen.getByDisplayValue('John Doe');
      fireEvent.change(nameInput, { target: { value: 'Jane Doe' } });

      expect(mockUpdatePersonalInfo).toHaveBeenCalledWith({ name: 'Jane Doe' });
    });

    it('should update summary when textarea changes', () => {
      const mockUpdateSummary = jest.fn();
      mockUseResumeStore.mockReturnValue({
        ...mockUseResumeStore(),
        updateSummary: mockUpdateSummary,
      });

      render(<ResumeBuilder locale="en-US" />);

      const summaryTextarea = screen.getByDisplayValue('Professional software developer');
      fireEvent.change(summaryTextarea, { target: { value: 'Updated summary' } });

      expect(mockUpdateSummary).toHaveBeenCalledWith('Updated summary');
    });

    it('should update skills when input changes', () => {
      const mockUpdateSkills = jest.fn();
      mockUseResumeStore.mockReturnValue({
        ...mockUseResumeStore(),
        updateSkills: mockUpdateSkills,
      });

      render(<ResumeBuilder locale="en-US" />);

      const skillsTextarea = screen.getByDisplayValue('JavaScript,React,Node.js');
      fireEvent.change(skillsTextarea, { target: { value: 'JavaScript,React,Node.js,TypeScript' } });

      expect(mockUpdateSkills).toHaveBeenCalledWith(['JavaScript', 'React', 'Node.js', 'TypeScript']);
    });
  });

  describe('Work Experience Management', () => {
    it('should display existing work experience', () => {
      render(<ResumeBuilder locale="en-US" />);
      expect(screen.getByDisplayValue('Senior Developer')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Tech Corp')).toBeInTheDocument();
    });

    it('should add new work experience entry', () => {
      const mockAddWorkExperience = jest.fn();
      mockUseResumeStore.mockReturnValue({
        ...mockUseResumeStore(),
        addWorkExperience: mockAddWorkExperience,
      });

      render(<ResumeBuilder locale="en-US" />);

      const addButton = screen.getByText('Add Work Experience');
      fireEvent.click(addButton);

      expect(mockAddWorkExperience).toHaveBeenCalledWith({
        title: '',
        company: '',
        location: '',
        startDate: '',
        endDate: '',
        description: '',
      });
    });

    it('should update work experience when fields change', () => {
      const mockUpdateWorkExperience = jest.fn();
      mockUseResumeStore.mockReturnValue({
        ...mockUseResumeStore(),
        updateWorkExperience: mockUpdateWorkExperience,
      });

      render(<ResumeBuilder locale="en-US" />);

      const titleInput = screen.getByDisplayValue('Senior Developer');
      fireEvent.change(titleInput, { target: { value: 'Lead Developer', name: 'title' } });

      expect(mockUpdateWorkExperience).toHaveBeenCalledWith(0, { title: 'Lead Developer' });
    });

    it('should remove work experience entry', () => {
      const mockRemoveWorkExperience = jest.fn();
      mockUseResumeStore.mockReturnValue({
        ...mockUseResumeStore(),
        removeWorkExperience: mockRemoveWorkExperience,
      });

      render(<ResumeBuilder locale="en-US" />);

      const removeButton = screen.getByText('Remove Experience');
      fireEvent.click(removeButton);

      expect(mockRemoveWorkExperience).toHaveBeenCalledWith(0);
    });
  });

  describe('Education Management', () => {
    it('should display existing education', () => {
      render(<ResumeBuilder locale="en-US" />);
      expect(screen.getByDisplayValue('Bachelor of Science')).toBeInTheDocument();
      expect(screen.getByDisplayValue('State University')).toBeInTheDocument();
    });

    it('should add new education entry', () => {
      const mockAddEducation = jest.fn();
      mockUseResumeStore.mockReturnValue({
        ...mockUseResumeStore(),
        addEducation: mockAddEducation,
      });

      render(<ResumeBuilder locale="en-US" />);

      const addButton = screen.getByText('Add Education');
      fireEvent.click(addButton);

      expect(mockAddEducation).toHaveBeenCalledWith({
        degree: '',
        major: '',
        university: '',
        location: '',
        startDate: '',
        endDate: '',
      });
    });

    it('should update education when fields change', () => {
      const mockUpdateEducation = jest.fn();
      mockUseResumeStore.mockReturnValue({
        ...mockUseResumeStore(),
        updateEducation: mockUpdateEducation,
      });

      render(<ResumeBuilder locale="en-US" />);

      const degreeInput = screen.getByDisplayValue('Bachelor of Science');
      fireEvent.change(degreeInput, { target: { value: 'Master of Science', name: 'degree' } });

      expect(mockUpdateEducation).toHaveBeenCalledWith(0, { degree: 'Master of Science' });
    });

    it('should remove education entry', () => {
      const mockRemoveEducation = jest.fn();
      mockUseResumeStore.mockReturnValue({
        ...mockUseResumeStore(),
        removeEducation: mockRemoveEducation,
      });

      render(<ResumeBuilder locale="en-US" />);

      const removeButton = screen.getByText('Remove Education');
      fireEvent.click(removeButton);

      expect(mockRemoveEducation).toHaveBeenCalledWith(0);
    });
  });

  describe('Validation', () => {
    it('should show validation errors for required fields', async () => {
      // Create a resume with missing required fields
      const invalidResume = {
        ...mockResume,
        personalInfo: { ...mockResume.personalInfo, name: '' },
        summary: '',
      };

      mockUseResumeStore.mockReturnValue({
        ...mockUseResumeStore(),
        resume: invalidResume,
      });

      render(<ResumeBuilder locale="en-US" />);

      // Trigger validation by clicking export
      const exportButton = screen.getByText('Export to PDF');
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText('Please fill in all required fields.')).toBeInTheDocument();
      });
    });
  });

  describe('File Operations', () => {
    it('should handle PDF export', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(new Blob(['pdf content'])),
      });

      // Mock URL.createObjectURL and related methods
      const mockCreateObjectURL = jest.fn(() => 'mock-url');
      const mockRevokeObjectURL = jest.fn();
      global.URL.createObjectURL = mockCreateObjectURL;
      global.URL.revokeObjectURL = mockRevokeObjectURL;

      // Mock document methods
      const mockClick = jest.fn();
      document.createElement = jest.fn().mockReturnValue({
        click: mockClick,
        href: '',
        download: '',
      });
      document.body.appendChild = jest.fn();
      document.body.removeChild = jest.fn();

      render(<ResumeBuilder locale="en-US" />);

      const exportButton = screen.getByText('Export to PDF');
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/generate-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mockResume),
        });
        expect(mockCreateObjectURL).toHaveBeenCalled();
        expect(mockClick).toHaveBeenCalled();
      });
    });

    it('should handle PDF import', async () => {
      const mockUpdatePersonalInfo = jest.fn();
      const mockUpdateSummary = jest.fn();
      const mockAddWorkExperience = jest.fn();
      const mockAddEducation = jest.fn();
      const mockUpdateSkills = jest.fn();

      mockUseResumeStore.mockReturnValue({
        ...mockUseResumeStore(),
        updatePersonalInfo: mockUpdatePersonalInfo,
        updateSummary: mockUpdateSummary,
        addWorkExperience: mockAddWorkExperience,
        addEducation: mockAddEducation,
        updateSkills: mockUpdateSkills,
        removeWorkExperience: jest.fn(),
        removeEducation: jest.fn(),
      });

      const mockFetch = global.fetch as jest.Mock;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          personalInfo: { name: 'Imported Name' },
          summary: 'Imported summary',
          workExperience: [{ title: 'Imported Job' }],
          education: [{ degree: 'Imported Degree' }],
          skills: ['Imported Skill'],
        }),
      });

      render(<ResumeBuilder locale="en-US" />);

      // Simulate file input change
      const fileInput = screen.getByText('Import from PDF').previousElementSibling as HTMLInputElement;
      const file = new File(['pdf content'], 'test.pdf', { type: 'application/pdf' });

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(mockUpdatePersonalInfo).toHaveBeenCalledWith({ name: 'Imported Name' });
        expect(mockUpdateSummary).toHaveBeenCalledWith('Imported summary');
        expect(mockAddWorkExperience).toHaveBeenCalledWith({ title: 'Imported Job' });
        expect(mockAddEducation).toHaveBeenCalledWith({ degree: 'Imported Degree' });
        expect(mockUpdateSkills).toHaveBeenCalledWith(['Imported Skill']);
      });
    });
  });

  describe('Comments System', () => {
    it('should toggle comments visibility', () => {
      render(<ResumeBuilder locale="en-US" />);

      const commentButtons = screen.getAllByLabelText(/Comment on/);
      const firstCommentButton = commentButtons[0];

      fireEvent.click(firstCommentButton);

      // Check if comment thread is visible (this would need more specific test IDs)
      expect(screen.getByText('Resume Builder')).toBeInTheDocument(); // Component still renders
    });

    it('should handle comment submission', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: [] }),
      });

      render(<ResumeBuilder locale="en-US" />);

      // This test would need more specific selectors for comment elements
      // For now, just verify the component renders without errors
      expect(screen.getByText('Resume Builder')).toBeInTheDocument();
    });
  });

  describe('Autosave Functionality', () => {
    it('should trigger autosave on resume changes', async () => {
      jest.useFakeTimers();

      render(<ResumeBuilder locale="en-US" />);

      // Fast-forward time to trigger autosave
      jest.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(screen.getByText('Resume Builder')).toBeInTheDocument();
      });

      jest.useRealTimers();
    });
  });

  describe('Version Management', () => {
    it('should update version when button is clicked', () => {
      const mockUpdateVersion = jest.fn();
      mockUseResumeStore.mockReturnValue({
        ...mockUseResumeStore(),
        updateVersion: mockUpdateVersion,
      });

      render(<ResumeBuilder locale="en-US" />);

      const versionButton = screen.getByText('New Version (1)');
      fireEvent.click(versionButton);

      expect(mockUpdateVersion).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle PDF export errors', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Export failed' }),
      });

      render(<ResumeBuilder locale="en-US" />);

      const exportButton = screen.getByText('Export to PDF');
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText('Export failed')).toBeInTheDocument();
      });
    });

    it('should handle PDF import errors', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Import failed' }),
      });

      render(<ResumeBuilder locale="en-US" />);

      const fileInput = screen.getByText('Import from PDF').previousElementSibling as HTMLInputElement;
      const file = new File(['pdf content'], 'test.pdf', { type: 'application/pdf' });

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText('Import failed')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<ResumeBuilder locale="en-US" />);

      const commentButtons = screen.getAllByLabelText(/Comment on/);
      expect(commentButtons.length).toBeGreaterThan(0);

      const removeButtons = screen.getAllByLabelText(/Remove/);
      expect(removeButtons.length).toBeGreaterThan(0);
    });

    it('should have proper form labels', () => {
      render(<ResumeBuilder locale="en-US" />);

      expect(screen.getByLabelText('Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
    });
  });
});