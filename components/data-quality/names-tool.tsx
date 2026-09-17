'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RefreshCw, ArrowRight, TriangleAlert as AlertTriangle, Check } from 'lucide-react';
import { friendlyError } from '@/lib/errors';

interface NameRow {
  id: string;
  first_name: string;
  last_name: string;
  status: string;
}

// Proposes a corrected name for a row whose first_name contains the last_name.
// Strategy: drop a trailing repeat of last_name from first_name; if the whole
// first_name equals the last_name, keep just the last_name.
function proposeFix(first: string, last: string): { first: string; last: string } {
  const f = (first || '').replace(/\s+/g, ' ').trim();
  const l = (last || '').replace(/\s+/g, ' ').trim();
  if (!l) return { first: f, last: l };
  const lowerF = f.toLowerCase();
  const lowerL = l.toLowerCase();
  if (lowerF === lowerL) return { first: f, last: l };
  // Remove a trailing occurrence of the last name from the first name.
  if (lowerF.endsWith(' ' + lowerL)) {
    const trimmed = f.slice(0, f.length - l.length).replace(/[\s&,-]+$/, '').trim();
    return { first: trimmed || f, last: l };
  }
  // Remove any internal duplicated last-name token run, collapse spaces.
  const re = new RegExp('(^|\\s)' + lowerL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(\\s|$)', 'i');
  if (re.test(f)) {
    const stripped = f.replace(re, ' ').replace(/\s+/g, ' ').trim();
    return { first: stripped || f, last: l };
  }
  return { first: f, last: l };
}

export function NamesTool({ onApplied }: { onApplied: () => void }) {
  const [rows, setRows] = useState<NameRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, { first: string; last: string }>>({});
  const [done, setDone] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    // Server-side detection (browser row cap would undercount).
    const { data, error: err } = await supabase.rpc('dq_doubled_names');
    if (err) {
      setError(true);
      setLoading(false);
      return;
    }
    const candidates = ((data as any[]) || []) as NameRow[];
    setRows(candidates);
    setDrafts(Object.fromEntries(candidates.map((c) => [c.id, proposeFix(c.first_name, c.last_name)])));
    setDone(new Set());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => rows.filter((r) => !done.has(r.id)), [rows, done]);

  async function applyFix(row: NameRow) {
    const d = drafts[row.id];
    if (!d || !d.first.trim()) {
      toast.error('First name cannot be empty');
      return;
    }
    setApplyingId(row.id);
    const { error: err } = await supabase.rpc('apply_name_fix', {
      p_id: row.id,
      p_first: d.first.trim(),
      p_last: d.last.trim(),
    });
    if (err) {
      toast.error(friendlyError(err));
      setApplyingId(null);
      return;
    }
    toast.success('Name updated', { action: { label: 'View audit log', onClick: onApplied } });
    setDone((s) => new Set(s).add(row.id));
    setApplyingId(null);
    onApplied();
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="text-sm text-muted-foreground">
            Rows where the first name repeats the last name. Review the proposed correction, edit if needed, then Apply.
          </p>
          <span className="shrink-0 text-xs text-muted-foreground">{visible.length} to review</span>
        </div>

        {error ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertTriangle className="h-10 w-10 text-amber-500 mb-2" />
            <p className="text-sm font-medium">Couldn&apos;t load clients</p>
            <Button size="sm" variant="outline" className="mt-4" onClick={load}>
              <RefreshCw className="mr-2 h-3.5 w-3.5" /> Retry
            </Button>
          </div>
        ) : loading ? (
          <div className="divide-y">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-14 animate-pulse bg-muted/40" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Check className="h-10 w-10 text-emerald-500 mb-2" />
            <p className="text-sm font-medium">Nothing to review</p>
            <p className="text-xs text-muted-foreground mt-1">No doubled-name rows remain.</p>
          </div>
        ) : (
          <div className="divide-y">
            {visible.map((row) => {
              const d = drafts[row.id] || { first: row.first_name, last: row.last_name };
              return (
                <div key={row.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-[160px] flex-1">
                    <p className="text-xs uppercase tracking-wide text-gray-400">Current</p>
                    <p className="text-sm text-gray-700">{row.first_name} <span className="text-gray-400">/</span> {row.last_name}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-gray-300" />
                  <div className="flex items-center gap-2">
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-gray-400">First</p>
                      <Input
                        value={d.first}
                        onChange={(e) => setDrafts((m) => ({ ...m, [row.id]: { ...d, first: e.target.value } }))}
                        className="h-8 w-40 text-sm"
                      />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-gray-400">Last</p>
                      <Input
                        value={d.last}
                        onChange={(e) => setDrafts((m) => ({ ...m, [row.id]: { ...d, last: e.target.value } }))}
                        className="h-8 w-40 text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setDone((s) => new Set(s).add(row.id))}>
                      Skip
                    </Button>
                    <Button
                      size="sm"
                      className="bg-[#1B2A4A] hover:bg-[#2C3E6B]"
                      disabled={applyingId === row.id || !d.first.trim()}
                      onClick={() => applyFix(row)}
                    >
                      {applyingId === row.id ? 'Applying...' : 'Apply'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
