'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

/**
 * Error boundary for everything rendered under the root layout.
 *
 * This is deliberately `error.tsx` and not `global-error.tsx`. A root
 * `global-error` file triggers a React Server Components bundler bug on this
 * Next version (13.5.11): the client reference manifest for pages inside a
 * route group comes out missing its error-boundary entry, and every page
 * under app/(dashboard) then fails to prerender with
 *
 *   Could not find the module ".../client/components/error-boundary.js#"
 *   in the React Client Manifest
 *
 * See vercel/next.js#59053 and #56259 -- present from 13.5.3 onward, and it
 * fires during static generation only, so `next dev` looks fine.
 *
 * What this costs: `global-error` also covers a throw inside the root layout
 * itself, and this does not. Everything below the root layout -- which is all
 * of app/(dashboard), i.e. every screen staff actually use -- is covered.
 *
 * No error text is shown: the message can carry a client's data, and the
 * person seeing this needs a way forward rather than a stack trace.
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div
      style={{
        fontFamily: 'system-ui, sans-serif',
        display: 'flex',
        minHeight: '60vh',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: '28rem' }}>
        <h1 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>Something went wrong</h1>
        <p style={{ color: '#555', marginBottom: '1.5rem', lineHeight: 1.5 }}>
          The page failed to load. Trying again usually works; if it does not, reload the app.
        </p>
        <button
          onClick={() => reset()}
          style={{
            background: '#1e3a5f',
            color: 'white',
            border: 0,
            borderRadius: '0.5rem',
            padding: '0.625rem 1.25rem',
            fontSize: '1rem',
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </div>
    </div>
  );
}
