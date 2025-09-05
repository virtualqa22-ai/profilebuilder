import Header from '@/components/ui/Header';
import { LanguageProvider } from '@/lib/language';
import { LocaleProvider } from '@/lib/locale';

export const metadata = {
  title: 'CareerVerve',
  description: 'Build ATS-safe resumes with global locale support',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#FAFAFA] text-[#23282D]">
        <LanguageProvider>
          <LocaleProvider>
            <Header />
            {children}
          </LocaleProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
