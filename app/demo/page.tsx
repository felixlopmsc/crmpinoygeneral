'use client';

import { useEffect, useRef, useState } from 'react';
import {
  DEMO_FLAG_KEY,
  DEMO_MODE,
  DEMO_CREDENTIALS,
  DEMO_URL,
  isDemoHostname,
  isProductionHostname,
  supabase,
} from '@/lib/supabase';

// Entry point for the sandbox demo. On the demo host, DEMO_MODE is already
// true (derived from the hostname) and we go straight to sign-in. Anywhere
// else (previews, localhost) the flow is:
//  1. First hit sets the demo flag and hard-reloads so lib/supabase re-inits
//     its singleton against the demo project (not production).
//  2. Reload lands here in DEMO_MODE, signs into the seeded demo staff account,
//     then sends the visitor into the dashboard.
//
// If localStorage is unavailable (strict privacy modes), step 1 would loop
// forever: set-flag fails silently, reload, still not in demo mode, repeat.
// So the flag write is verified by reading it back, and on failure we stop
// and point the visitor at the canonical demo host instead of hanging.
export default function DemoEntryPage() {
  const started = useRef(false);
  const [status, setStatus] = useState('Preparing your sandbox…');
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    // Step 0 — refuse to run on a production host. Setting the flag here is
    // what sandboxed the staff CRM: `pgi-demo=1` lands on the *staff* origin,
    // the reload repoints that browser at the demo project, and real
    // credentials then fail against a sandbox that resets hourly.
    //
    // `middleware.ts` redirects /demo off these hosts, so reaching this line
    // means that guard did not run — a matcher change, a deployment without
    // middleware, someone rendering this page from another route. The cost of
    // being wrong here is asymmetric, so check again rather than assume.
    if (isProductionHostname(window.location.hostname)) {
      window.location.replace(DEMO_URL);
      return;
    }

    // Step 1 — not yet in demo mode: set flag, verify it stuck, reload.
    if (!DEMO_MODE) {
      let persisted = false;
      try {
        window.localStorage.setItem(DEMO_FLAG_KEY, '1');
        persisted = window.localStorage.getItem(DEMO_FLAG_KEY) === '1';
      } catch {
        persisted = false;
      }
      if (!persisted) {
        setBlocked(true);
        return;
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
      {blocked ? (
        <>
          <p className="text-lg font-semibold text-white">Agila Management Systems</p>
          <p className="mt-3 max-w-md text-sm text-white/70">
            Your browser is blocking the storage this page needs to start the demo here.
            No problem — the demo has its own home:
          </p>
          {/* Plain anchor: on the demo host this is a different origin, and if
              this page is somehow served there, isDemoHostname makes it a
              same-page link rather than a loop. */}
          <a
            href={isDemoHostname(window.location.hostname) ? '/demo' : DEMO_URL}
            className="mt-5 rounded-md bg-[#B8962E] px-5 py-2.5 text-sm font-semibold text-[#1B2A4A] transition-colors hover:bg-[#D4AD3C]"
          >
            Open the demo at demo.agilams.com
          </a>
        </>
      ) : (
        <>
          <div className="mb-6 h-10 w-10 animate-spin rounded-full border-4 border-[#B8962E] border-t-transparent" />
          <p className="text-lg font-semibold text-white">Agila Management Systems</p>
          <p className="mt-1 text-sm text-white/60">{status}</p>
        </>
      )}
    </div>
  );
}
