'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface ActivePolicyCountState {
  count: number | null;
  loading: boolean;
  error: boolean;
}

export function useActivePolicyCount() {
  const [state, setState] = useState<ActivePolicyCountState>({
    count: null,
    loading: true,
    error: false,
  });

  useEffect(() => {
    loadCount();
  }, []);

  async function loadCount() {
    const { data, error } = await supabase.rpc('get_active_policy_count');
    if (error) {
      setState({ count: null, loading: false, error: true });
    } else {
      setState({ count: data as number, loading: false, error: false });
    }
  }

  return { ...state, reload: loadCount };
}
