/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  experimental: {
    // Required for instrumentation.ts to run on Next 13; stable from 15.
    instrumentationHook: true,
  },
  async redirects() {
    return [
      // Claims was removed from the CRM on 2026-09-17: clients are directed
      // to their carrier for claims. The table stays; only the UI is gone.
      { source: '/claims', destination: '/dashboard', permanent: false },
      { source: '/claims/:path*', destination: '/dashboard', permanent: false },
    ];
  },
};

// Sentry runs WITHOUT the withSentryConfig wrapper. The wrapper's webpack
// injection (entry rewriting, component wrapping, release/route manifest
// injection) coincided with a build failure on Next 13.5.11: pages under
// app/(dashboard) intermittently failed prerendering with "Could not find the
// module .../error-boundary.js# in the React Client Manifest". Without the
// wrapper: the server and edge SDKs still initialise through
// instrumentation.ts (Next's own hook), the browser SDK initialises through
// components/observability/sentry-init.tsx, and app/global-error.tsx still
// reports React render errors. What is lost is build-time only: source-map
// upload and automatic server-component wrapping, neither of which this app
// relied on (no SENTRY_AUTH_TOKEN, tracesSampleRate 0).
module.exports = nextConfig;
