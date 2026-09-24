import type { ErrorEvent, EventHint, Breadcrumb } from '@sentry/nextjs';

/**
 * PII scrubbing for error reports, shared by the client, server and edge
 * Sentry runtimes.
 *
 * This CRM holds the agency's book of business: client names, addresses,
 * dates of birth, policy numbers and driver's license numbers. An unscrubbed
 * error report is a PII leak with extra steps, so the scrubbing runs on every
 * event rather than being a setting someone can flip off by accident.
 *
 * Kept deliberately in step with the portal's src/observability/errorReporting.js
 * -- both apps report on the same people, and a pattern that only one of them
 * strips is a pattern that leaks.
 */

// Order matters -- the token pattern must run before the generic long-string
// rules so a token is not partially matched first, and the date rules must run
// before the phone rule, which would otherwise claim the dashed date form.
const REDACTIONS: Array<[RegExp, string]> = [
  // invite tokens: 32 url-safe base64 bytes, as minted by create_client_invite
  [/\b[A-Za-z0-9_-]{40,}\b/g, '[redacted:token]'],
  // driver's license shapes: CA (1 letter + 7 digits) first, then a general
  // US shape. Over-matching an error code is an accepted cost in an app that
  // stores real license numbers.
  [/\b[A-Z]\d{7}\b/g, '[redacted:license]'],
  [/\b[A-Z]{1,2}\d{5,8}\b/g, '[redacted:license]'],
  // date-of-birth-shaped strings
  [/\b\d{2}[/-]\d{2}[/-]\d{4}\b/g, '[redacted:dob]'],
  [/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[redacted:email]'],
  // phone numbers, formatted or not
  [/(\+?\d[\d\s().-]{8,}\d)/g, '[redacted:phone]'],
  // uuids -- client, policy and user ids all travel as uuids
  [/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '[redacted:id]'],
];

export const scrub = (value: unknown): unknown => {
  if (typeof value !== 'string') return value;
  return REDACTIONS.reduce((acc, [pattern, replacement]) => acc.replace(pattern, replacement), value);
};

const scrubString = (value: string | undefined): string | undefined =>
  typeof value === 'string' ? (scrub(value) as string) : value;

export const scrubDeep = (input: unknown, depth = 0): unknown => {
  if (depth > 6 || input == null) return input;
  if (typeof input === 'string') return scrub(input);
  if (Array.isArray(input)) return input.map((v) => scrubDeep(v, depth + 1));
  if (typeof input === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      out[k] = scrubDeep(v, depth + 1);
    }
    return out;
  }
  return input;
};

export const beforeSend = (event: ErrorEvent, _hint?: EventHint): ErrorEvent => {
  // Never identify the person. An error is actionable without knowing who hit
  // it, and "who" here is a staff member or an insurance customer's record.
  delete event.user;

  if (event.request) {
    delete event.request.cookies;
    delete event.request.headers;
    // Request bodies carry whole client records on this app's write paths.
    delete event.request.data;
    // A query string can carry a token or a client id -- keep the path only.
    if (typeof event.request.url === 'string') {
      event.request.url = event.request.url.split('?')[0];
    }
  }

  if (event.message) event.message = scrubString(event.message)!;

  if (event.exception?.values) {
    event.exception.values = event.exception.values.map((v) => ({
      ...v,
      value: scrubString(v.value),
    }));
  }

  if (event.extra) event.extra = scrubDeep(event.extra) as typeof event.extra;

  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((b) => ({
      ...b,
      message: scrubString(b.message),
      data: scrubDeep(b.data) as Breadcrumb['data'],
    }));
  }

  return event;
};

export const beforeBreadcrumb = (breadcrumb: Breadcrumb): Breadcrumb | null => {
  // Drop the breadcrumb types that exist to record what the user typed or
  // fetched; neither is worth a PII risk on this app.
  if (breadcrumb.category === 'console') return null;
  if (breadcrumb.category === 'ui.input') return null;
  if (breadcrumb.data?.url) breadcrumb.data.url = String(breadcrumb.data.url).split('?')[0];
  return breadcrumb;
};

/**
 * The DSN, or undefined when unset.
 *
 * A Sentry DSN is not a secret -- it is designed to sit in a client bundle --
 * so the NEXT_PUBLIC_ prefix is correct rather than a leak. It is read through
 * a full literal reference so Next's build-time inlining can find it.
 */
export const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

/**
 * Options shared by all three runtimes.
 *
 * `enabled` rather than an early return: with the DSN unset the client is
 * disabled and sends nothing, but the init call still runs, so the SDK stays
 * referenced and cannot be tree-shaken out of the build. That keeps two
 * signals distinguishable in a deployed bundle -- "the wiring shipped" and
 * "the DSN was set" -- instead of collapsing both into an absent SDK.
 */
export const sharedOptions = {
  dsn: SENTRY_DSN || undefined,
  enabled: Boolean(SENTRY_DSN),
  // VERCEL_ENV separates preview from production; NODE_ENV calls both
  // "production" and would file preview noise against real incidents.
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV,
  // No automatic PII: no IP address, no cookies, no request bodies.
  sendDefaultPii: false,
  // Errors only. No session replay and no performance tracing -- both would
  // capture the contents of a staff member's screen, and this screen shows
  // the whole book of business.
  tracesSampleRate: 0,
  beforeSend,
  beforeBreadcrumb,
};
