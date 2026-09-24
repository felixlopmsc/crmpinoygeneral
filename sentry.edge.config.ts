// Edge runtime. middleware.ts runs here, so without this file the auth
// middleware is the one uninstrumented path in the app.
import * as Sentry from '@sentry/nextjs';
import { sharedOptions } from '@/lib/observability/scrub';

Sentry.init(sharedOptions);
