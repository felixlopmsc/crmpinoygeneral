import './globals.css';
import type { Metadata } from 'next';
import { Montserrat } from 'next/font/google';
import { AuthProvider } from '@/lib/auth-context';
import { Toaster } from '@/components/ui/sonner';
import DemoFlagReset from '@/components/layout/demo-flag-reset';

const montserrat = Montserrat({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Agila Management Systems',
  description: 'Agency management system for independent insurance agencies',
  // The root layout is shared by all three hostnames, so there is one favicon
  // for three brands. Agila is the product being sold; the tab icon is Agila's.
  // Accepted trade-off: Pinoy staff on ams.pinoygeneralinsurance.com get an
  // eagle in their tab.
  icons: {
    icon: '/favicon.ico',
    apple: '/agila-eagle.png',
  },
  // Required for the relative image path below to resolve. Without it Next
  // emits a warning and no absolute og:image URL, which is the same as having
  // no share card at all — the crawlers need an absolute URL.
  metadataBase: new URL('https://agilams.com'),
  openGraph: {
    type: 'website',
    siteName: 'Agila Management Systems',
    url: 'https://agilams.com',
    title: 'Agila Management Systems',
    description: 'The agency management system for independent insurance agents.',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: 'Agila Management Systems' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Agila Management Systems',
    description: 'The agency management system for independent insurance agents.',
    images: ['/og-image.jpg'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={montserrat.className} suppressHydrationWarning>
        {/* Renders nothing. Outside AuthProvider on purpose: clearing a stale
            pgi-demo flag must not wait on a session, and the staff this exists
            for are the ones who cannot get a session at all. */}
        <DemoFlagReset />
        <AuthProvider>
          {children}
          <Toaster position="top-right" />
        </AuthProvider>
      </body>
    </html>
  );
}
