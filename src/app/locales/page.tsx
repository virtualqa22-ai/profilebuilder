'use client';

import { useState, useEffect } from 'react';

interface Locale {
  _id: string;
  name: string;
  code: string;
}

export default function LocalesPage() {
  const [locales, setLocales] = useState<Locale[]>([]);
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchLocales();
  }, []);

  const fetchLocales = async () => {
    try {
      const res = await fetch('/api/locales');
      const data = await res.json();
      if (data.success) {
        setLocales(data.data);
      } else {
        setMessage(data.error || 'Failed to fetch locales');
      }
    } catch (error: any) {
      setMessage(error.message || 'An error occurred');
    }
  };

  const addLocale = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    try {
      const res = await fetch('/api/locales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newName, code: newCode }),
      });
      const data = await res.json();
      if (data.success) {
        setNewName('');
        setNewCode('');
        fetchLocales();
        setMessage('Locale added successfully!');
      } else {
        setMessage(data.error || 'Failed to add locale');
      }
    } catch (error: any) {
      setMessage(error.message || 'An error occurred');
    }
  };

  const deleteLocale = async (id: string) => {
    setMessage('');
    try {
      const res = await fetch(`/api/locales/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        fetchLocales();
        setMessage('Locale deleted successfully!');
      } else {
        setMessage(data.error || 'Failed to delete locale');
      }
    } catch (error: any) {
      setMessage(error.message || 'An error occurred');
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <h1 className="text-4xl font-bold mb-8">Locales</h1>

      <div className="w-full max-w-2xl mb-8">
        <h2 className="text-2xl font-semibold mb-4">Add New Locale</h2>
        <form onSubmit={addLocale} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Locale Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="p-2 border rounded text-black"
            required
          />
          <input
            type="text"
            placeholder="Locale Code (e.g., en-US)"
            value={newCode}
            onChange={(e) => setNewCode(e.target.value)}
            className="p-2 border rounded text-black"
            required
          />
          <button type="submit" className="p-2 bg-blue-500 text-white rounded">
            Add Locale
          </button>
        </form>
        {message && <p className="mt-4 text-center text-red-500">{message}</p>}
      </div>

      <div className="w-full max-w-2xl">
        <h2 className="text-2xl font-semibold mb-4">Existing Locales</h2>
        {locales.length === 0 ? (
          <p>No locales found.</p>
        ) : (
          <ul className="space-y-2">
            {locales.map((locale) => (
              <li key={locale._id} className="flex justify-between items-center p-3 border rounded bg-gray-100 text-black">
                <span>{locale.name} ({locale.code})</span>
                <button
                  onClick={() => deleteLocale(locale._id)}
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
