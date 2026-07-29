'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export function useNewDemoRequestsCount() {
  const pathname = usePathname();
  const [count, setCount] = useState(0);

  const loadCount = useCallback(async () => {
    const { count: c } = await supabase
      .from('demo_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'New');
    setCount(c || 0);
  }, []);

  useEffect(() => {
    loadCount();
  }, [pathname, loadCount]);

  return count;
}
