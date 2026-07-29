'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import AppShell from '@/components/layout/app-shell';
import OnboardingDialog from '@/components/layout/onboarding-dialog';
import DemoBanner from '@/components/layout/demo-banner';
import { DEMO_MODE } from '@/lib/supabase';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { session, user, loading } = useAuth();
  const router = useRouter();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);

  useEffect(() => {
    if (!loading && !session) {
      router.replace('/login');
    }
  }, [session, loading, router]);

  useEffect(() => {
    // The sandbox seeds onboarding as complete; never prompt a demo visitor.
    if (DEMO_MODE || !user || onboardingChecked) return;
    async function checkOnboarding() {
      const { data } = await supabase
        .from('onboarding_progress')
        .select('completed')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (data && !data.completed) {
        setShowOnboarding(true);
      }
      setOnboardingChecked(true);
    }
    checkOnboarding();
  }, [user, onboardingChecked]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#2C3E6B] border-t-transparent" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <>
      <DemoBanner />
      <AppShell>
        {children}
        <OnboardingDialog
          open={showOnboarding}
          onComplete={() => setShowOnboarding(false)}
        />
      </AppShell>
    </>
  );
}
