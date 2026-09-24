const { withSentryConfig } = require('@sentry/nextjs');

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

module.exports = withSentryConfig(nextConfig, {
  // Source maps are only uploaded when SENTRY_AUTH_TOKEN, org and project are
  // present. Without them the build skips the upload rather than failing, so
  // this wrapper is safe to merge before any Sentry account wiring exists.
  silent: true,
  // Keep the SDK's own debug logging out of the production bundle.
  // (The old `disableLogger: true` spelling is deprecated in v10.)
  webpack: { treeshake: { removeDebugLogging: true } },
  // No tunnelRoute: it would proxy Sentry traffic through this app's own
  // domain, adding a middleware and auth surface we would rather not add.
});
