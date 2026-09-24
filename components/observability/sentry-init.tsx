'use client';

import { useEffect } from 'react';

/**
 * Loads the browser Sentry init once the app has hydrated.
 *
 * With withSentryConfig gone from next.config.js nothing injects
 * sentry.client.config.ts into the client bundle, so this component pulls it
 * in. The import is dynamic and inside an effect on purpose: a 'use client'
 * module is also evaluated during server rendering, and a top-level import
 * would run the browser init on the node runtime alongside instrumentation.ts.
 * Cost of the deferral: an error thrown before hydration is not reported.
 */
export default function SentryInit() {
  useEffect(() => {
    import('../../sentry.client.config');
  }, []);
  return null;
}
