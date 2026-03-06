'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import AppShell from '@/components/layout/app-shell';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !session) {
      router.replace('/');
    }
  }, [session, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1E40AF] border-t-transparent" />
      </div>
    );
  }

  if (!session) return null;

  return <AppShell>{children}</AppShell>;
}
