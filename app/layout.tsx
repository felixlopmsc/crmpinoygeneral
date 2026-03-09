import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/lib/auth-context';
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Pinoy General CRM',
  description: 'Customer Relationship Management for Pinoy General Insurance Services',
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
      <body className={inter.className} suppressHydrationWarning>
        <AuthProvider>
          {children}
          <Toaster position="top-right" />
        </AuthProvider>
      </body>
    </html>
  );
}
