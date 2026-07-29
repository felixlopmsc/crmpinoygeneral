'use client';

import { useEffect, useRef, useState } from 'react';
import { DEMO_FLAG_KEY, DEMO_MODE, DEMO_CREDENTIALS, supabase } from '@/lib/supabase';

// Entry point for the sandbox demo. Flow:
//  1. First hit sets the demo flag and hard-reloads so lib/supabase re-inits
//     its singleton against the demo project (not production).
//  2. Reload lands here in DEMO_MODE, signs into the seeded demo staff account,
//     then sends the visitor into the dashboard.
export default function DemoEntryPage() {
  const started = useRef(false);
  const [status, setStatus] = useState('Preparing your sandbox…');

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    // Step 1 — not yet in demo mode: set flag, reload to swap the client.
    if (!DEMO_MODE) {
      try {
        window.localStorage.setItem(DEMO_FLAG_KEY, '1');
      } catch {
        /* ignore */
      }
      window.location.replace('/demo');
      return;
    }

    // Step 2 — in demo mode: ensure a demo session, then enter the app.
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setStatus('Signing you in…');
        const { error } = await supabase.auth.signInWithPassword(DEMO_CREDENTIALS);
        if (error) {
          setStatus('Could not start the demo. Please try again in a moment.');
          return;
        }
      }
      setStatus('Loading the dashboard…');
      window.location.replace('/dashboard');
    })();
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#1B2A4A] px-6 text-center">
      <div className="mb-6 h-10 w-10 animate-spin rounded-full border-4 border-[#B8962E] border-t-transparent" />
      <p className="text-lg font-semibold text-white">Agila Management Systems</p>
      <p className="mt-1 text-sm text-white/60">{status}</p>
    </div>
  );
}
