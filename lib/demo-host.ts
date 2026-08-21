/**
 * Pure hostname → Supabase-project classification.
 *
 * Everything here takes a hostname as an argument and touches no `window`, no
 * `process.env` and no imports, for two reasons:
 *
 *  1. `scripts/check-demo-host.mjs` imports this module directly to assert the
 *     production invariant. Importing `lib/supabase.ts` instead would
 *     construct a real Supabase client as a side effect.
 *  2. `middleware.ts` runs on the edge runtime and needs `DEMO_URL` and
 *     `isProductionHostname` without pulling `@supabase/supabase-js` into that
 *     bundle.
 *
 * `lib/supabase.ts` wraps these with the real `window.location` and re-exports
 * them, so `@/lib/supabase` remains the import site for app code.
 */

/** Canonical home of the sandbox. */
export const DEMO_URL = 'https://demo.agilams.com';

/** The localStorage key that opts a non-production origin into the sandbox. */
export const DEMO_FLAG_KEY = 'pgi-demo';

/**
 * Host comparison has to survive case, a trailing root dot and a `:port`.
 * `window.location.hostname` is already normalised, but the `Host` header in
 * middleware is not, and neither are the literals in the check script.
 */
export function normalizeHostname(hostname: string): string {
  return hostname.trim().toLowerCase().split(':')[0].replace(/\.$/, '');
}

/**
 * A host whose first label is `demo` (demo.agilams.com) is permanently a
 * sandbox. Deriving this from the host rather than from stored state means a
 * demo visitor cannot carry demo mode anywhere else: localStorage is
 * per-origin, so the sandbox origin's flag has no reach into a staff origin.
 */
export function isDemoHostname(hostname: string): boolean {
  return normalizeHostname(hostname).split('.')[0] === 'demo';
}

/**
 * Every hostname that serves real staff against the production project
 * (`fetiakfllzxwibqzfedh`). On these, demo mode is not merely off by default —
 * it is unreachable, whatever any stored flag says. See `resolveDemoMode`.
 *
 * `pinoygeneralinsurance.com` and its `www` are the customer portal's domain
 * (the sibling Vite repo) rather than this app's, and are listed defensively:
 * if this deployment is ever pointed at them, it must not be a sandbox.
 */
export const PRODUCTION_HOSTNAMES: readonly string[] = [
  'ams.pinoygeneralinsurance.com',
  'pinoygeneralinsurance.com',
  'www.pinoygeneralinsurance.com',
  'agilams.com',
  'www.agilams.com',
];

export function isProductionHostname(hostname: string): boolean {
  const host = normalizeHostname(hostname);
  // A demo host is never production, even if someone adds a colliding entry
  // to the list above. The two predicates must not both be true.
  if (isDemoHostname(host)) return false;
  return PRODUCTION_HOSTNAMES.includes(host);
}

/**
 * The single decision this module exists to make, expressed as a pure function
 * so `npm run check` can exercise it over a table of hostnames.
 *
 * Order is the whole point, and the middle clause is the bug fix:
 *
 *  1. Demo host  → sandbox, always.
 *  2. Production host → production, always. The flag is NOT consulted. A stale
 *     `pgi-demo=1` in a staff member's browser used to fall through to step 3
 *     and repoint the staff CRM at the sandbox, so their real credentials were
 *     checked against a sandbox that resets hourly and login simply failed.
 *  3. Anywhere else — previews, branch deploys, localhost — the flag decides.
 *     That is the only thing it was ever for: those hosts have no demo
 *     subdomain to route to.
 */
export function resolveDemoMode({
  hostname,
  demoFlag,
}: {
  hostname: string;
  demoFlag: boolean;
}): boolean {
  if (isDemoHostname(hostname)) return true;
  if (isProductionHostname(hostname)) return false;
  return demoFlag;
}
