import Header from '@/components/ui/Header';
import { LanguageProvider } from '@/lib/language';
import { LocaleProvider } from '@/lib/locale';

import SessionProvider from "@/components/ui/SessionProvider";

export const metadata = {
  title: 'CareerVerve',
  description: 'Build ATS-safe resumes with global locale support',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-brand-light-gray text-brand-dark-charcoal">
        <SessionProvider>
          <LanguageProvider>
            <LocaleProvider>
              <Header />
              {children}
            </LocaleProvider>
          </LanguageProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
