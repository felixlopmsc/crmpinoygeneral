import { createClient } from '@supabase/supabase-js';

const PROD_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const PROD_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Public, throwaway demo project seeded with fake data (no real client PII).
// These are anon (publishable) credentials — safe to ship in the bundle, same
// posture as the production anon key already exposed via NEXT_PUBLIC_*.
export const DEMO_SUPABASE_URL = 'https://wdynqlrbirvartitpwcn.supabase.co';
export const DEMO_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkeW5xbHJiaXJ2YXJ0aXRwd2NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5MTIzMzAsImV4cCI6MjA4MTQ4ODMzMH0.m746YzH9k96Q-8xfVjxpyN-ULaHUQNqzDcfj2vcbpww';

// Demo mode is a client-only flag set by the /demo entry route. Reading it at
// module init means the singleton client below points at the demo project for
// the whole session — every existing supabase.from(...) call works unchanged.
export const DEMO_FLAG_KEY = 'pgi-demo';

function detectDemoMode(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(DEMO_FLAG_KEY) === '1';
  } catch {
    return false;
  }
}

export const DEMO_MODE = detectDemoMode();

// Seeded demo staff account (public by design — the project is a sandbox).
export const DEMO_CREDENTIALS = {
  email: 'demo@pinoygeneralcrm.com',
  password: 'demo-crm-2026',
};

export const supabase = createClient(
  DEMO_MODE ? DEMO_SUPABASE_URL : PROD_URL,
  DEMO_MODE ? DEMO_SUPABASE_ANON_KEY : PROD_ANON_KEY
);
