/// <reference types="jest" />
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import JdMatchPage from './page';
import { useResumeStore } from '@/store/resumeStore';

// Mock the resume store
jest.mock('@/store/resumeStore');

// Mock the fetch function
global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({ keywords: ['react', 'javascript', 'typescript'] }),
  })
) as jest.Mock;

describe('JdMatchPage', () => {
  beforeEach(() => {
    (useResumeStore as jest.Mock).mockReturnValue({
      resume: {
        skills: ['react', 'javascript'],
      },
    });
  });

  it('should render the page title', () => {
    render(<JdMatchPage />);
    expect(screen.getByText('Job Description Match')).toBeInTheDocument();
  });

  it('should calculate and display the keyword coverage', async () => {
    render(<JdMatchPage />);

    const textarea = screen.getByPlaceholderText('Paste the job description here...');
    fireEvent.change(textarea, { target: { value: 'This is a job description for a react developer' } });

    const analyzeButton = screen.getByText('Analyze');
    fireEvent.click(analyzeButton);

    await waitFor(() => {
      expect(screen.getByText('66.67% Match')).toBeInTheDocument();
    });
  });

  it('should display the missing keywords', async () => {
    render(<JdMatchPage />);

    const textarea = screen.getByPlaceholderText('Paste the job description here...');
    fireEvent.change(textarea, { target: { value: 'This is a job description for a react developer' } });

    const analyzeButton = screen.getByText('Analyze');
    fireEvent.click(analyzeButton);

    await waitFor(() => {
      const missingKeywordsList = screen.getByTestId('missing-keywords');
      expect(within(missingKeywordsList).getByText('typescript')).toBeInTheDocument();
    });
  });
});
