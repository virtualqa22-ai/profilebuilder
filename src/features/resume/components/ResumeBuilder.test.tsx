import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ResumeBuilder from './ResumeBuilder';
import { useResumeStore } from '@/store/resumeStore';

// Mock the fetch API
global.fetch = jest.fn((url) => {
  if (url === '/api/locales') {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: [
          { _id: '1', name: 'English', code: 'en' },
          { _id: '2', name: 'Spanish', code: 'es' },
        ],
      }),
    });
  } else if (url === '/api/generate-pdf') {
    return Promise.resolve({
      ok: true,
      blob: () => Promise.resolve(new Blob(['test pdf content'], { type: 'application/pdf' })),
    });
  }
  return Promise.reject(new Error('not found'));
});

// Mock window.URL.createObjectURL and revokeObjectURL
const createObjectURLMock = jest.fn(() => 'blob:http://localhost/mock-url');
const revokeObjectURLMock = jest.fn();
Object.defineProperty(window.URL, 'createObjectURL', {
  writable: true,
  value: createObjectURLMock,
});
Object.defineProperty(window.URL, 'revokeObjectURL', {
  writable: true,
  value: revokeObjectURLMock,
});

describe('ResumeBuilder', () => {
  beforeEach(() => {
    // Reset Zustand store before each test
    useResumeStore.setState({
      resume: {
        personalInfo: {
          name: '',
          email: '',
          phone: '',
          linkedin: '',
          github: '',
          website: '',
        },
        summary: '',
        workExperience: [],
        education: [],
        skills: [],
        projects: '',
        awardsCertifications: '',
        locale: '',
      },
    });
    jest.clearAllMocks();
  });

  test('renders ResumeBuilder component', async () => {
    render(<ResumeBuilder />);
    expect(screen.getByText('Resume Builder')).toBeInTheDocument();
    expect(screen.getByText('Personal Information')).toBeInTheDocument();
    expect(screen.getByText('Summary/Objective')).toBeInTheDocument();
    expect(screen.getByText('Work Experience')).toBeInTheDocument();
    expect(screen.getByText('Education')).toBeInTheDocument();
    expect(screen.getByText('Skills')).toBeInTheDocument();
    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('Awards and Certifications')).toBeInTheDocument();
    expect(screen.getByText('Export to PDF')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Select Locale')).toBeInTheDocument();
      expect(screen.getByDisplayValue('English (en)')).toBeInTheDocument();
    });
  });

  test('updates personal info fields', () => {
    render(<ResumeBuilder />);
    const nameInput = screen.getByPlaceholderText('Full Name') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    expect(useResumeStore.getState().resume.personalInfo.name).toBe('John Doe');
  });

  test('adds and removes work experience', () => {
    render(<ResumeBuilder />);
    const addWorkExperienceButton = screen.getByRole('button', { name: /add work experience/i });
    fireEvent.click(addWorkExperienceButton);
    expect(useResumeStore.getState().resume.workExperience.length).toBe(1);

    const jobTitleInput = screen.getByPlaceholderText('Job Title') as HTMLInputElement;
    fireEvent.change(jobTitleInput, { target: { value: 'Software Engineer' } });
    expect(useResumeStore.getState().resume.workExperience[0].title).toBe('Software Engineer');

    const removeButton = screen.getByRole('button', { name: /remove experience/i });
    fireEvent.click(removeButton);
    expect(useResumeStore.getState().resume.workExperience.length).toBe(0);
  });

  test('adds and removes education', () => {
    render(<ResumeBuilder />);
    const addEducationButton = screen.getByRole('button', { name: /add education/i });
    fireEvent.click(addEducationButton);
    expect(useResumeStore.getState().resume.education.length).toBe(1);

    const degreeInput = screen.getByPlaceholderText('Degree (e.g., Bachelor of Science)') as HTMLInputElement;
    fireEvent.change(degreeInput, { target: { value: 'B.Sc. Computer Science' } });
    expect(useResumeStore.getState().resume.education[0].degree).toBe('B.Sc. Computer Science');

    const removeButton = screen.getByRole('button', { name: /remove education/i });
    fireEvent.click(removeButton);
    expect(useResumeStore.getState().resume.education.length).toBe(0);
  });

  test('updates skills', () => {
    render(<ResumeBuilder />);
    const skillsTextarea = screen.getByPlaceholderText('Enter your skills, separated by commas (e.g., JavaScript, React, Node.js)') as HTMLTextAreaElement;
    fireEvent.change(skillsTextarea, { target: { value: 'React, Node.js, TypeScript' } });
    expect(useResumeStore.getState().resume.skills).toEqual(['React', 'Node.js', 'TypeScript']);
  });

  test('handles PDF export', async () => {
    render(<ResumeBuilder />);
    const exportButton = screen.getByRole('button', { name: /export to pdf/i });
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/generate-pdf',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(useResumeStore.getState().resume),
        })
      );
      expect(createObjectURLMock).toHaveBeenCalled();
      expect(revokeObjectURLMock).toHaveBeenCalled();
      expect(screen.getByText('PDF generated successfully!')).toBeInTheDocument();
    });
  });
});
