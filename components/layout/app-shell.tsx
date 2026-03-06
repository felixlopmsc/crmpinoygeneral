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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1E40AF] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="hidden md:block">
        <Sidebar />
      </div>
      <div className="md:pl-[240px]">
        <Topbar />
        <main className="p-4 pb-20 md:p-6 md:pb-6">{children}</main>
      </div>
      <MobileNav />
    </div>
  );
}
