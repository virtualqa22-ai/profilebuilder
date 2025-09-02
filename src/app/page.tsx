'use client';

import { useState } from 'react';
import LocaleSelector from '@/components/ui/LocaleSelector';

export default function Home() {
  const [locale, setLocale] = useState('en-US');

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="w-full max-w-4xl">
        <h1 className="text-4xl font-bold text-center mb-2">CareerVerve</h1>
        <p className="text-xl text-center text-gray-500 mb-8">Global resumes, Local Impact</p>
        <LocaleSelector onLocaleChange={setLocale} />
      </div>
    </main>
  );
}