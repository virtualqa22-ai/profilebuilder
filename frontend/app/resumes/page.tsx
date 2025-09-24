 'use client';

import { lazy, Suspense, useState, useEffect } from 'react';
import { FixedSizeList as List } from 'react-window';
import LocaleSelector from '@/frontend/components/ui/LocaleSelector';
import { useLocale } from '@/backend/lib/locale';
import ErrorBoundary from '@/frontend/components/ui/ErrorBoundary';

// Lazy load heavy components to reduce initial bundle size
const ResumeBuilder = lazy(() => import('@/frontend/features/resume/components/ResumeBuilder'));
const LivePreview = lazy(() => import('@/frontend/features/resume/components/LivePreview'));

interface Resume {
  _id: string;
  title: string;
  content: string;
  locale: string; // Changed to string
}

import { useSession, signIn } from 'next-auth/react';

// ... (imports)

export default function ResumesPage() {
  const { data: session } = useSession();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [message, setMessage] = useState('');
  const { locale: selectedLocale } = useLocale();

  useEffect(() => {
    if (session) {
      fetchResumes();
    }
  }, [session]);

  const fetchResumes = async () => {
    try {
      const response = await fetch('/api/resumes');
      const data = await response.json();
      if (data.success) {
        setResumes(data.data);
      }
    } catch (error) {
      console.error('Error fetching resumes:', error);
    }
  };

  const deleteResume = async (id: string) => {
    try {
      const response = await fetch(`/api/resumes/${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        setResumes(resumes.filter(resume => resume._id !== id));
        setMessage('Resume deleted successfully!');
      } else {
        setMessage(data.error || 'Failed to delete resume');
      }
    } catch (error) {
      console.error('Error deleting resume:', error);
      setMessage('An error occurred while deleting the resume');
    }
  };

  return (
    <main className="min-h-screen bg-brand-light-gray p-8">
      <h1 className="text-4xl font-bold mb-8 text-center text-brand-dark-charcoal">Resumes</h1>

      {session ? (
        <>
          <div className="flex w-full max-w-7xl gap-8 mx-auto">
            <div className="flex-1">
              <ErrorBoundary>
                <Suspense fallback={<div className="p-4 text-center">Loading Resume Builder...</div>}>
                  <ResumeBuilder locale={selectedLocale} />
                </Suspense>
              </ErrorBoundary>
              {message && <p className="mt-4 text-center text-brand-coral">{message}</p>}
            </div>
            <div className="flex-1 hidden md:block">
              <Suspense fallback={<div className="p-4 text-center">Loading Preview...</div>}>
                <LivePreview />
              </Suspense>
            </div>
          </div>

          <div className="w-full max-w-2xl mt-8 mx-auto">
            <h2 className="text-2xl font-semibold mb-4 text-brand-dark-charcoal">Existing Resumes</h2>
            {resumes.length === 0 ? (
              <p>No resumes found.</p>
            ) : (
              <div className="border rounded bg-brand-ivory">
                <List
                  height={Math.min(400, resumes.length * 60)} // Dynamic height based on content
                  itemCount={resumes.length}
                  itemSize={60} // Height of each item
                  width="100%"
                >
                  {({ index, style }) => {
                    const resume = resumes[index];
                    return (
                      <div
                        key={resume._id}
                        style={style}
                        className="flex justify-between items-center p-3 border-b border-gray-200 text-brand-dark-charcoal hover:bg-gray-50"
                      >
                        <span>{resume.title} (Locale: {resume.locale || 'N/A'})</span>
                        <button
                          onClick={() => deleteResume(resume._id)}
                          className="p-2 bg-red-500 text-white rounded hover:bg-red-600 focus:ring-2 focus:ring-red-500"
                          aria-label={`Delete resume ${resume.title}`}
                        >
                          Delete
                        </button>
                      </div>
                    );
                  }}
                </List>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="text-center">
          <p className="mb-4">Please sign in to manage your resumes.</p>
          <button
            className="bg-brand-blue hover:bg-brand-teal text-white font-bold py-2 px-4 rounded"
            onClick={() => signIn()}
          >
            Sign In
          </button>
        </div>
      )}
    </main>
  );
}
