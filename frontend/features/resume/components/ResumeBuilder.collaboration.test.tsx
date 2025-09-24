import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import ResumeBuilder from './ResumeBuilder';
import { useResumeStore } from '@/store/resumeStore';
import { LocaleProvider } from '@/backend/lib/locale';
import { useSession } from 'next-auth/react';

// Mock the resume store
jest.mock('@/store/resumeStore', () => ({
  useResumeStore: jest.fn(),
}));

// Mock the moduleNameMapper for @/backend/lib/locale
jest.mock('@/backend/lib/locale', () => {
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

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

// Mock the fetch function
global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({ success: true, data: [] }),
  })
) as jest.Mock;

describe('ResumeBuilder Collaboration', () => {
  beforeEach(() => {
    (useResumeStore as unknown as jest.Mock).mockReturnValue({
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
    (useSession as jest.Mock).mockReturnValue({
      data: {
        user: {
          name: 'Test User',
          email: 'test@example.com',
        },
      },
    });
  });

  it('should be able to add a comment to a field', async () => {
    render(
      <LocaleProvider>
        <ResumeBuilder locale="en-US" />
      </LocaleProvider>
    );

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
        body: JSON.stringify({ field: 'personalInfo-name', text: 'This is a test comment', author: 'Test User' }),
      });
    });
  });
});
