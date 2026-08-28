// Browser runtime. Loaded by the Sentry webpack plugin that withSentryConfig
// installs; Next 13 has no instrumentation-client.ts hook (that arrived in
// 15.3), so this file is the client entry point.
import * as Sentry from '@sentry/nextjs';
import { sharedOptions } from '@/lib/observability/scrub';

Sentry.init({
  ...sharedOptions,
  // No replay integration: it would record the staff member's screen, which
  // is the agency's entire client list.
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
});
