import './globals.css';
import type { Metadata } from 'next';
import { Montserrat } from 'next/font/google';
import { AuthProvider } from '@/lib/auth-context';
import { Toaster } from '@/components/ui/sonner';

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
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={montserrat.className} suppressHydrationWarning>
        <AuthProvider>
          {children}
          <Toaster position="top-right" />
        </AuthProvider>
      </body>
    </html>
  );
}
