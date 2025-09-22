import Header from '../components/ui/Header';
import { LanguageProvider } from '@/frontend/lib/language';
import { LocaleProvider } from '@/backend/lib/locale';

import SessionProvider from "../components/ui/SessionProvider";
import CookieConsent from '../components/CookieConsent';

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
              <CookieConsent />
            </LocaleProvider>
          </LanguageProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
