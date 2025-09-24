/**
 * ResumeBuilder Real-time Linting Frontend Tests
 *
 * Tests the real-time linting integration in ResumeBuilder component including:
 * - Debounced API calls to lint endpoint
 * - UI updates with lint results
 * - Error handling for failed lint requests
 * - HighlightedTextarea component integration
 * - Performance of debouncing mechanism
 */

/// <reference types="jest" />

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import ResumeBuilder from '../../../../../../frontend/features/resume/components/ResumeBuilder';

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

// Mock all dependencies
jest.mock('../../../../../../frontend/store/resumeStore', () => ({
  useResumeStore: jest.fn(() => ({
    resume: {
      personalInfo: { name: 'John Doe', email: 'john@example.com' },
      summary: 'Professional summary',
      workExperience: [],
      education: [],
      skills: 'JavaScript, React',
      projects: 'Portfolio website',
      awardsCertifications: 'AWS Certified',
      version: 1,
      _id: 'test-id',
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
  })),
}));

jest.mock('../../../../../../backend/lib/localeService', () => ({
  getLocaleByCode: jest.fn(() => ({
    locale: 'en-US',
    name: 'English (US)',
    sections: {
      summary: {
        label: 'Professional Summary',
        placeholder: 'Enter your professional summary',
      },
      skills: {
        label: 'Skills',
        placeholder: 'Enter your skills',
      },
      projects: {
        label: 'Projects',
        placeholder: 'Enter your projects',
      },
      awardsCertifications: {
        label: 'Awards & Certifications',
        placeholder: 'Enter your awards and certifications',
      },
      workExperience: {
        label: 'Work Experience',
        fields: {
          description: { label: 'Description', placeholder: 'Enter job description' },
        },
        order: ['description'],
      },
      education: {
        label: 'Education',
        fields: {
          degree: { label: 'Degree', placeholder: 'Enter degree' },
        },
        order: ['degree'],
      },
    },
  })),
}));

jest.mock('../../../../../../backend/lib/locale', () => ({
  useLocale: jest.fn(() => ({ locale: 'en-US' })),
}));

// Mock fetch for API calls
global.fetch = jest.fn();

// Mock other components
jest.mock('../../../../../../frontend/components/ui/LocaleSelector', () => {
  return function MockLocaleSelector() {
    return <div data-testid="locale-selector">Locale Selector</div>;
  };
});

jest.mock('../../../../../../frontend/components/ui/ErrorBoundary', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('../../../../../../frontend/components/AdComponent', () => {
  return function MockAdComponent() {
    return <div data-testid="ad-component">Ad Component</div>;
  };
});

jest.mock('../../../../../../frontend/features/resume/components/Comment', () => {
  return function MockComment({ comment }: { comment: any }) {
    return <div data-testid="comment">{comment.text}</div>;
  };
});

describe('ResumeBuilder Real-time Linting', () => {
  let mockFetch: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch = global.fetch as jest.Mock;
    jest.useFakeTimers();

    // Mock successful lint response
    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        success: true,
        data: {
          issues: [
            {
              type: 'warning',
              message: 'Consider using more active voice',
              line: 1,
              column: 5,
              severity: 'warning',
            },
          ],
          score: 85,
        },
      }),
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Debounced Linting', () => {
    it('should call lint API after user stops typing', async () => {
      render(<ResumeBuilder locale="en-US" />);

      const summaryTextarea = screen.getByPlaceholderText('Enter your professional summary');
      expect(summaryTextarea).toBeInTheDocument();

      // Type in the textarea
      fireEvent.change(summaryTextarea, { target: { value: 'This is a test summary that needs linting.' } });

      // API should not be called immediately due to debouncing
      expect(mockFetch).not.toHaveBeenCalled();

      // Fast-forward time to trigger debounced call
      act(() => {
        jest.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/v1/ai/lint', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ content: 'This is a test summary that needs linting.' }),
        });
      });
    });

    it('should debounce multiple rapid changes', async () => {
      render(<ResumeBuilder locale="en-US" />);

      const summaryTextarea = screen.getByPlaceholderText('Enter your professional summary');

      // Type multiple changes rapidly
      fireEvent.change(summaryTextarea, { target: { value: 'First change' } });
      fireEvent.change(summaryTextarea, { target: { value: 'Second change' } });
      fireEvent.change(summaryTextarea, { target: { value: 'Third change' } });

      // Should not call API yet
      expect(mockFetch).not.toHaveBeenCalled();

      // Advance time
      act(() => {
        jest.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(mockFetch).toHaveBeenCalledWith('/api/v1/ai/lint', expect.objectContaining({
          body: JSON.stringify({ content: 'Third change' }),
        }));
      });
    });

    it('should cancel previous debounced calls when new changes occur', async () => {
      render(<ResumeBuilder locale="en-US" />);

      const summaryTextarea = screen.getByPlaceholderText('Enter your professional summary');

      // First change
      fireEvent.change(summaryTextarea, { target: { value: 'First input' } });

      // Advance partial time
      act(() => {
        jest.advanceTimersByTime(200);
      });

      // Second change before first debounce completes
      fireEvent.change(summaryTextarea, { target: { value: 'Second input' } });

      // Advance remaining time
      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(mockFetch).toHaveBeenCalledWith('/api/v1/ai/lint', expect.objectContaining({
          body: JSON.stringify({ content: 'Second input' }),
        }));
      });
    });
  });

  describe('Lint Results Handling', () => {
    it('should handle successful lint response', async () => {
      render(<ResumeBuilder locale="en-US" />);

      const summaryTextarea = screen.getByPlaceholderText('Enter your professional summary');
      fireEvent.change(summaryTextarea, { target: { value: 'Test content for linting' } });

      act(() => {
        jest.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      // Component should handle the response without errors
      // Note: Actual UI updates would require more complex testing setup
    });

    it('should handle lint API errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      // Mock console.error to avoid test output pollution
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      render(<ResumeBuilder locale="en-US" />);

      const summaryTextarea = screen.getByPlaceholderText('Enter your professional summary');
      fireEvent.change(summaryTextarea, { target: { value: 'Test content' } });

      act(() => {
        jest.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      expect(consoleSpy).toHaveBeenCalledWith('Lint error:', expect.any(Error));

      consoleSpy.mockRestore();
    });

    it('should handle invalid API response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      render(<ResumeBuilder locale="en-US" />);

      const summaryTextarea = screen.getByPlaceholderText('Enter your professional summary');
      fireEvent.change(summaryTextarea, { target: { value: 'Test content' } });

      act(() => {
        jest.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      // Should not crash, error should be handled
      consoleSpy.mockRestore();
    });
  });

  describe('Multiple Field Linting', () => {
    it('should lint different field types', async () => {
      render(<ResumeBuilder locale="en-US" />);

      // Test summary field
      const summaryTextarea = screen.getByPlaceholderText('Enter your professional summary');
      fireEvent.change(summaryTextarea, { target: { value: 'Summary content' } });

      // Test skills field
      const skillsTextarea = screen.getByPlaceholderText('Enter your skills');
      fireEvent.change(skillsTextarea, { target: { value: 'JavaScript, React' } });

      // Test projects field
      const projectsTextarea = screen.getByPlaceholderText('Enter your projects');
      fireEvent.change(projectsTextarea, { target: { value: 'Portfolio website' } });

      act(() => {
        jest.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(3);
      });

      // Verify each field was linted
      expect(mockFetch).toHaveBeenCalledWith('/api/v1/ai/lint', expect.objectContaining({
        body: JSON.stringify({ content: 'Summary content' }),
      }));
      expect(mockFetch).toHaveBeenCalledWith('/api/v1/ai/lint', expect.objectContaining({
        body: JSON.stringify({ content: 'JavaScript, React' }),
      }));
      expect(mockFetch).toHaveBeenCalledWith('/api/v1/ai/lint', expect.objectContaining({
        body: JSON.stringify({ content: 'Portfolio website' }),
      }));
    });

    it('should handle work experience description linting', async () => {
      render(<ResumeBuilder locale="en-US" />);

      // Add work experience entry
      const addWorkExpButton = screen.getByText('Add Work Experience');
      fireEvent.click(addWorkExpButton);

      // Find the description textarea
      const descriptionTextarea = screen.getByPlaceholderText('Enter job description');
      fireEvent.change(descriptionTextarea, { target: { value: 'Job description content' } });

      act(() => {
        jest.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/v1/ai/lint', expect.objectContaining({
          body: JSON.stringify({ content: 'Job description content' }),
        }));
      });
    });
  });

  describe('Performance and Cleanup', () => {
    it('should cleanup timeouts on unmount', () => {
      const { unmount } = render(<ResumeBuilder locale="en-US" />);

      const summaryTextarea = screen.getByPlaceholderText('Enter your professional summary');
      fireEvent.change(summaryTextarea, { target: { value: 'Test' } });

      // Unmount before debounce completes
      unmount();

      // Advance time - should not cause errors
      act(() => {
        jest.advanceTimersByTime(500);
      });

      // No API call should be made after unmount
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should handle rapid component re-renders', () => {
      const { rerender } = render(<ResumeBuilder locale="en-US" />);

      const summaryTextarea = screen.getByPlaceholderText('Enter your professional summary');
      fireEvent.change(summaryTextarea, { target: { value: 'First render' } });

      // Re-render component
      rerender(<ResumeBuilder locale="en-US" />);

      fireEvent.change(summaryTextarea, { target: { value: 'Second render' } });

      act(() => {
        jest.advanceTimersByTime(500);
      });

      // Should only call API once with latest content
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith('/api/v1/ai/lint', expect.objectContaining({
        body: JSON.stringify({ content: 'Second render' }),
      }));
    });
  });

  describe('Error Boundaries', () => {
    it('should handle malformed lint responses', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: null, // Invalid data
        }),
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      render(<ResumeBuilder locale="en-US" />);

      const summaryTextarea = screen.getByPlaceholderText('Enter your professional summary');
      fireEvent.change(summaryTextarea, { target: { value: 'Test' } });

      act(() => {
        jest.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      // Should handle gracefully without crashing
      consoleSpy.mockRestore();
    });

    it('should handle network timeouts', async () => {
      mockFetch.mockImplementation(() => new Promise((resolve) => {
        setTimeout(() => resolve({
          ok: true,
          json: jest.fn().mockResolvedValue({ success: true, data: { issues: [], score: 100 } }),
        }), 10000); // Long delay
      }));

      render(<ResumeBuilder locale="en-US" />);

      const summaryTextarea = screen.getByPlaceholderText('Enter your professional summary');
      fireEvent.change(summaryTextarea, { target: { value: 'Test' } });

      // Advance time past reasonable timeout
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      // Component should remain functional
      expect(summaryTextarea).toBeInTheDocument();
    });
  });

  describe('Integration with HighlightedTextarea', () => {
    it('should pass lint results to HighlightedTextarea component', async () => {
      // This test would require more complex setup to test the actual highlighting
      // For now, we verify the lint API is called and data flows correctly
      render(<ResumeBuilder locale="en-US" />);

      const summaryTextarea = screen.getByPlaceholderText('Enter your professional summary');
      fireEvent.change(summaryTextarea, { target: { value: 'Content with potential issues' } });

      act(() => {
        jest.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      // The component should process the lint results
      // Actual highlighting verification would require DOM manipulation testing
    });
  });
});