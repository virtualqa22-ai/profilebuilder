"use client";

import Link from 'next/link';
import Image from 'next/image';
import LanguageSelector from './LanguageSelector';
import { useLanguage } from '@/frontend/lib/language';

import { useSession, signOut } from "next-auth/react";

export default function Header() {
  const { t } = useLanguage();
  const { data: session } = useSession();
  const header = t?.header || { brand: 'CareerVerve', resumes: 'Resume Builder', jdMatch: 'JD Match', coverLetter: 'Cover Letter Builder', signIn: 'Sign In', signOut: 'Sign Out' };

  return (
    <header className="bg-brand-blue text-white sticky top-0 z-40 shadow-sm" role="banner" aria-label="Main header">
      <div className="container mx-auto flex items-center justify-between p-4">
        <Link href="/" className="flex items-center gap-3" aria-label="Home">
          <Image src="/logo.png" alt="CareerVerve Logo" width={40} height={40} />
          <span className="font-bold text-lg">{header.brand}</span>
        </Link>
        <nav className="flex items-center gap-4" role="navigation" aria-label="Main navigation">
          <Link href="/resumes" className="hover:underline" aria-label={header.resumes}>{header.resumes}</Link>
          <Link href="/jd-match" className="hover:underline" aria-label={header.jdMatch}>{header.jdMatch}</Link>
          <Link href="/cover-letter" className="hover:underline" aria-label={header.coverLetter}>{header.coverLetter}</Link>
          {session ? (
            <>
              <Link href="/profile" className="hover:underline">{session.user?.name}</Link>
              <button onClick={() => signOut()} className="bg-white text-brand-blue px-3 py-1 rounded-md">{header.signOut}</button>
            </>
          ) : (
            <Link href="/auth/signin" className="bg-white text-brand-blue px-3 py-1 rounded-md" aria-label={header.signIn}>{header.signIn}</Link>
          )}
          <LanguageSelector />
        </nav>
      </div>
    </header>
  );
}
