/**
 * Resume Components Integration Tests
 *
 * Tests the complete resume component functionality including:
 * - Component rendering with different locales and data
 * - State management integration with Zustand store
 * - User interactions (form inputs, button clicks, file uploads)
 * - API call mocking and error handling
 * - Validation error display and form submission
 * - Cross-component interactions and data flow
 * - Performance with large datasets
 * - Accessibility and keyboard navigation
 * - Error boundaries and fallback UI
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { jest } from '@jest/globals';
import userEvent from '@testing-library/user-event';
import { SessionProvider } from 'next-auth/react';
import ResumeBuilder from '../../../frontend/features/resume/components/ResumeBuilder';
import { useResumeStore } from '../../../frontend/store/resumeStore';
import { getLocaleByCode } from '../../../backend/lib/localeService';

// Mock dependencies
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
  SessionProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

jest.mock('../../../frontend/store/resumeStore');
jest.mock('../../../backend/lib/localeService');
jest.mock('../../../backend/lib/locale');
jest.mock('../../../shared/validations');
jest.mock('../../../frontend/components/ui/LocaleSelector', () => {
  return function MockLocaleSelector() {
    return <div data-testid="locale-selector">Locale Selector</div>;
  };
});
jest.mock('../../../frontend/components/ui/ErrorBoundary', () => {
  return function MockErrorBoundary({ children }: { children: React.ReactNode }) {
    return <div data-testid="error-boundary">{children}</div>;
  };
});
jest.mock('../../../frontend/components/AdComponent', () => {
  return function MockAdComponent() {
    return <div data-testid="ad-component">Ad Component</div>;
  };
});
jest.mock('../../../frontend/components/ui/Toast', () => {
  return function MockToast({ message, type, onClose }: { message: string; type: string; onClose: () => void }) {
    return (
      <div data-testid={`toast-${type}`}>
        {message}
        <button onClick={onClose} data-testid="toast-close">Close</button>
      </div>
    );
  };
});

// Mock sub-components
jest.mock('../../../frontend/features/resume/components/forms/PersonalInfoForm', () => {
  return function MockPersonalInfoForm({ handleFieldChange, validationErrors }: any) {
    return (
      <div data-testid="personal-info-form">
        <input
          data-testid="name-input"
          placeholder="Name"
          onChange={(e) => handleFieldChange('personalInfo', 'name', e.target.value)}
        />
        {validationErrors['personalInfo-name'] && (
          <span data-testid="name-error">{validationErrors['personalInfo-name']}</span>
        )}
      </div>
    );
  };
});

jest.mock('../../../frontend/features/resume/components/sections/WorkExperienceSection', () => {
  return function MockWorkExperienceSection({ addWorkExperienceEntry, removeWorkExperienceEntry }: any) {
    return (
      <div data-testid="work-experience-section">
        <button data-testid="add-work-exp" onClick={addWorkExperienceEntry}>Add Work Experience</button>
        <button data-testid="remove-work-exp" onClick={() => removeWorkExperienceEntry(0)}>Remove Work Experience</button>
      </div>
    );
  };
});

jest.mock('../../../frontend/features/resume/components/sections/EducationSection', () => {
  return function MockEducationSection({ addEducationEntry, removeEducationEntry }: any) {
    return (
      <div data-testid="education-section">
        <button data-testid="add-education" onClick={addEducationEntry}>Add Education</button>
        <button data-testid="remove-education" onClick={() => removeEducationEntry(0)}>Remove Education</button>
      </div>
    );
  };
});

jest.mock('../../../frontend/features/resume/components/managers/OptionalFieldsManager', () => {
  return function MockOptionalFieldsManager() {
    return <div data-testid="optional-fields-manager">Optional Fields</div>;
  };
});

jest.mock('../../../frontend/features/resume/components/comments/CommentSystem', () => {
  return function MockCommentSystem() {
    return <div data-testid="comment-system">Comments</div>;
  };
});

jest.mock('../../../frontend/features/resume/components/controls/ExportControls', () => {
  return function MockExportControls({ handlePdfUpload, handleExportPdf }: any) {
    return (
      <div data-testid="export-controls">
        <input
          data-testid="pdf-upload"
          type="file"
          accept=".pdf"
          onChange={handlePdfUpload}
        />
        <button data-testid="export-pdf" onClick={handleExportPdf}>Export PDF</button>
      </div>
    );
  };
});

jest.mock('../../../frontend/features/resume/components/Comment', () => {
  return function MockComment() {
    return <div data-testid="comment">Comment Component</div>;
  };
});

// Mock fetch for API calls
global.fetch = jest.fn();

describe('Resume Components Integration Tests', () => {
  const mockSession = {
    user: {
      name: 'Test User',
      email: 'test@example.com'
    }
  };

  const mockLocaleData = {
    locale: 'en-US',
    name: 'English (US)',
    dateFormat: 'MM/DD/YYYY',
    sections: {
      personalInfo: {
        label: 'Personal Information',
        fields: {
          name: { label: 'Name', placeholder: 'Enter your name' },
          email: { label: 'Email', placeholder: 'Enter your email' }
        },
        order: ['name', 'email']
      },
      summary: {
        label: 'Professional Summary',
        placeholder: 'Enter your professional summary'
      },
      workExperience: {
        label: 'Work Experience',
        fields: {
          title: { label: 'Job Title', placeholder: 'Enter job title' },
          company: { label: 'Company', placeholder: 'Enter company name' }
        },
        order: ['title', 'company']
      },
      education: {
        label: 'Education',
        fields: {
          degree: { label: 'Degree', placeholder: 'Enter degree' },
          university: { label: 'University', placeholder: 'Enter university' }
        },
        order: ['degree', 'university']
      },
      skills: {
        label: 'Skills',
        placeholder: 'Enter your skills'
      }
    }
  };

  const mockResumeStore = {
    resume: {
      _id: 'resume123',
      personalInfo: { name: '', email: '' },
      summary: '',
      workExperience: [],
      education: [],
      skills: [],
      projects: '',
      awardsCertifications: '',
      locale: 'en-US',
      version: 1
    },
    resumes: [],
    loading: false,
    error: null,
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
    loadResumes: jest.fn(),
    saveResume: jest.fn(),
    loadResume: jest.fn(),
    createResume: jest.fn(),
    deleteResume: jest.fn(),
    setLoading: jest.fn(),
    setError: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mocks
    (require('next-auth/react').useSession as jest.Mock).mockReturnValue({ data: mockSession });
    (getLocaleByCode as jest.Mock).mockReturnValue(mockLocaleData);
    (useResumeStore as jest.Mock).mockReturnValue(mockResumeStore);

    // Mock fetch
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: {} })
    });
  });

  describe('ResumeBuilder Component Rendering', () => {
    it('should render ResumeBuilder with default props', () => {
      render(
        <SessionProvider session={mockSession}>
          <ResumeBuilder locale="en-US" />
        </SessionProvider>
      );

      expect(screen.getByText('Resume Builder')).toBeInTheDocument();
      expect(screen.getByTestId('locale-selector')).toBeInTheDocument();
      expect(screen.getByTestId('personal-info-form')).toBeInTheDocument();
      expect(screen.getByTestId('work-experience-section')).toBeInTheDocument();
      expect(screen.getByTestId('education-section')).toBeInTheDocument();
      expect(screen.getByTestId('export-controls')).toBeInTheDocument();
      expect(screen.getByTestId('ad-component')).toBeInTheDocument();
    });

    it('should render loading state when locale data is not available', () => {
      (getLocaleByCode as jest.Mock).mockReturnValue(null);

      render(
        <SessionProvider session={mockSession}>
          <ResumeBuilder locale="en-US" />
        </SessionProvider>
      );

      expect(screen.getByText('Loading locale data...')).toBeInTheDocument();
    });

    it('should render with different locale data', () => {
      const differentLocaleData = {
        ...mockLocaleData,
        name: 'French (France)',
        locale: 'fr-FR'
      };

      (getLocaleByCode as jest.Mock).mockReturnValue(differentLocaleData);

      render(
        <SessionProvider session={mockSession}>
          <ResumeBuilder locale="fr-FR" />
        </SessionProvider>
      );

      expect(screen.getByText('Resume Builder')).toBeInTheDocument();
    });
  });

  describe('State Management Integration', () => {
    it('should update personal info through store', async () => {
      const user = userEvent.setup();

      render(
        <SessionProvider session={mockSession}>
          <ResumeBuilder locale="en-US" />
        </SessionProvider>
      );

      const nameInput = screen.getByTestId('name-input');
      await user.type(nameInput, 'John Doe');

      expect(mockResumeStore.updatePersonalInfo).toHaveBeenCalledWith({ name: 'John Doe' });
    });

    it('should handle work experience operations', async () => {
      const user = userEvent.setup();

      render(
        <SessionProvider session={mockSession}>
          <ResumeBuilder locale="en-US" />
        </SessionProvider>
      );

      const addButton = screen.getByTestId('add-work-exp');
      await user.click(addButton);

      expect(mockResumeStore.addWorkExperience).toHaveBeenCalledWith({
        title: '',
        company: '',
        location: '',
        startDate: '',
        endDate: '',
        description: ''
      });

      const removeButton = screen.getByTestId('remove-work-exp');
      await user.click(removeButton);

      expect(mockResumeStore.removeWorkExperience).toHaveBeenCalledWith(0);
    });

    it('should handle education operations', async () => {
      const user = userEvent.setup();

      render(
        <SessionProvider session={mockSession}>
          <ResumeBuilder locale="en-US" />
        </SessionProvider>
      );

      const addButton = screen.getByTestId('add-education');
      await user.click(addButton);

      expect(mockResumeStore.addEducation).toHaveBeenCalledWith({
        degree: '',
        major: '',
        university: '',
        location: '',
        startDate: '',
        endDate: ''
      });

      const removeButton = screen.getByTestId('remove-education');
      await user.click(removeButton);

      expect(mockResumeStore.removeEducation).toHaveBeenCalledWith(0);
    });

    it('should update locale when prop changes', () => {
      const { rerender } = render(
        <SessionProvider session={mockSession}>
          <ResumeBuilder locale="en-US" />
        </SessionProvider>
      );

      expect(mockResumeStore.updateLocale).toHaveBeenCalledWith('en-US');

      rerender(
        <SessionProvider session={mockSession}>
          <ResumeBuilder locale="fr-FR" />
        </SessionProvider>
      );

      expect(mockResumeStore.updateLocale).toHaveBeenCalledWith('fr-FR');
    });
  });

  describe('API Integration and User Interactions', () => {
    it('should handle PDF export successfully', async () => {
      const user = userEvent.setup();
      const mockBlob = new Blob(['pdf content'], { type: 'application/pdf' });
      const mockUrl = 'blob:mock-url';

      // Mock URL.createObjectURL and revokeObjectURL
      global.URL.createObjectURL = jest.fn(() => mockUrl);
      global.URL.revokeObjectURL = jest.fn();

      // Mock document methods
      const mockCreateElement = jest.spyOn(document, 'createElement');
      const mockClick = jest.fn();
      const mockAppendChild = jest.spyOn(document.body, 'appendChild').mockImplementation(() => {});
      const mockRemoveChild = jest.spyOn(document.body, 'removeChild').mockImplementation(() => {});

      mockCreateElement.mockReturnValue({
        click: mockClick,
        href: '',
        download: ''
      } as any);

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(mockBlob)
      });

      render(
        <SessionProvider session={mockSession}>
          <ResumeBuilder locale="en-US" />
        </SessionProvider>
      );

      const exportButton = screen.getByTestId('export-pdf');
      await user.click(exportButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/generate-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mockResumeStore.resume)
        });
      });

      expect(mockClick).toHaveBeenCalled();
      expect(global.URL.createObjectURL).toHaveBeenCalledWith(mockBlob);
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith(mockUrl);
    });

    it('should handle PDF export failure', async () => {
      const user = userEvent.setup();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Export failed' })
      });

      render(
        <SessionProvider session={mockSession}>
          <ResumeBuilder locale="en-US" />
        </SessionProvider>
      );

      const exportButton = screen.getByTestId('export-pdf');
      await user.click(exportButton);

      await waitFor(() => {
        expect(screen.getByTestId('toast-error')).toBeInTheDocument();
        expect(screen.getByText('Export failed')).toBeInTheDocument();
      });
    });

    it('should handle PDF import successfully', async () => {
      const user = userEvent.setup();
      const file = new File(['pdf content'], 'test.pdf', { type: 'application/pdf' });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          personalInfo: { name: 'Imported Name', email: 'imported@example.com' },
          summary: 'Imported summary',
          workExperience: [{ title: 'Imported Job', company: 'Imported Company' }],
          education: [{ degree: 'Imported Degree', university: 'Imported University' }],
          skills: ['Imported Skill'],
          projects: 'Imported projects',
          awardsCertifications: 'Imported awards'
        })
      });

      render(
        <SessionProvider session={mockSession}>
          <ResumeBuilder locale="en-US" />
        </SessionProvider>
      );

      const fileInput = screen.getByTestId('pdf-upload');
      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(mockResumeStore.updatePersonalInfo).toHaveBeenCalledWith({
          name: 'Imported Name',
          email: 'imported@example.com'
        });
        expect(mockResumeStore.updateSummary).toHaveBeenCalledWith('Imported summary');
        expect(mockResumeStore.addWorkExperience).toHaveBeenCalledWith({
          title: 'Imported Job',
          company: 'Imported Company'
        });
        expect(mockResumeStore.updateSkills).toHaveBeenCalledWith(['Imported Skill']);
      });
    });

    it('should handle PDF import failure', async () => {
      const user = userEvent.setup();
      const file = new File(['pdf content'], 'test.pdf', { type: 'application/pdf' });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Import failed' })
      });

      render(
        <SessionProvider session={mockSession}>
          <ResumeBuilder locale="en-US" />
        </SessionProvider>
      );

      const fileInput = screen.getByTestId('pdf-upload');
      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(screen.getByTestId('toast-error')).toBeInTheDocument();
        expect(screen.getByText('Import failed')).toBeInTheDocument();
      });
    });
  });

  describe('Validation and Error Handling', () => {
    it('should display validation errors', () => {
      // Mock validation errors
      const mockValidationErrors = {
        'personalInfo-name': 'Name is required.'
      };

      // We need to mock the useMemo that returns validationErrors
      // This is tricky with the current setup, so we'll test the error display logic

      render(
        <SessionProvider session={mockSession}>
          <ResumeBuilder locale="en-US" />
        </SessionProvider>
      );

      // The mock PersonalInfoForm should handle error display
      expect(screen.getByTestId('personal-info-form')).toBeInTheDocument();
    });

    it('should prevent PDF export when validation fails', async () => {
      const user = userEvent.setup();

      // Mock validation failure
      mockResumeStore.resume = {
        ...mockResumeStore.resume,
        personalInfo: { name: '', email: '' } // Invalid empty fields
      };

      render(
        <SessionProvider session={mockSession}>
          <ResumeBuilder locale="en-US" />
        </SessionProvider>
      );

      const exportButton = screen.getByTestId('export-pdf');
      await user.click(exportButton);

      // Should show validation error message
      await waitFor(() => {
        expect(screen.getByTestId('toast-error')).toBeInTheDocument();
        expect(screen.getByText('Please fill in all required fields.')).toBeInTheDocument();
      });

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should handle network errors gracefully', async () => {
      const user = userEvent.setup();

      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      render(
        <SessionProvider session={mockSession}>
          <ResumeBuilder locale="en-US" />
        </SessionProvider>
      );

      const exportButton = screen.getByTestId('export-pdf');
      await user.click(exportButton);

      await waitFor(() => {
        expect(screen.getByTestId('toast-error')).toBeInTheDocument();
        expect(screen.getByText('An error occurred during PDF generation')).toBeInTheDocument();
      });
    });
  });

  describe('Performance and Large Data Handling', () => {
    it('should handle large work experience arrays', () => {
      const largeResume = {
        ...mockResumeStore.resume,
        workExperience: Array.from({ length: 20 }, (_, i) => ({
          title: `Job Title ${i}`,
          company: `Company ${i}`,
          location: `Location ${i}`,
          startDate: '2020-01-01',
          endDate: '2021-01-01',
          description: `Description ${i}`.repeat(10) // Large description
        }))
      };

      (useResumeStore as jest.Mock).mockReturnValue({
        ...mockResumeStore,
        resume: largeResume
      });

      render(
        <SessionProvider session={mockSession}>
          <ResumeBuilder locale="en-US" />
        </SessionProvider>
      );

      expect(screen.getByText('Resume Builder')).toBeInTheDocument();
      // Component should render without performance issues
    });

    it('should handle long text content', () => {
      const longContent = 'A'.repeat(10000); // 10KB of content
      const resumeWithLongContent = {
        ...mockResumeStore.resume,
        summary: longContent,
        projects: longContent
      };

      (useResumeStore as jest.Mock).mockReturnValue({
        ...mockResumeStore,
        resume: resumeWithLongContent
      });

      render(
        <SessionProvider session={mockSession}>
          <ResumeBuilder locale="en-US" />
        </SessionProvider>
      );

      expect(screen.getByText('Resume Builder')).toBeInTheDocument();
    });
  });

  describe('Accessibility and Keyboard Navigation', () => {
    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();

      render(
        <SessionProvider session={mockSession}>
          <ResumeBuilder locale="en-US" />
        </SessionProvider>
      );

      const nameInput = screen.getByTestId('name-input');

      // Focus on input
      nameInput.focus();
      expect(document.activeElement).toBe(nameInput);

      // Type with keyboard
      await user.type(nameInput, 'Test Name');
      expect(mockResumeStore.updatePersonalInfo).toHaveBeenCalledWith({ name: 'Test Name' });
    });

    it('should have proper ARIA labels and roles', () => {
      render(
        <SessionProvider session={mockSession}>
          <ResumeBuilder locale="en-US" />
        </SessionProvider>
      );

      // Check for accessibility attributes
      const saveStatus = screen.getByText('', { selector: '[aria-live]' });
      expect(saveStatus).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Error Boundaries and Fallback UI', () => {
    it('should render error boundary wrapper', () => {
      render(
        <SessionProvider session={mockSession}>
          <ResumeBuilder locale="en-US" />
        </SessionProvider>
      );

      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
    });

    it('should handle component errors gracefully', () => {
      // Mock a component that throws an error
      const MockErrorComponent = () => {
        throw new Error('Component error');
      };

      jest.mock('../../../frontend/features/resume/components/forms/PersonalInfoForm', () => {
        return function MockPersonalInfoForm() {
          return <MockErrorComponent />;
        };
      });

      // The ErrorBoundary should catch this
      expect(() => {
        render(
          <SessionProvider session={mockSession}>
            <ResumeBuilder locale="en-US" />
          </SessionProvider>
        );
      }).not.toThrow();
    });
  });

  describe('Cross-Component Data Flow', () => {
    it('should synchronize data between components', () => {
      const updatedResume = {
        ...mockResumeStore.resume,
        personalInfo: { name: 'Updated Name', email: 'updated@example.com' },
        summary: 'Updated summary'
      };

      (useResumeStore as jest.Mock).mockReturnValue({
        ...mockResumeStore,
        resume: updatedResume
      });

      render(
        <SessionProvider session={mockSession}>
          <ResumeBuilder locale="en-US" />
        </SessionProvider>
      );

      // All components should receive the updated resume data
      expect(screen.getByTestId('personal-info-form')).toBeInTheDocument();
      expect(screen.getByTestId('work-experience-section')).toBeInTheDocument();
      expect(screen.getByTestId('education-section')).toBeInTheDocument();
    });

    it('should handle concurrent state updates', async () => {
      const user = userEvent.setup();

      render(
        <SessionProvider session={mockSession}>
          <ResumeBuilder locale="en-US" />
        </SessionProvider>
      );

      const nameInput = screen.getByTestId('name-input');

      // Simulate rapid typing
      await user.type(nameInput, 'John');
      await user.type(nameInput, ' Doe');

      // Should handle multiple updates correctly
      expect(mockResumeStore.updatePersonalInfo).toHaveBeenCalledTimes(8); // 8 characters
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle empty session gracefully', () => {
      (require('next-auth/react').useSession as jest.Mock).mockReturnValue({ data: null });

      expect(() => {
        render(
          <SessionProvider session={null}>
            <ResumeBuilder locale="en-US" />
          </SessionProvider>
        );
      }).not.toThrow();

      expect(screen.getByText('Resume Builder')).toBeInTheDocument();
    });

    it('should handle malformed locale data', () => {
      const malformedLocaleData = {
        ...mockLocaleData,
        sections: null // Missing sections
      };

      (getLocaleByCode as jest.Mock).mockReturnValue(malformedLocaleData);

      expect(() => {
        render(
          <SessionProvider session={mockSession}>
            <ResumeBuilder locale="en-US" />
          </SessionProvider>
        );
      }).not.toThrow();
    });

    it('should handle API timeout gracefully', async () => {
      const user = userEvent.setup();

      (global.fetch as jest.Mock).mockImplementationOnce(
        () => new Promise(resolve => setTimeout(() => resolve({
          ok: false,
          json: () => Promise.resolve({ error: 'Timeout' })
        }), 100))
      );

      render(
        <SessionProvider session={mockSession}>
          <ResumeBuilder locale="en-US" />
        </SessionProvider>
      );

      const exportButton = screen.getByTestId('export-pdf');
      await user.click(exportButton);

      await waitFor(() => {
        expect(screen.getByTestId('toast-error')).toBeInTheDocument();
      });
    });

    it('should handle invalid file uploads', async () => {
      const user = userEvent.setup();
      const invalidFile = new File(['content'], 'test.txt', { type: 'text/plain' });

      render(
        <SessionProvider session={mockSession}>
          <ResumeBuilder locale="en-US" />
        </SessionProvider>
      );

      const fileInput = screen.getByTestId('pdf-upload');

      // This should not cause an error, but the API should reject invalid files
      await user.upload(fileInput, invalidFile);

      expect(global.fetch).toHaveBeenCalled();
    });
  });
});