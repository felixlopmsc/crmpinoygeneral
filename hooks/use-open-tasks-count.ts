'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { isoEndOfToday, tasksNeedingAttentionScope } from '@/lib/scopes';

// Fired by the Tasks page after any create / complete / reopen / remove so
// the sidebar badge moves without a navigation. Same idea as ClickUp's
// sidebar counts: the number is live, not "as of page load".
export const TASKS_CHANGED_EVENT = 'pgi:tasks-changed';

export function useOpenTasksCount() {
  const pathname = usePathname();
  const [count, setCount] = useState(0);

  const loadCount = useCallback(async () => {
    const { count: c } = await tasksNeedingAttentionScope(
      supabase.from('tasks').select('id', { count: 'exact', head: true }),
      isoEndOfToday(),
    );
    setCount(c || 0);
  }, []);

  useEffect(() => {
    loadCount();
  }, [pathname, loadCount]);

  useEffect(() => {
    window.addEventListener(TASKS_CHANGED_EVENT, loadCount);
    return () => window.removeEventListener(TASKS_CHANGED_EVENT, loadCount);
  }, [loadCount]);

  return count;
}
