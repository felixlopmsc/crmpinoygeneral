'use client';

import Link from 'next/link';
import { loginHref } from '@/lib/supabase';

// The landing page is a Server Component, so it can't know the hostname at
// render time. This keeps the footer's "Log in" consistent with the nav: on the
// demo host it points at the real app rather than the sandbox's own /login.
export default function LoginLink({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link href={loginHref()} className={className}>
      {children}
    </Link>
  );
}
