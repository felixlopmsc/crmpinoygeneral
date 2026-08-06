'use client';

import { useEffect, useRef, useState, type ElementType, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface RevealProps {
  children: ReactNode;
  /** Stagger offset in ms. Prefer `staggerDelay(i)` so chains stay capped. */
  delay?: number;
  className?: string;
  as?: ElementType;
  id?: string;
}

/**
 * Index-based stagger with a ceiling. Past the fourth sibling the offset stops
 * growing: a delay only earns its keep while the reader can still perceive it
 * as rhythm, and an uncapped `i * n` grows with the array until it reads as lag.
 */
export function staggerDelay(index: number, step = 45) {
  return Math.min(index, 3) * step;
}

// Scroll-triggered entrance for marketing sections. Fires once, slightly before
// the element is fully in view, so the motion has finished by the time the
// reader arrives — re-animating on every scroll-past is irritating.
//
// The initial hidden state is rendered server-side (so there is no flash of
// positioned content), which means it depends on JS. The <noscript> block in
// app/page.tsx forces everything visible when JS is unavailable.
//
// Movement is opacity + translate only: both are GPU-composited, and
// prefers-reduced-motion drops the translate while keeping the fade, because
// reduced motion means gentler, not none. "Gentler" also means shorter: the
// reduced-motion path shortens the fade and drops the stagger entirely, since
// a delay with no movement to justify it is just waiting.
export default function Reveal({
  children,
  delay = 0,
  className,
  as: Tag = 'div',
  id,
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);
  const [reduced, setReduced] = useState(false);

  // transitionDelay has to be an inline style (it is per-instance), and inline
  // styles outrank the motion-reduce: variant — so the reduced-motion decision
  // is made here in JS rather than in a class.
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(query.matches);

    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // Guard for older browsers: show immediately rather than never.
    if (typeof IntersectionObserver === 'undefined') {
      setShown(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      // Positive bottom margin grows the observation box past the viewport's
      // bottom edge, so the element triggers 120px *before* it scrolls into
      // view and has settled by the time it is read. A negative value here
      // would delay the trigger instead.
      { rootMargin: '0px 0px 120px 0px', threshold: 0 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const effectiveDelay = reduced ? 0 : delay;

  return (
    <Tag
      ref={ref as never}
      id={id}
      data-reveal
      data-shown={shown ? '' : undefined}
      style={effectiveDelay ? { transitionDelay: `${effectiveDelay}ms` } : undefined}
      className={cn(
        'transition-[opacity,transform] ease-out-strong',
        reduced ? 'duration-150' : 'duration-[400ms]',
        shown
          ? 'opacity-100 motion-safe:translate-y-0'
          : 'opacity-0 motion-safe:translate-y-3',
        className
      )}
    >
      {children}
    </Tag>
  );
}
