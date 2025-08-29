'use client';

import ResumeBuilder from '@/features/resume/components/ResumeBuilder';
import LivePreview from '@/features/resume/components/LivePreview';
import { useState, useEffect } from 'react';

interface Locale {
  _id: string;
  name: string;
  code: string;
}

interface Resume {
  _id: string;
  title: string;
  content: string;
  locale: Locale;
}

export default function ResumesPage() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [locales, setLocales] = useState<Locale[]>([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchResumes();
  }, []);

  const fetchResumes = async () => {
    try {
      const res = await fetch('/api/resumes');
      const data = await res.json();
      if (data.success) {
        setResumes(data.data);
      } else {
        setMessage(data.error || 'Failed to fetch resumes');
      }
    } catch (error: any) {
      setMessage(error.message || 'An error occurred');
    }
  };

  const deleteResume = async (id: string) => {
    setMessage('');
    try {
      const res = await fetch(`/api/resumes/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        fetchResumes();
        setMessage('Resume deleted successfully!');
      } else {
        setMessage(data.error || 'Failed to delete resume');
      }
    } catch (error: any) {
      setMessage(error.message || 'An error occurred');
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <h1 className="text-4xl font-bold mb-8">Resumes</h1>

      <div className="flex w-full max-w-7xl gap-8">
        <div className="flex-1">
          <ResumeBuilder />
          {message && <p className="mt-4 text-center text-red-500">{message}</p>}
        </div>
        <div className="flex-1 hidden md:block">
          <LivePreview />
        </div>
      </div>

      <div className="w-full max-w-2xl mt-8">
        <h2 className="text-2xl font-semibold mb-4">Existing Resumes</h2>
        {resumes.length === 0 ? (
          <p>No resumes found.</p>
        ) : (
          <ul className="space-y-2">
            {resumes.map((resume) => (
              <li key={resume._id} className="flex justify-between items-center p-3 border rounded bg-gray-100 text-black">
                <span>{resume.title} (Locale: {resume.locale?.name || 'N/A'})</span>
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
    </main>
  );
}


