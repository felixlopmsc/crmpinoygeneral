'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Search, RefreshCw, ArrowRight, TriangleAlert as AlertTriangle } from 'lucide-react';
import { friendlyError } from '@/lib/errors';

interface CarrierRow {
  carrier: string;
  count: number;
}

export function CarriersTool({ onApplied }: { onApplied: () => void }) {
  const [rows, setRows] = useState<CarrierRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [pending, setPending] = useState<CarrierRow | null>(null);
  const [applying, setApplying] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    // Server-side DISTINCT + counts (browser row cap would undercount).
    const { data, error: err } = await supabase.rpc('dq_carrier_variants');
    if (err) {
      setError(true);
      setLoading(false);
      return;
    }
    const list = ((data as any[]) || []).map((r) => ({ carrier: r.carrier as string, count: r.count as number }));
    setRows(list);
    setDrafts(Object.fromEntries(list.map((r) => [r.carrier, r.carrier])));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.carrier.toLowerCase().includes(q));
  }, [rows, search]);

  async function applyMapping(row: CarrierRow) {
    const target = (drafts[row.carrier] ?? '').trim();
    if (!target) {
      toast.error('Target carrier cannot be empty');
      return;
    }
    setApplying(true);
    const { data, error: err } = await supabase.rpc('apply_carrier_mapping', {
      p_from: row.carrier,
      p_to: target,
    });
    if (err) {
      toast.error(friendlyError(err));
      setApplying(false);
      setPending(null);
      return;
    }
    const affected = (data as any)?.affected ?? 0;
    toast.success(`Updated ${affected} ${affected === 1 ? 'policy' : 'policies'}`, {
      action: { label: 'View audit log', onClick: onApplied },
    });
    setApplying(false);
    setPending(null);
    onApplied();
    load();
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search carriers..." className="pl-9" />
          </div>
          <span className="text-xs text-muted-foreground">{rows.length} distinct carriers</span>
        </div>

        {error ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertTriangle className="h-10 w-10 text-amber-500 mb-2" />
            <p className="text-sm font-medium">Couldn&apos;t load carriers</p>
            <Button size="sm" variant="outline" className="mt-4" onClick={load}>
              <RefreshCw className="mr-2 h-3.5 w-3.5" /> Retry
            </Button>
          </div>
        ) : loading ? (
          <div className="divide-y">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 animate-pulse bg-muted/40" />
            ))}
          </div>
        ) : (
          <div className="divide-y">
            {filtered.map((row) => {
              const draft = drafts[row.carrier] ?? '';
              const changed = draft.trim() !== '' && draft.trim() !== row.carrier;
              return (
                <div key={row.carrier} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                  <div className="flex min-w-[180px] flex-1 items-center gap-2">
                    <span className="text-sm text-gray-800">{row.carrier}</span>
                    <Badge variant="secondary" className="text-[10px]">{row.count}</Badge>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-gray-300" />
                  <Input
                    value={draft}
                    onChange={(e) => setDrafts((d) => ({ ...d, [row.carrier]: e.target.value }))}
                    className={`h-8 max-w-xs flex-1 text-sm ${changed ? 'border-[#B8962E] bg-amber-50/40' : ''}`}
                  />
                  <Button
                    size="sm"
                    variant={changed ? 'default' : 'outline'}
                    disabled={!changed}
                    className={changed ? 'bg-[#1B2A4A] hover:bg-[#2C3E6B]' : ''}
                    onClick={() => setPending(row)}
                  >
                    Apply
                  </Button>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <p className="py-10 text-center text-sm text-muted-foreground">No carriers match &ldquo;{search}&rdquo;.</p>
            )}
          </div>
        )}
      </CardContent>

      <AlertDialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Normalize carrier?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <div className="rounded-lg border bg-muted/40 p-3">
                  <span className="text-gray-500 line-through">{pending?.carrier}</span>
                  <ArrowRight className="mx-2 inline h-3.5 w-3.5 text-gray-400" />
                  <span className="font-medium text-emerald-700">{pending ? (drafts[pending.carrier] ?? '').trim() : ''}</span>
                </div>
                <p><span className="font-semibold text-gray-900">{pending?.count}</span> {pending?.count === 1 ? 'policy' : 'policies'} will be updated. This writes to the audit log.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={applying}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={applying}
              className="bg-[#1B2A4A] hover:bg-[#2C3E6B]"
              onClick={(e) => { e.preventDefault(); if (pending) applyMapping(pending); }}
            >
              {applying ? 'Applying...' : 'Apply mapping'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
