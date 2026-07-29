'use client';

import { useEffect, useRef, useState, type ElementType, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface RevealProps {
  children: ReactNode;
  /** Stagger offset in ms. Keep chains short — 30-80ms between siblings. */
  delay?: number;
  className?: string;
  as?: ElementType;
  id?: string;
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
// reduced motion means gentler, not none.
export default function Reveal({
  children,
  delay = 0,
  className,
  as: Tag = 'div',
  id,
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);

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
      { rootMargin: '0px 0px -100px 0px', threshold: 0 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as never}
      id={id}
      data-reveal
      data-shown={shown ? '' : undefined}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={cn(
        'transition-[opacity,transform] duration-[600ms] ease-out-strong',
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
