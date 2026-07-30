'use client';

import { useState } from 'react';
import { ExternalLink, FlaskConical, X } from 'lucide-react';
import {
  DEMO_MODE,
  DEMO_FLAG_KEY,
  DEMO_VIA_HOSTNAME,
  MARKETING_URL,
  staffAppUrl,
  supabase,
} from '@/lib/supabase';

// Persistent bar shown only inside the sandbox demo. Renders nothing in the
// real app (DEMO_MODE is false there).
//
// Two exits with two different intents:
//  - "Exit demo" is for prospects, so it lands on the marketing site. On the
//    demo host it must NOT go to "/" — the middleware rewrites the demo
//    host's root back into /demo, which would sign the visitor straight back
//    in (an env-free hard-coded destination avoids that loop entirely).
//  - "Go to real app" is for staff who wandered in, and points at the CRM.
export default function DemoBanner() {
  const [exiting, setExiting] = useState(false);
  if (!DEMO_MODE) return null;

  async function exitDemo() {
    setExiting(true);
    try {
      await supabase.auth.signOut();
    } catch {
      /* ignore */
    }
    try {
      window.localStorage.removeItem(DEMO_FLAG_KEY);
    } catch {
      /* ignore */
    }
    window.location.replace(DEMO_VIA_HOSTNAME ? MARKETING_URL : '/');
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-[#B8962E] px-4 py-2 text-center text-xs font-medium text-[#1B2A4A] sm:text-sm">
      <FlaskConical className="h-4 w-4 flex-shrink-0" />
      <span>
        You&apos;re exploring a <strong>live demo</strong> with sample data. Change anything you like — the
        sandbox resets hourly and never touches real client records.
      </span>
      <span className="flex flex-shrink-0 items-center gap-2">
        <button
          onClick={exitDemo}
          disabled={exiting}
          className="inline-flex items-center gap-1 rounded-full bg-[#1B2A4A] px-3 py-1 text-[11px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          <X className="h-3 w-3" /> {exiting ? 'Exiting…' : 'Exit demo'}
        </button>
        {DEMO_VIA_HOSTNAME && (
          <a
            href={staffAppUrl()}
            className="inline-flex items-center gap-1 rounded-full bg-[#1B2A4A]/10 px-3 py-1 text-[11px] font-semibold transition-colors hover:bg-[#1B2A4A]/20"
          >
            <ExternalLink className="h-3 w-3" /> Go to real app
          </a>
        )}
      </span>
    </div>
  );
}
