/**
 * PII scrubbing shared by the client, server and edge Sentry configs.
 *
 * This app is the staff CRM for 2,800+ insurance clients: names, addresses,
 * dates of birth, policy numbers and invite tokens all pass through it. An
 * unscrubbed error report is a PII leak with extra steps, so the scrubbing
 * runs on every event in every runtime rather than being a per-config option
 * someone can forget to copy into the third file.
 *
 * Deliberately mirrors the client portal's src/observability/errorReporting.js
 * so the same data is redacted the same way in both apps.
 */

// Order matters -- the token pattern must run before the generic long-string
// rules so an invite token is not partially matched first.
const REDACTIONS: Array<[RegExp, string]> = [
  // invite tokens: url-safe base64, as minted by create_client_invite
  [/\b[A-Za-z0-9_-]{40,}\b/g, '[redacted:token]'],
  [/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[redacted:email]'],
  // phone numbers, formatted or not
  [/(\+?\d[\d\s().-]{8,}\d)/g, '[redacted:phone]'],
  // uuids -- client, policy and profile ids all travel as uuids
  [/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '[redacted:id]'],
];

export const scrub = (value: unknown): unknown => {
  if (typeof value !== 'string') return value;
  return REDACTIONS.reduce<string>(
    (acc, [pattern, replacement]) => acc.replace(pattern, replacement),
    value
  );
};

const scrubString = (value?: string): string | undefined =>
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

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Strip identity and payloads from an event before it leaves the process. */
export const beforeSend = (event: any) => {
  // Never identify the user. An error is actionable without knowing which
  // staff member or which insurance customer hit it.
  delete event.user;

  if (event.request) {
    delete event.request.cookies;
    delete event.request.headers;
    delete event.request.data; // no request bodies
    // A query string can carry an invite token -- keep the path only.
    if (typeof event.request.url === 'string') {
      event.request.url = event.request.url.split('?')[0];
    }
  }

  if (event.message) event.message = scrubString(event.message);

  if (event.exception?.values) {
    event.exception.values = event.exception.values.map((v: any) => ({
      ...v,
      value: scrubString(v.value),
    }));
  }

  if (event.extra) event.extra = scrubDeep(event.extra);

  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((b: any) => ({
      ...b,
      message: scrubString(b.message),
      data: scrubDeep(b.data),
    }));
  }

  return event;
};

/** Drop the breadcrumb types that exist to record what a user typed or fetched. */
export const beforeBreadcrumb = (breadcrumb: any) => {
  if (breadcrumb.category === 'console') return null;
  if (breadcrumb.category === 'ui.input') return null;
  if (breadcrumb.data?.url) {
    breadcrumb.data.url = String(breadcrumb.data.url).split('?')[0];
  }
  return breadcrumb;
};

/** Options every runtime shares. */
export const sharedSentryOptions = {
  // No automatic PII: no IP address, no cookies, no request bodies.
  sendDefaultPii: false,
  // Errors only. No session replay and no performance tracing -- both would
  // capture the contents of a staff member's screen, which is client data.
  tracesSampleRate: 0,
  beforeSend,
  beforeBreadcrumb,
};
