'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft, RefreshCw, Search, TriangleAlert as AlertTriangle, Mail, Phone, Users, ChevronRight,
} from 'lucide-react';

interface LightClient {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  updated_at: string | null;
}
interface FullClient extends LightClient {
  phone_2: string | null;
  date_of_birth: string | null;
  address_street: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
  source: string | null;
  tags: string[] | null;
  notes: string | null;
  created_at: string | null;
}
interface Group {
  norm: string;
  ids: string[];
  statuses: string[];
  count: number;
  sameEmail: boolean;
  samePhone: boolean;
}

const EDITABLE_FIELDS: { key: keyof FullClient; label: string }[] = [
  { key: 'first_name', label: 'First Name' },
  { key: 'last_name', label: 'Last Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'phone_2', label: 'Phone 2' },
  { key: 'date_of_birth', label: 'Date of Birth' },
  { key: 'address_street', label: 'Street' },
  { key: 'address_city', label: 'City' },
  { key: 'address_state', label: 'State' },
  { key: 'address_zip', label: 'ZIP' },
  { key: 'source', label: 'Source' },
  { key: 'status', label: 'Status' },
];

const val = (v: unknown) => (v === null || v === undefined ? '' : String(v));

// Best survivor: prefer non-Lead, then more complete, then most recently updated.
function pickSurvivor(members: FullClient[]): string {
  const scored = [...members].sort((a, b) => {
    const aLead = a.status === 'Lead' ? 1 : 0;
    const bLead = b.status === 'Lead' ? 1 : 0;
    if (aLead !== bLead) return aLead - bLead;
    const ac = [a.email, a.phone, a.phone_2, a.date_of_birth, a.address_street, a.address_city, a.address_zip, a.source]
      .filter((x) => x && String(x).trim()).length;
    const bc = [b.email, b.phone, b.phone_2, b.date_of_birth, b.address_street, b.address_city, b.address_zip, b.source]
      .filter((x) => x && String(x).trim()).length;
    if (ac !== bc) return bc - ac;
    return new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime();
  });
  return scored[0].id;
}

export function DuplicatesTool({ onApplied }: { onApplied: () => void }) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(40);

  // Detail state
  const [members, setMembers] = useState<FullClient[] | null>(null);
  const [survivorId, setSurvivorId] = useState<string>('');
  const [fieldChoice, setFieldChoice] = useState<Record<string, string>>({});
  const [refCounts, setRefCounts] = useState<Record<string, number> | null>(null);
  const [refTotal, setRefTotal] = useState<number>(0);
  const [confirmText, setConfirmText] = useState('');
  const [applying, setApplying] = useState(false);

  const loadGroups = useCallback(async () => {
    setLoading(true);
    setError(false);
    // Server-side grouping (browser row cap would otherwise undercount).
    const { data, error: err } = await supabase.rpc('dq_duplicate_groups');
    if (err) {
      setError(true);
      setLoading(false);
      return;
    }
    const raw = (data as any[]) || [];
    const gs: Group[] = raw.map((g) => {
      const emails: string[] = g.emails || [];
      const phones: string[] = g.phones || [];
      const ids: string[] = g.ids || [];
      const statuses: string[] = g.statuses || [];
      return {
        norm: g.norm,
        ids,
        statuses,
        count: ids.length,
        sameEmail: emails.length > 0 && new Set(emails).size < emails.length,
        samePhone: phones.length > 0 && new Set(phones.filter((p) => p.length >= 7)).size < phones.filter((p) => p.length >= 7).length,
      };
    });
    // Strong signals first, then larger groups.
    gs.sort((a, b) => {
      const sa = (a.sameEmail ? 2 : 0) + (a.samePhone ? 1 : 0);
      const sb = (b.sameEmail ? 2 : 0) + (b.samePhone ? 1 : 0);
      if (sa !== sb) return sb - sa;
      return b.count - a.count;
    });
    setGroups(gs);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) => g.norm.includes(q));
  }, [groups, search]);

  const openGroup = useCallback(async (g: Group) => {
    setMembers(null);
    setRefCounts(null);
    setConfirmText('');
    const ids = g.ids;
    const { data } = await supabase.from('clients').select('*').in('id', ids);
    const full = ((data as any[]) || []) as FullClient[];
    const survivor = pickSurvivor(full);
    // Default each field to the survivor's value if present, else first non-empty member.
    const choice: Record<string, string> = {};
    for (const f of EDITABLE_FIELDS) {
      const surv = full.find((m) => m.id === survivor);
      if (surv && val(surv[f.key]).trim()) {
        choice[f.key] = survivor;
      } else {
        const donor = full.find((m) => val(m[f.key]).trim());
        choice[f.key] = donor ? donor.id : survivor;
      }
    }
    setSurvivorId(survivor);
    setFieldChoice(choice);
    setMembers(full);

    // Dry-run FK counts for the would-be losers.
    const loserIds = ids.filter((id) => id !== survivor);
    const { data: rc } = await supabase.rpc('client_ref_counts', { p_ids: loserIds });
    const counts = (rc as Record<string, number>) || {};
    setRefCounts(counts);
    setRefTotal(Object.values(counts).reduce((s, n) => s + (n || 0), 0));
  }, []);

  // Recompute field defaults when survivor changes (keep explicit user picks? simpler: reset to new survivor-preferred defaults).
  function changeSurvivor(id: string) {
    if (!members) return;
    setSurvivorId(id);
    const choice: Record<string, string> = { ...fieldChoice };
    for (const f of EDITABLE_FIELDS) {
      const surv = members.find((m) => m.id === id);
      if (surv && val(surv[f.key]).trim()) choice[f.key] = id;
    }
    setFieldChoice(choice);
    const loserIds = members.map((m) => m.id).filter((x) => x !== id);
    supabase.rpc('client_ref_counts', { p_ids: loserIds }).then(({ data }) => {
      const counts = (data as Record<string, number>) || {};
      setRefCounts(counts);
      setRefTotal(Object.values(counts).reduce((s, n) => s + (n || 0), 0));
    });
    setConfirmText('');
  }

  const loserIds = useMemo(() => (members ? members.map((m) => m.id).filter((id) => id !== survivorId) : []), [members, survivorId]);
  const affectedRecords = refTotal + loserIds.length;
  const needsConfirm = affectedRecords > 10;

  function chosenValue(field: keyof FullClient): string {
    if (!members) return '';
    const m = members.find((x) => x.id === fieldChoice[field as string]);
    return m ? val(m[field]) : '';
  }
  function isConflict(field: keyof FullClient): boolean {
    if (!members) return false;
    const vals = new Set(members.map((m) => val(m[field]).trim()).filter(Boolean));
    return vals.size > 1;
  }

  async function doMerge() {
    if (!members) return;
    if (loserIds.length === 0) {
      toast.error('Nothing to merge — only one record in this group');
      return;
    }
    if (needsConfirm && confirmText.trim().toUpperCase() !== 'CONFIRM') {
      toast.error('Type CONFIRM to proceed with this merge');
      return;
    }
    setApplying(true);
    const overrides: Record<string, string> = {};
    for (const f of EDITABLE_FIELDS) overrides[f.key as string] = chosenValue(f.key);
    const { data, error: err } = await supabase.rpc('merge_clients', {
      p_survivor: survivorId,
      p_losers: loserIds,
      p_overrides: overrides,
    });
    if (err) {
      toast.error(err.message || 'Merge failed — the group was rolled back');
      setApplying(false);
      return;
    }
    const refs = (data as any)?.refs_repointed ?? 0;
    toast.success(`Merged ${loserIds.length} record(s) · ${refs} references repointed`, {
      action: { label: 'View audit log', onClick: onApplied },
    });
    setApplying(false);
    setMembers(null);
    onApplied();
    loadGroups();
  }

  // ---- Group list view ----
  if (!members) {
    return (
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name..." className="pl-9" />
            </div>
            <span className="text-xs text-muted-foreground">{groups.length} duplicate groups</span>
          </div>

          {error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertTriangle className="h-10 w-10 text-amber-500 mb-2" />
              <p className="text-sm font-medium">Couldn&apos;t load duplicate groups</p>
              <Button size="sm" variant="outline" className="mt-4" onClick={loadGroups}>
                <RefreshCw className="mr-2 h-3.5 w-3.5" /> Retry
              </Button>
            </div>
          ) : loading ? (
            <div className="divide-y">
              {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-14 animate-pulse bg-muted/40" />)}
            </div>
          ) : (
            <>
              <div className="divide-y">
                {filtered.slice(0, limit).map((g) => (
                  <button
                    key={g.norm}
                    onClick={() => openGroup(g)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50/60"
                  >
                    <Users className="h-4 w-4 shrink-0 text-gray-400" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium capitalize text-gray-900">{g.norm}</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                        <Badge variant="secondary" className="text-[10px]">{g.count} records</Badge>
                        {g.sameEmail && (
                          <Badge className="gap-1 bg-emerald-100 text-[10px] text-emerald-700 hover:bg-emerald-100">
                            <Mail className="h-2.5 w-2.5" /> same email
                          </Badge>
                        )}
                        {g.samePhone && (
                          <Badge className="gap-1 bg-emerald-100 text-[10px] text-emerald-700 hover:bg-emerald-100">
                            <Phone className="h-2.5 w-2.5" /> same phone
                          </Badge>
                        )}
                        <span className="text-[11px] text-gray-400">
                          {Array.from(new Set(g.statuses)).join(', ')}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" />
                  </button>
                ))}
              </div>
              {filtered.length > limit && (
                <div className="border-t p-3 text-center">
                  <Button variant="outline" size="sm" onClick={() => setLimit((l) => l + 40)}>
                    Load more ({filtered.length - limit} remaining)
                  </Button>
                </div>
              )}
              {filtered.length === 0 && (
                <p className="py-10 text-center text-sm text-muted-foreground">No groups match &ldquo;{search}&rdquo;.</p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  // ---- Group detail / merge view ----
  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <Button variant="ghost" size="sm" onClick={() => setMembers(null)}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Back to groups
          </Button>
          <span className="text-xs text-muted-foreground">{members.length} records · pick the survivor and the winning value for each field</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50/80">
                <th className="px-4 py-2 text-left font-medium text-gray-600">Field</th>
                {members.map((m) => (
                  <th key={m.id} className="px-4 py-2 text-left font-medium text-gray-600">
                    <label className="flex items-center gap-2">
                      <input type="radio" name="survivor" checked={survivorId === m.id} onChange={() => changeSurvivor(m.id)} />
                      <span className="flex items-center gap-1.5">
                        <Badge variant="secondary" className={`text-[10px] ${m.status === 'Lead' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>{m.status}</Badge>
                        {survivorId === m.id && <span className="text-[10px] font-semibold text-emerald-600">SURVIVOR</span>}
                      </span>
                    </label>
                    <p className="mt-0.5 text-[10px] font-normal text-gray-400">
                      updated {m.updated_at ? new Date(m.updated_at).toLocaleDateString() : '—'}
                    </p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {EDITABLE_FIELDS.map((f) => {
                const conflict = isConflict(f.key);
                return (
                  <tr key={f.key as string}>
                    <td className="px-4 py-2 font-medium text-gray-500">
                      {f.label}
                      {conflict && <span className="ml-1 text-[10px] text-[#B8962E]">conflict</span>}
                    </td>
                    {members.map((m) => {
                      const chosen = fieldChoice[f.key as string] === m.id;
                      const value = val(m[f.key]);
                      const hasValue = value.trim() !== '';
                      return (
                        <td
                          key={m.id}
                          className={`px-4 py-2 ${chosen && hasValue ? 'bg-emerald-50' : conflict && hasValue ? 'bg-amber-50/60' : ''}`}
                        >
                          <label className="flex items-start gap-2">
                            <input
                              type="radio"
                              name={`field-${f.key}`}
                              className="mt-0.5"
                              checked={chosen}
                              onChange={() => setFieldChoice((c) => ({ ...c, [f.key as string]: m.id }))}
                            />
                            <span className={hasValue ? 'text-gray-800' : 'text-gray-300'}>{hasValue ? value : '—'}</span>
                          </label>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Dry-run summary */}
        <div className="border-t bg-gray-50/50 px-4 py-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Dry run — what merge will do</p>
          {refCounts === null ? (
            <div className="h-4 w-48 animate-pulse rounded bg-muted" />
          ) : (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
              <span><span className="font-semibold text-gray-900">{loserIds.length}</span> record(s) soft-marked <span className="font-mono">merged</span></span>
              <span><span className="font-semibold text-gray-900">{refTotal}</span> references repointed to survivor</span>
              {Object.entries(refCounts)
                .filter(([, n]) => n > 0)
                .map(([t, n]) => (
                  <span key={t} className="text-gray-500">{t}: {n}</span>
                ))}
            </div>
          )}
        </div>

        {/* Sticky action bar */}
        <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t bg-white px-4 py-3">
          <div className="flex items-center gap-3">
            {needsConfirm && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#8B2D3B]">Affects {affectedRecords} records — type CONFIRM:</span>
                <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="CONFIRM" className="h-8 w-28" />
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setMembers(null)} disabled={applying}>Cancel</Button>
            <Button
              size="sm"
              className="bg-[#1B2A4A] hover:bg-[#2C3E6B]"
              disabled={applying || loserIds.length === 0 || (needsConfirm && confirmText.trim().toUpperCase() !== 'CONFIRM')}
              onClick={doMerge}
            >
              {applying ? 'Merging...' : `Merge ${loserIds.length} into survivor`}
            </Button>
          </div>
        </div>
        {applying && (
          <div className="h-1 w-full overflow-hidden bg-muted">
            <div className="h-full w-full animate-pulse bg-[#B8962E]" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
