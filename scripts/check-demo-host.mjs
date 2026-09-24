#!/usr/bin/env node
/**
 * Fails the build if a production hostname can ever resolve to demo mode.
 *
 * Why this exists: `ams.pinoygeneralinsurance.com` authenticated against the
 * DEMO Supabase project (`wdynqlrbirvartitpwcn`) instead of production
 * (`fetiakfllzxwibqzfedh`). Staff could not log in — their real credentials
 * were being checked against a sandbox that resets hourly, so the POST to
 * `/auth/v1/token` came back 400 and read as "wrong password".
 *
 * The cause was a stale `pgi-demo=1` in localStorage on the ams origin, set by
 * `app/demo/page.tsx` on any host. Demo mode was resolved as "demo host OR
 * flag", so the flag alone was enough to repoint the staff CRM at the sandbox.
 * The fix is the `isProductionHostname` clause in `resolveDemoMode`: on a
 * production host the flag is not consulted at all.
 *
 * That clause is one line and reads like a redundant guard. This script is
 * what stops it being "simplified" away, and what stops a domain added to
 * PRODUCTION_HOSTNAMES from skipping the invariant.
 *
 * Usage: node scripts/check-demo-host.mjs
 */
import { resolveDemoMode, PRODUCTION_HOSTNAMES, DEMO_URL } from '../lib/demo-host.ts';

// hostname, flag, expected. The flag column is the point of the table: on a
// production host both values must give `false`, and off production the flag
// is the only thing that decides.
const CASES = [
  // Production hosts: demo mode is unreachable, whatever the flag says.
  ['ams.pinoygeneralinsurance.com', true, false, 'the reported defect: stale flag on the staff CRM'],
  ['agilams.com', true, false, 'apex production domain'],
  ['www.agilams.com', true, false, 'www of the apex'],
  ['pinoygeneralinsurance.com', true, false, 'customer portal domain, listed defensively'],

  // The demo host is a sandbox from its hostname alone — no flag required.
  ['demo.agilams.com', false, true, `the sandbox at ${DEMO_URL}`],

  // Normalisation: the Host header in middleware is not pre-normalised the way
  // window.location.hostname is. Case, a trailing root dot and :port must not
  // let a production host miss the list.
  ['AMS.PinoyGeneralInsurance.com.', true, false, 'mixed case + trailing root dot'],
  ['ams.pinoygeneralinsurance.com:3000', true, false, 'Host header carrying a port'],

  // Everywhere else the flag decides — that is all it was ever for. These
  // hosts have no demo subdomain to route a visitor to.
  ['localhost', true, true, 'local dev opts in'],
  ['some-preview.vercel.app', true, true, 'preview deploy opts in'],
  ['some-preview.vercel.app', false, false, 'preview deploy without the flag'],
];

const failures = [];

for (const [hostname, demoFlag, expected, why] of CASES) {
  const actual = resolveDemoMode({ hostname, demoFlag });
  if (actual !== expected) {
    failures.push({ hostname, demoFlag, expected, actual, why });
  }
}

// Derived from the list rather than repeating it: adding a domain in Vercel
// means adding it to PRODUCTION_HOSTNAMES, and it must carry the invariant
// with it instead of quietly getting no coverage.
for (const hostname of PRODUCTION_HOSTNAMES) {
  const actual = resolveDemoMode({ hostname, demoFlag: true });
  if (actual !== false) {
    failures.push({
      hostname,
      demoFlag: true,
      expected: false,
      actual,
      why: 'PRODUCTION_HOSTNAMES entry — every entry must ignore the flag',
    });
  }
}

const total = CASES.length + PRODUCTION_HOSTNAMES.length;

if (failures.length === 0) {
  console.log(`✓ demo/production resolution holds over ${total} cases`);
  process.exit(0);
}

console.error(
  `✗ ${failures.length} of ${total} demo-mode resolution${failures.length === 1 ? '' : 's'} wrong` +
    ` — a wrong \`false → true\` on a production host points staff at the sandbox:\n`,
);
for (const f of failures) {
  console.error(`  ${f.hostname}  (pgi-demo=${f.demoFlag})`);
  console.error(`    expected demo=${f.expected}, got demo=${f.actual}   — ${f.why}`);
}
console.error(`\n  resolveDemoMode lives in lib/demo-host.ts; hostname decides, the flag only applies off production.`);
process.exit(1);
