'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface ClientCountsState {
  clients: number | null;
  prospects: number | null;
  loading: boolean;
  error: boolean;
}

export function useClientCounts() {
  const [state, setState] = useState<ClientCountsState>({
    clients: null,
    prospects: null,
    loading: true,
    error: false,
  });

  const loadCounts = useCallback(async () => {
    const [clientsRes, prospectsRes] = await Promise.all([
      supabase.from('clients').select('id', { count: 'exact', head: true }).neq('status', 'Lead'),
      supabase.from('clients').select('id', { count: 'exact', head: true }).eq('status', 'Lead'),
    ]);

    if (clientsRes.error || prospectsRes.error) {
      setState({ clients: null, prospects: null, loading: false, error: true });
      return;
    }

    setState({
      clients: clientsRes.count ?? 0,
      prospects: prospectsRes.count ?? 0,
      loading: false,
      error: false,
    });
  }, []);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  return { ...state, reload: loadCounts };
}
