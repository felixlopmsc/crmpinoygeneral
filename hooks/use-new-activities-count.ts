'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { ACTIVITIES_SEEN_EVENT, getActivitiesSeenAt } from '@/lib/activity-seen';

// Activities logged by someone else since this viewer last opened the feed.
// Own entries are excluded the way Slack never marks your own message
// unread: you already know about it.
export function useNewActivitiesCount() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  const loadCount = useCallback(async () => {
    if (!user?.id) { setCount(0); return; }
    const { count: c } = await supabase
      .from('activities')
      .select('id', { count: 'exact', head: true })
      .gt('created_at', getActivitiesSeenAt(user.id))
      .or(`created_by.is.null,created_by.neq.${user.id}`);
    setCount(c || 0);
  }, [user?.id]);

  useEffect(() => {
    loadCount();
  }, [pathname, loadCount]);

  useEffect(() => {
    window.addEventListener(ACTIVITIES_SEEN_EVENT, loadCount);
    return () => window.removeEventListener(ACTIVITIES_SEEN_EVENT, loadCount);
  }, [loadCount]);

  return count;
}
