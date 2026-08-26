'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { quoteRequestInboxScope } from '@/lib/scopes';

export function useNewQuoteRequestsCount() {
  const pathname = usePathname();
  const [count, setCount] = useState(0);

  const loadCount = useCallback(async () => {
    // Same scope as the inbox list — see lib/scopes.ts. Writing the
    // predicate here instead is what made this badge read 9 against a list
    // of 0.
    const { count: c } = await quoteRequestInboxScope(
      supabase.from('quote_requests').select('id', { count: 'exact', head: true }),
    ).eq('status', 'New');
    setCount(c || 0);
  }, []);

  useEffect(() => {
    loadCount();
  }, [pathname, loadCount]);

  return count;
}
