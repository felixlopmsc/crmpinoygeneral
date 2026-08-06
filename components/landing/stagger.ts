/**
 * Index-based stagger with a ceiling. Past the fourth sibling the offset stops
 * growing: a delay only earns its keep while the reader can still perceive it
 * as rhythm, and an uncapped `i * n` grows with the array until it reads as lag.
 *
 * Deliberately not in reveal.tsx. That file is a 'use client' module, and a
 * function exported from one cannot be *called* by a Server Component — only
 * rendered as a component or passed as a prop. app/page.tsx is a Server
 * Component, so the helper has to live in a module without the directive.
 */
export function staggerDelay(index: number, step = 45) {
  return Math.min(index, 3) * step;
}
