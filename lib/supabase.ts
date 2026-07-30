import { createClient } from '@supabase/supabase-js';

const PROD_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const PROD_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Public, throwaway demo project seeded with fake data (no real client PII).
// These are anon (publishable) credentials — safe to ship in the bundle, same
// posture as the production anon key already exposed via NEXT_PUBLIC_*.
export const DEMO_SUPABASE_URL = 'https://wdynqlrbirvartitpwcn.supabase.co';
export const DEMO_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkeW5xbHJiaXJ2YXJ0aXRwd2NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5MTIzMzAsImV4cCI6MjA4MTQ4ODMzMH0.m746YzH9k96Q-8xfVjxpyN-ULaHUQNqzDcfj2vcbpww';

export const DEMO_FLAG_KEY = 'pgi-demo';

// Where the real app lives, used to send someone from the demo host back to
// production. Optional: unset just means the demo host links to its own /login.
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || '';

// A host whose first label is "demo" (demo.agilams.com) is permanently a
// sandbox. Hostname beats the localStorage flag for a reason worth keeping in
// mind: localStorage is per-origin, so on a single shared origin one visit to
// /demo would repoint that whole browser at the sandbox until the visitor
// remembered to click "Exit demo" — and a staff member who didn't would then
// fail to log in with real credentials. Deriving it from the host removes that
// failure mode entirely, and keeps the production origin incapable of ever
// pointing at demo data.
export function isDemoHostname(hostname: string): boolean {
  return hostname.split('.')[0] === 'demo';
}

// True when demo mode came from the host rather than the flag. The banner uses
// this: on a demo host there is no "exit" to perform locally, so it links out
// to the real app instead of clearing a flag that was never set.
export const DEMO_VIA_HOSTNAME =
  typeof window !== 'undefined' && isDemoHostname(window.location.hostname);

function detectDemoMode(): boolean {
  if (typeof window === 'undefined') return false;
  if (isDemoHostname(window.location.hostname)) return true;
  // Fallback for previews, branch deploys and localhost, where there is no
  // demo subdomain: /demo sets this flag and reloads.
  try {
    return window.localStorage.getItem(DEMO_FLAG_KEY) === '1';
  } catch {
    return false;
  }
}

export const DEMO_MODE = detectDemoMode();

// On a demo host, "Log in" must point at the real app — otherwise real staff
// credentials get checked against the sandbox database and simply fail, which
// is a confusing thing to hit while presenting.
export function loginHref(): string {
  return DEMO_VIA_HOSTNAME && APP_URL ? `${APP_URL}/login` : '/login';
}

// Canonical home of the sandbox.
export const DEMO_URL = 'https://demo.agilams.com';

// Where "Try the demo" should send the visitor. On the real domains this must
// be the absolute demo host: a relative /demo would fall back to the
// localStorage flag and sandbox the *current* origin — the same deployment
// serves /login there, so a staff member on that browser would then have real
// credentials checked against the sandbox and fail. Previews and localhost
// have no demo subdomain, so they keep the relative flag-based flow.
export function demoHref(): string {
  if (typeof window === 'undefined') return '/demo';
  const h = window.location.hostname;
  if (isDemoHostname(h)) return '/demo';
  if (h.endsWith('agilams.com') || h.endsWith('pinoygeneralinsurance.com')) {
    return DEMO_URL;
  }
  return '/demo';
}

// Seeded demo staff account (public by design — the project is a sandbox).
export const DEMO_CREDENTIALS = {
  email: 'demo@pinoygeneralcrm.com',
  password: 'demo-crm-2026',
};

export const supabase = createClient(
  DEMO_MODE ? DEMO_SUPABASE_URL : PROD_URL,
  DEMO_MODE ? DEMO_SUPABASE_ANON_KEY : PROD_ANON_KEY
);
