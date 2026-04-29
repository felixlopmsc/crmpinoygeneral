'use client';

import { useAuth } from '@/lib/auth-context';
import Sidebar from './sidebar';
import Topbar from './topbar';
import MobileNav from './mobile-nav';
import type { ReactNode } from 'react';

export default function AppShell({ children }: { children: ReactNode }) {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#2C3E6B] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="hidden md:block">
        <Sidebar />
      </div>
      <div className="md:pl-[240px] flex-1 flex flex-col">
        <Topbar />
        <main className="p-4 pb-20 md:p-6 md:pb-6 flex-1">{children}</main>
        <footer className="border-t border-border py-4 px-6 text-center">
          <p className="text-xs text-gray-400">
            &copy; 2026 Pinoy General Insurance Services | Cerritos, CA | (562) 402-1737
          </p>
        </footer>
      </div>
      <MobileNav />
    </div>
  );
}
