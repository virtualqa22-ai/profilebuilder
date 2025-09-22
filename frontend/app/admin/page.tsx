"use client";

import { useState } from 'react';
import localesData from '@/backend/data/locales.json';

type Locale = {
  country: string;
  countryCode: string;
  [key: string]: any;
};

function isLocaleObject(l: any): l is Locale {
  return l && typeof l === 'object' && typeof l.country === 'string' && typeof l.countryCode === 'string';
}

const localeObjects = Array.isArray(localesData)
  ? (localesData.filter(isLocaleObject) as Locale[])
  : [];

export default function AdminLocaleEditor() {
  const [locales, setLocales] = useState<Locale[]>(localeObjects);
  const [selected, setSelected] = useState<string>(locales[0]?.countryCode || '');
  const [edit, setEdit] = useState('');

  const handleSelect = (countryCode: string) => {
    setSelected(countryCode);
    const found = locales.find(l => l.countryCode === countryCode);
    setEdit(found ? JSON.stringify(found, null, 2) : '');
  };

  const handleSave = () => {
    try {
      const updated: Locale = JSON.parse(edit);
      setLocales(locales.map(l => l.countryCode === updated.countryCode ? updated : l));
      alert('Locale updated (in-memory only, add API to persist)');
    } catch {
      alert('Invalid JSON');
    }
  };

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">Admin: Locale Rule Editor</h1>
      <div className="flex gap-4">
        <aside className="w-64">
          <ul>
            {locales.map(l => (
              <li key={l.countryCode}>
                <button className={`block w-full text-left p-2 ${selected === l.countryCode ? 'bg-blue-100' : ''}`} onClick={() => handleSelect(l.countryCode)}>
                  {l.country} ({l.countryCode})
                </button>
              </li>
            ))}
          </ul>
        </aside>
        <section className="flex-1">
          <textarea
            className="w-full h-96 border p-2 font-mono"
            value={edit}
            onChange={e => setEdit(e.target.value)}
          />
          <button className="mt-2 p-2 bg-blue-600 text-white rounded" onClick={handleSave}>Save (in-memory)</button>
        </section>
      </div>
    </main>
  );
}
