// Next.js loads this once per server/edge runtime at boot.
// The client runtime is initialised by sentry.client.config.ts instead.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}
