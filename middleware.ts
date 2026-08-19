import { NextRequest, NextResponse } from 'next/server';
import { DEMO_URL, isProductionHostname } from '@/lib/demo-host';

// One deployment serves every domain; only what "/" means differs per host.
// Rewrites (not redirects) so the URL bar stays on the domain the visitor
// typed. Every other route — /login, /demo, /dashboard — stays directly
// reachable on every hostname, and the (dashboard) auth guard is untouched.
//
// To point a new domain's root somewhere (e.g. a licensee), add one entry here.
export const HOST_ROOT_REWRITES: Record<string, string> = {
  // Prospects trying the sandbox land straight in it.
  'demo.agilams.com': '/demo',
  // Pinoy General staff get their login, never the Agila marketing page.
  'ams.pinoygeneralinsurance.com': '/login',
  // agilams.com, www.agilams.com, *.vercel.app previews, localhost, and any
  // unknown or missing Host all fall through to the marketing page.
};

export function middleware(request: NextRequest) {
  // Host may include a port (localhost:3000) and is case-insensitive per RFC.
  const host = (request.headers.get('host') ?? '').split(':')[0].toLowerCase();

  // /demo is the one route that must NOT be reachable on a production host.
  // Served there, it sets `pgi-demo=1` in localStorage for the *staff* origin
  // and reloads — repointing that browser at the sandbox until someone clicks
  // "Exit demo". Staff then have real credentials checked against a sandbox
  // that resets hourly, and login just fails. `resolveDemoMode` refuses to act
  // on the flag on these hosts, but the flag should never be set in the first
  // place, so the route is closed here too.
  //
  // A redirect, not a rewrite: the visitor genuinely belongs on the sandbox's
  // own origin, which is what keeps its localStorage out of the staff origin.
  // 307 rather than 308 — the host list is data, and a permanent redirect
  // would be cached in browsers past any change to it.
  const { pathname, search } = request.nextUrl;
  const isDemoRoute = pathname === '/demo' || pathname.startsWith('/demo/');
  if (isDemoRoute && isProductionHostname(host)) {
    // Carry the path and query across so a future /demo/* subroute lands on
    // its counterpart rather than being flattened to the sandbox entry point.
    //
    // Built by assigning `.pathname` on the sandbox URL rather than by
    // `new URL(pathname, DEMO_URL)`. Both are safe given the test above, but
    // only this one is safe *structurally*: a pathname beginning with `//` is
    // protocol-relative, so `new URL('//evil.com', DEMO_URL)` resolves to
    // https://evil.com, while assigning `.pathname` cannot change the origin
    // no matter what the request contains. Next normalises dot-segments before
    // we see them (`/demo/..//evil.com` arrives as `//evil.com`), so such a
    // path fails `isDemoRoute` today — this just stops that from being the
    // only thing standing between a request and an open redirect.
    const target = new URL(DEMO_URL);
    target.pathname = pathname;
    target.search = search;
    return NextResponse.redirect(target, 307);
  }

  const destination = HOST_ROOT_REWRITES[host];
  if (destination) {
    return NextResponse.rewrite(new URL(destination, request.url));
  }

  return NextResponse.next();
}

// Two host-dependent paths: "/" (what the domain's root means) and "/demo"
// (closed on production hosts, above). Every other route stays directly
// reachable on every hostname and the (dashboard) auth guard is untouched.
//
// `/demo/:path*` is listed even though app/demo/ is a single leaf route
// (page.tsx, no children) today. It costs nothing and it means adding
// app/demo/<anything>/page.tsx later cannot quietly land a route on the
// production hosts that this middleware doesn't run for — the failure mode
// where the guard looks present and isn't. The pathname test above is widened
// to match; the two have to move together.
export const config = {
  matcher: ['/', '/demo', '/demo/:path*'],
};
