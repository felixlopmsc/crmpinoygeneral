'use client';

import { useState } from 'react';
import { FlaskConical, X } from 'lucide-react';
import { DEMO_MODE, DEMO_FLAG_KEY, DEMO_VIA_HOSTNAME, APP_URL, supabase } from '@/lib/supabase';

// Persistent bar shown only inside the sandbox demo. Renders nothing in the
// real app (DEMO_MODE is false there).
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
    // On a dedicated demo host there is no local flag to clear — the whole
    // origin is the sandbox — so send the visitor to the real app if we know
    // where it lives, and otherwise back to this host's landing page.
    window.location.replace(DEMO_VIA_HOSTNAME && APP_URL ? APP_URL : '/');
  }

  return (
    <div className="flex items-center justify-center gap-3 bg-[#B8962E] px-4 py-2 text-center text-xs font-medium text-[#1B2A4A] sm:text-sm">
      <FlaskConical className="h-4 w-4 flex-shrink-0" />
      <span>
        You&apos;re exploring a <strong>live demo</strong> with sample data. Change anything you like — the
        sandbox resets hourly and never touches real client records.
      </span>
      <button
        onClick={exitDemo}
        disabled={exiting}
        className="ml-2 inline-flex flex-shrink-0 items-center gap-1 rounded-full bg-[#1B2A4A] px-3 py-1 text-[11px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        <X className="h-3 w-3" />
        {exiting ? 'Exiting…' : DEMO_VIA_HOSTNAME && APP_URL ? 'Go to real app' : 'Exit demo'}
      </button>
    </div>
  );
}
