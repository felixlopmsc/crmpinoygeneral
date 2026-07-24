'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export function useNewQuoteRequestsCount() {
  const pathname = usePathname();
  const [count, setCount] = useState(0);

  const loadCount = useCallback(async () => {
    const { count: c } = await supabase
      .from('quote_requests')
      .select('id', { count: 'exact', head: true })
      .is('deleted_at', null)
      .eq('status', 'New');
    setCount(c || 0);
  }, []);

  useEffect(() => {
    loadCount();
  }, [pathname, loadCount]);

  return count;
}
