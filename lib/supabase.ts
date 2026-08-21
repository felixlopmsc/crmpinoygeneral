import { createClient } from '@supabase/supabase-js';
import {
  DEMO_FLAG_KEY,
  DEMO_URL,
  isDemoHostname,
  isProductionHostname,
  resolveDemoMode,
} from './demo-host';

// Re-exported so app code keeps a single import site (`@/lib/supabase`) and
// does not need to know the classification logic lives next door.
export {
  DEMO_FLAG_KEY,
  DEMO_URL,
  isDemoHostname,
  isProductionHostname,
  PRODUCTION_HOSTNAMES,
  resolveDemoMode,
} from './demo-host';

const PROD_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const PROD_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Public, throwaway demo project seeded with fake data (no real client PII).
// These are anon (publishable) credentials — safe to ship in the bundle, same
// posture as the production anon key already exposed via NEXT_PUBLIC_*.
export const DEMO_SUPABASE_URL = 'https://wdynqlrbirvartitpwcn.supabase.co';
export const DEMO_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkeW5xbHJiaXJ2YXJ0aXRwd2NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5MTIzMzAsImV4cCI6MjA4MTQ4ODMzMH0.m746YzH9k96Q-8xfVjxpyN-ULaHUQNqzDcfj2vcbpww';

// Where the real app lives, used to send someone from the demo host back to
// production. Optional: unset just means the demo host links to its own /login.
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || '';

// True when demo mode came from the host rather than the flag. The banner uses
// this: on a demo host there is no "exit" to perform locally, so it links out
// to the real app instead of clearing a flag that was never set.
export const DEMO_VIA_HOSTNAME =
  typeof window !== 'undefined' && isDemoHostname(window.location.hostname);

function readDemoFlag(): boolean {
  try {
    return window.localStorage.getItem(DEMO_FLAG_KEY) === '1';
  } catch {
    // Strict privacy modes throw on localStorage access rather than returning
    // null. No flag readable means no flag set.
    return false;
  }
}

// The flag is read unconditionally and handed to `resolveDemoMode`, which
// decides whether it is allowed to matter. Keep it that way: re-inlining a
// `localStorage` check as the last word here is exactly the bug that shipped.
function detectDemoMode(): boolean {
  if (typeof window === 'undefined') return false;
  return resolveDemoMode({
    hostname: window.location.hostname,
    demoFlag: readDemoFlag(),
  });
}

export const DEMO_MODE = detectDemoMode();

// Two different people leave the sandbox with two different intents, and
// neither destination may depend on an env var being set:
//  - A prospect exiting the demo belongs on the marketing site.
//  - A staff member looking for "the real app" belongs on the staff CRM.
export const MARKETING_URL = 'https://agilams.com';
const STAFF_APP_FALLBACK = 'https://ams.pinoygeneralinsurance.com';

// NEXT_PUBLIC_APP_URL overrides where "the real app" lives; the hard-coded
// staff host keeps things correct when it is unset (or set but not rebuilt —
// NEXT_PUBLIC_* is inlined at build time, an easy step to miss).
export function staffAppUrl(): string {
  return APP_URL || STAFF_APP_FALLBACK;
}

// On a demo host, "Log in" must point at the real app — otherwise real staff
// credentials get checked against the sandbox database and simply fail, which
// is a confusing thing to hit while presenting.
export function loginHref(): string {
  return DEMO_VIA_HOSTNAME ? `${staffAppUrl()}/login` : '/login';
}

// Where "Try the demo" should send the visitor. On a production host this must
// be the absolute demo host, so the sandbox opens on its own origin instead of
// the staff one. Previews and localhost have no demo subdomain, so they keep
// the relative flag-based flow.
//
// This is defence in depth, not the guard itself: `middleware.ts` redirects
// /demo off the production hosts server-side, which is what makes the relative
// href in `components/landing/demo-link.tsx` safe before hydration corrects it.
export function demoHref(): string {
  if (typeof window === 'undefined') return '/demo';
  const h = window.location.hostname;
  if (isDemoHostname(h)) return '/demo';
  if (isProductionHostname(h)) return DEMO_URL;
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
