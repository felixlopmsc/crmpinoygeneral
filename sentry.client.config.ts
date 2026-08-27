// Sentry — client runtime.
//
// Inert without a DSN: no DSN, no init, no network. A missing env var
// degrades to "no reporting" rather than to a crash, which keeps local dev
// and preview deployments silent.
import * as Sentry from '@sentry/nextjs';
import { sharedSentryOptions } from '@/lib/sentry-scrub';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV,
    ...sharedSentryOptions,
  });
}
