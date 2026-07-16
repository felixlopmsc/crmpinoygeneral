'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface ActivePremiumTotalState {
  total: number | null;
  loading: boolean;
  error: boolean;
}

export function useActivePremiumTotal() {
  const [state, setState] = useState<ActivePremiumTotalState>({
    total: null,
    loading: true,
    error: false,
  });

  useEffect(() => {
    loadTotal();
  }, []);

  async function loadTotal() {
    const { data, error } = await supabase.rpc('get_active_premium_total');
    if (error) {
      setState({ total: null, loading: false, error: true });
    } else {
      setState({ total: data as number, loading: false, error: false });
    }
  }

  return { ...state, reload: loadTotal };
}
