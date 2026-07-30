'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { demoHref } from '@/lib/supabase';

// "Try the demo" links must resolve per-hostname (absolute demo.agilams.com on
// the real domains, relative /demo on previews), and the landing page is a
// Server Component that can't know the hostname. The href starts as /demo on
// the server and is corrected after hydration via state — not computed inline —
// so the server and first client render agree and React has no hydration
// mismatch to warn about.
export default function DemoLink({
  children,
  className,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  const [href, setHref] = useState('/demo');

  useEffect(() => {
    setHref(demoHref());
  }, []);

  return (
    <Link href={href} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}
