'use client';

import { useState } from 'react';
import LocaleSelector from '@/components/ui/LocaleSelector';
import Image from 'next/image';
import Link from 'next/link';

export default function Home() {
  const [locale, setLocale] = useState('en-US');

  return (
    <main className="min-h-screen">
      <section className="bg-white py-20">
        <div className="container mx-auto px-6 lg:px-0 max-w-5xl text-center">
          <Image src="/uploads/1756982957845-X.png" alt="CareerVerve" width={96} height={96} className="mx-auto" />
          <h1 className="mt-6 text-4xl lg:text-5xl font-extrabold text-[#23282D]">CareerVerve</h1>
          <p className="mt-3 text-lg text-gray-600">Global careers, local impact — build ATS-friendly resumes and match to real jobs.</p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/resumes" className="bg-[#3267E3] text-white px-6 py-3 rounded-md font-medium shadow focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#3267E3]" aria-label="Create a new resume">Create Resume</Link>
            <Link href="/jd-match" className="border border-gray-200 px-6 py-3 rounded-md text-gray-700 hover:shadow focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300" aria-label="Analyze a job description">Check JD Match</Link>
          </div>

          <div className="mt-8">
            <LocaleSelector onLocaleChange={setLocale} />
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="container mx-auto px-6 lg:px-0 max-w-5xl">
          <h2 className="text-2xl font-bold mb-4">How it works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="p-6 bg-white rounded-lg shadow-sm">
              <h3 className="font-semibold">1. Create</h3>
              <p className="text-sm text-gray-600 mt-2">Guided resume builder with locale presets and ATS-safe templates.</p>
            </div>
            <div className="p-6 bg-white rounded-lg shadow-sm">
              <h3 className="font-semibold">2. Preview</h3>
              <p className="text-sm text-gray-600 mt-2">Live preview and export to PDF optimized for ATS systems.</p>
            </div>
            <div className="p-6 bg-white rounded-lg shadow-sm">
              <h3 className="font-semibold">3. Match</h3>
              <p className="text-sm text-gray-600 mt-2">Paste job descriptions and get keyword coverage suggestions.</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}