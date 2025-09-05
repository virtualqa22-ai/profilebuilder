import Link from 'next/link';
import Image from 'next/image';

export default function Header() {
  return (
    <header className="bg-[#3267E3] text-white sticky top-0 z-40 shadow-sm" role="banner" aria-label="Main header">
      <div className="container mx-auto flex items-center justify-between p-4">
        <Link href="/" className="flex items-center gap-3" aria-label="Home">
          <Image src="/uploads/1756982957845-X.png" alt="CareerVerve" width={40} height={40} />
          <span className="font-bold text-lg">CareerVerve</span>
        </Link>
        <nav className="flex items-center gap-6" role="navigation" aria-label="Main navigation">
          <Link href="/resumes" className="hover:underline" aria-label="Resume Builder">Resume Builder</Link>
          <Link href="/jd-match" className="hover:underline" aria-label="JD Match">JD Match</Link>
          <Link href="/auth/signin" className="bg-white text-[#3267E3] px-3 py-1 rounded-md" aria-label="Sign in">Sign In</Link>
        </nav>
      </div>
    </header>
  );
}
