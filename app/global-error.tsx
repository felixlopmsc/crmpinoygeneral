'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

/**
 * Root error boundary.
 *
 * Without this file React rendering errors in the app router never reach
 * Sentry -- Next swallows them into its own fallback -- so the one class of
 * error most likely to leave a staff member staring at a blank screen would
 * be the one class we never hear about.
 *
 * It replaces the whole document when it renders, hence the html/body tags.
 * No error text is shown: the message can carry a client's data, and the
 * person seeing this needs a way forward rather than a stack trace.
 */
export default function GlobalError({
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
    <html>
      <body
        style={{
          fontFamily: 'system-ui, sans-serif',
          display: 'flex',
          minHeight: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
          margin: 0,
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
      </body>
    </html>
  );
}
