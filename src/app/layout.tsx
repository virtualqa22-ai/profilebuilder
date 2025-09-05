import Header from '@/components/ui/Header';

export const metadata = {
  title: 'CareerVerve',
  description: 'Build ATS-safe resumes with global locale support',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-[#FAFAFA] text-[#23282D]">
        <Header />
        {children}
      </body>
    </html>
  )
}
