'use client';

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
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [selectedLocale, setSelectedLocale] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchResumes();
    fetchLocales();
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

  const fetchLocales = async () => {
    try {
      const res = await fetch('/api/locales');
      const data = await res.json();
      if (data.success) {
        setLocales(data.data);
        if (data.data.length > 0) {
          setSelectedLocale(data.data[0]._id); // Select first locale by default
        }
      } else {
        setMessage(data.error || 'Failed to fetch locales for resume creation');
      }
    } catch (error: any) {
      setMessage(error.message || 'An error occurred');
    }
  };

  const addResume = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    try {
      const res = await fetch('/api/resumes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: newTitle, content: newContent, locale: selectedLocale }),
      });
      const data = await res.json();
      if (data.success) {
        setNewTitle('');
        setNewContent('');
        fetchResumes();
        setMessage('Resume added successfully!');
      } else {
        setMessage(data.error || 'Failed to add resume');
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

      <div className="w-full max-w-2xl mb-8">
        <h2 className="text-2xl font-semibold mb-4">Add New Resume</h2>
        <form onSubmit={addResume} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Resume Title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="p-2 border rounded text-black"
            required
          />
          <textarea
            placeholder="Resume Content"
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            className="p-2 border rounded text-black"
            rows={5}
            required
          ></textarea>
          <select
            value={selectedLocale}
            onChange={(e) => setSelectedLocale(e.target.value)}
            className="p-2 border rounded text-black"
            required
          >
            {locales.length === 0 ? (
              <option value="">No locales available</option>
            ) : (
              locales.map((locale) => (
                <option key={locale._id} value={locale._id}>
                  {locale.name} ({locale.code})
                </option>
              ))
            )}
          </select>
          <button type="submit" className="p-2 bg-blue-500 text-white rounded" disabled={locales.length === 0}>
            Add Resume
          </button>
        </form>
        {message && <p className="mt-4 text-center text-red-500">{message}</p>}
      </div>

      <div className="w-full max-w-2xl">
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
