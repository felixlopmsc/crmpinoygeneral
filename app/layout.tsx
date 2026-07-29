import './globals.css';
import type { Metadata } from 'next';
import { Montserrat } from 'next/font/google';
import { AuthProvider } from '@/lib/auth-context';
import { Toaster } from '@/components/ui/sonner';

const montserrat = Montserrat({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Agila Management Systems',
  description: 'Agency management system for independent insurance agencies',
  icons: {
    icon: '/Copy_of_Copy_of_Pinoy_General_Insurance_Logo_(800_×_800_px)_(1).png',
    apple: '/Copy_of_Copy_of_Pinoy_General_Insurance_Logo_(800_×_800_px)_(1).png',
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
