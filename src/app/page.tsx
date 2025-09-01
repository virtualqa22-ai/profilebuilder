'use client';

import { useState } from 'react';
import LocaleSelector from '@/components/ui/LocaleSelector';
import ResumeBuilder from '@/features/resume/components/ResumeBuilder';

export default function Home() {
  const [locale, setLocale] = useState('en-US');

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="w-full max-w-4xl">
        <h1 className="text-4xl font-bold text-center mb-8">ProFileBuilder</h1>
        <LocaleSelector onLocaleChange={setLocale} />
        <ResumeBuilder locale={locale} />
      </div>
    </main>
  );
}