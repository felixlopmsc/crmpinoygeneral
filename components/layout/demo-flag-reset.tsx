'use client';

import { useEffect } from 'react';
import { DEMO_FLAG_KEY, isProductionHostname } from '@/lib/demo-host';

/**
 * Clears a stale `pgi-demo` flag from a production origin. Renders nothing.
 *
 * This is the one piece that reaches browsers already in the bad state. The
 * guard in `resolveDemoMode` makes an existing flag inert and the /demo
 * redirect stops new ones being set, but neither *removes* the key from a
 * staff browser that picked it up before either landed.
 *
 * Mounted in the root layout rather than the dashboard layout on purpose: the
 * affected population is staff who cannot log in, so they are sitting on
 * /login and never reach `app/(dashboard)/layout.tsx`. Putting the reset there
 * would miss exactly the people it exists for. `app/demo/page.tsx` is no
 * better — it only runs if they visit /demo again, which they have no reason
 * to do.
 *
 * No reload afterwards. `DEMO_MODE` is already `false` on these hosts thanks
 * to the guard, so the Supabase singleton was built against production before
 * this effect ran. Removing the key is hygiene — it stops the stale value from
 * mattering if the guard ever regresses — not a correction that the current
 * page state depends on. A reload here would be a wasted round-trip at best
 * and a loop at worst.
 *
 * Imports from `@/lib/demo-host`, not `@/lib/supabase`: this needs the
 * hostname predicate, not a database client.
 */
export default function DemoFlagReset() {
  useEffect(() => {
    if (!isProductionHostname(window.location.hostname)) return;
    try {
      window.localStorage.removeItem(DEMO_FLAG_KEY);
    } catch {
      // Strict privacy modes throw on localStorage access. Nothing to clear
      // that we could reach, and nothing readable later either.
    }
  }, []);

  return null;
}
