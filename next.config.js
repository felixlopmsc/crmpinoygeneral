/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  experimental: {
    // Next 13.5 only loads instrumentation.ts behind this flag; without it the
    // server and edge Sentry configs never run.
    instrumentationHook: true,
  },
};

const { withSentryConfig } = require('@sentry/nextjs');

module.exports = withSentryConfig(nextConfig, {
  silent: true,
  // Source maps are not uploaded: that needs a SENTRY_AUTH_TOKEN in CI, and a
  // missing token would fail the build. Stack traces arrive minified until a
  // token is configured. Wire it as a follow-up, not as a launch blocker.
  sourcemaps: { disable: true },
  // Do not let Sentry silently add cron monitors to Vercel.
  automaticVercelMonitors: false,
});
