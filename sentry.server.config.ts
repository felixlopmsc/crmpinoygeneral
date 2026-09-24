// Node runtime (server components, route handlers, server actions).
import * as Sentry from '@sentry/nextjs';
import { sharedOptions } from '@/lib/observability/scrub';

Sentry.init(sharedOptions);
