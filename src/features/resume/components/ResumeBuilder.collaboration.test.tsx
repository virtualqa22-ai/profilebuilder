/// <reference types="jest" />
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import ResumeBuilder from './ResumeBuilder';
import { useResumeStore } from '@/store/resumeStore';

// Mock the resume store
jest.mock('@/store/resumeStore');

// Mock the fetch function
global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({ success: true, data: [] }),
  })
) as jest.Mock;

describe('ResumeBuilder Collaboration', () => {
  beforeEach(() => {
    (useResumeStore as jest.Mock).mockReturnValue({
      resume: {
        _id: '123',
        personalInfo: {
          name: 'John Doe',
        },
        workExperience: [],
        education: [],
        comments: [],
      },
      updateLocale: jest.fn(),
    });
  });

  it('should be able to add a comment to a field', async () => {
    render(<ResumeBuilder locale="en-US" />);

    const commentButton = screen.getAllByRole('button', { name: /comment/i })[0];
    fireEvent.click(commentButton);

    const commentThread = screen.getByTestId('comment-thread-personalInfo-name');

    const commentTextarea = within(commentThread).getByPlaceholderText('Add a comment...');
    fireEvent.change(commentTextarea, { target: { value: 'This is a test comment' } });

    const addCommentButton = within(commentThread).getByRole('button', { name: /add/i });
    fireEvent.click(addCommentButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/resumes/123/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ field: 'personalInfo-name', text: 'This is a test comment', author: 'User' }),
      });
    });
  });
});
