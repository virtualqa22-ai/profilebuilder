 'use client';

import ResumeBuilder from '@/frontend/features/resume/components/ResumeBuilder';
import LivePreview from '@/frontend/features/resume/components/LivePreview';
import { useState, useEffect } from 'react';
import LocaleSelector from '@/frontend/components/ui/LocaleSelector';
import { useLocale } from '@/backend/lib/locale';
import ErrorBoundary from '@/frontend/components/ui/ErrorBoundary';

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

  // ... (fetchResumes, deleteResume)

  return (
    <main className="min-h-screen bg-brand-light-gray p-8">
      <h1 className="text-4xl font-bold mb-8 text-center text-brand-dark-charcoal">Resumes</h1>

      {session ? (
        <>
          <div className="flex w-full max-w-7xl gap-8 mx-auto">
            <div className="flex-1">
              <ErrorBoundary>
                <ResumeBuilder locale={selectedLocale} />
              </ErrorBoundary>
              {message && <p className="mt-4 text-center text-brand-coral">{message}</p>}
            </div>
            <div className="flex-1 hidden md:block">
              <LivePreview />
            </div>
          </div>

          <div className="w-full max-w-2xl mt-8 mx-auto">
            <h2 className="text-2xl font-semibold mb-4 text-brand-dark-charcoal">Existing Resumes</h2>
            {resumes.length === 0 ? (
              <p>No resumes found.</p>
            ) : (
              <ul className="space-y-2">
                {resumes.map((resume) => (
                  <li key={resume._id} className="flex justify-between items-center p-3 border rounded bg-brand-ivory text-brand-dark-charcoal">
                    <span>{resume.title} (Locale: {resume.locale || 'N/A'})</span>
                    <button
                      onClick={() => deleteResume(resume._id)}
                      className="p-2 bg-red-500 text-white rounded"
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
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
