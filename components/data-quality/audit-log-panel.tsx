'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, ScrollText } from 'lucide-react';

interface AuditRow {
  id: number;
  run_date: string;
  action: string | null;
  affected_count: number | null;
  target_table: string | null;
  notes: string | null;
  actor: string | null;
  actor_name?: string | null;
}

const actionLabels: Record<string, string> = {
  merge_clients: 'Client merge',
  carrier_normalize: 'Carrier normalize',
  name_fix: 'Name fix',
};

export function AuditLogPanel({ refreshKey }: { refreshKey: number }) {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('audit_log')
      .select('id, run_date, action, affected_count, target_table, notes, actor')
      .in('action', ['merge_clients', 'carrier_normalize', 'name_fix'])
      .order('run_date', { ascending: false })
      .limit(50);

    const list = ((data as any[]) || []) as AuditRow[];
    const actorIds = Array.from(new Set(list.map((r) => r.actor).filter(Boolean))) as string[];
    let names: Record<string, string> = {};
    if (actorIds.length > 0) {
      const { data: users } = await supabase.from('users').select('id, full_name').in('id', actorIds);
      names = Object.fromEntries(((users as any[]) || []).map((u) => [u.id, u.full_name]));
    }
    setRows(list.map((r) => ({ ...r, actor_name: r.actor ? names[r.actor] ?? null : null })));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <ScrollText className="h-4 w-4 text-[#2C3E6B]" />
          Audit Log
        </CardTitle>
        <Button variant="ghost" size="sm" className="text-xs" onClick={load}>
          <RefreshCw className="mr-1 h-3.5 w-3.5" /> Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No data-quality actions logged yet.</p>
        ) : (
          <div className="divide-y">
            {rows.map((r) => (
              <div key={r.id} className="flex items-start gap-3 py-2.5">
                <Badge variant="secondary" className="mt-0.5 shrink-0 bg-[#2C3E6B]/10 text-[#2C3E6B]">
                  {r.action ? actionLabels[r.action] || r.action : 'Action'}
                </Badge>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-800 break-words">{r.notes}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {r.affected_count != null ? `${r.affected_count} affected · ` : ''}
                    {r.actor_name ? `${r.actor_name} · ` : ''}
                    {formatDistanceToNow(new Date(r.run_date), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
