import { NextRequest, NextResponse } from 'next/server';

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

  const destination = HOST_ROOT_REWRITES[host];
  if (destination) {
    return NextResponse.rewrite(new URL(destination, request.url));
  }

  return NextResponse.next();
}

// Only the root path is host-dependent; matching nothing else means this
// middleware cannot interfere with any other route on any domain.
export const config = {
  matcher: '/',
};
