'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { formatDateTime, formatPhone } from '@/lib/format';
import type { DemoRequest } from '@/lib/types';
import { DEMO_REQUEST_STATUSES } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { toast } from 'sonner';
import {
  Filter,
  Mail,
  Phone,
  TriangleAlert as AlertTriangle,
  RefreshCw,
  Inbox,
  Building2,
  Users,
} from 'lucide-react';

type FilterKey = 'all' | 'New' | 'Contacted' | 'Demoed' | 'Won' | 'Lost';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'New', label: 'New' },
  { key: 'Contacted', label: 'Contacted' },
  { key: 'Demoed', label: 'Demoed' },
  { key: 'Won', label: 'Won' },
  { key: 'Lost', label: 'Lost' },
];

const statusColors: Record<string, string> = {
  New: 'bg-blue-100 text-blue-700',
  Contacted: 'bg-amber-100 text-amber-700',
  Demoed: 'bg-cyan-100 text-cyan-700',
  Won: 'bg-emerald-100 text-emerald-700',
  Lost: 'bg-gray-100 text-gray-700',
};

const interestLabels: Record<string, string> = {
  demo: 'Live demo',
  pricing: 'Pricing',
  general: 'General',
};

function DrawerSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">{title}</p>
      <div className="text-sm">{children}</div>
    </div>
  );
}

function KeyValueRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-0.5">
      <span className="text-gray-500 shrink-0">{label}</span>
      <span className="text-gray-800 text-right break-words">{value}</span>
    </div>
  );
}

export default function DemoRequestsPage() {
  const [requests, setRequests] = useState<DemoRequest[]>([]);
  const [counts, setCounts] = useState<Record<FilterKey, number>>({ all: 0, New: 0, Contacted: 0, Demoed: 0, Won: 0, Lost: 0 });
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState<DemoRequest | null>(null);
  const [notesDraft, setNotesDraft] = useState('');

  const loadCounts = useCallback(async () => {
    const base = () => supabase.from('demo_requests').select('id', { count: 'exact', head: true });
    const [allRes, newRes, contactedRes, demoedRes, wonRes, lostRes] = await Promise.all([
      base(),
      base().eq('status', 'New'),
      base().eq('status', 'Contacted'),
      base().eq('status', 'Demoed'),
      base().eq('status', 'Won'),
      base().eq('status', 'Lost'),
    ]);
    setCounts({
      all: allRes.count || 0,
      New: newRes.count || 0,
      Contacted: contactedRes.count || 0,
      Demoed: demoedRes.count || 0,
      Won: wonRes.count || 0,
      Lost: lostRes.count || 0,
    });
  }, []);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError(false);
    let query = supabase
      .from('demo_requests')
      .select('*')
      .order('created_at', { ascending: false });
    if (activeFilter !== 'all') query = query.eq('status', activeFilter);

    const { data, error: err } = await query.limit(200);
    if (err) {
      setError(true);
      setLoading(false);
      return;
    }
    setRequests((data as unknown as DemoRequest[]) || []);
    setLoading(false);
  }, [activeFilter]);

  useEffect(() => { loadCounts(); }, [loadCounts]);
  useEffect(() => { loadRequests(); }, [loadRequests]);

  useEffect(() => {
    if (!selected) return;
    setNotesDraft(selected.internal_notes || '');
  }, [selected]);

  function patchSelected(patch: Partial<DemoRequest>) {
    setSelected((prev) => (prev ? { ...prev, ...patch } : prev));
    setRequests((rs) => rs.map((r) => (selected && r.id === selected.id ? { ...r, ...patch } : r)));
  }

  async function handleStatusChange(newStatus: string) {
    if (!selected) return;
    const prevStatus = selected.status;
    patchSelected({ status: newStatus as DemoRequest['status'] });

    const { error: updateError } = await supabase
      .from('demo_requests')
      .update({ status: newStatus })
      .eq('id', selected.id);

    if (updateError) {
      patchSelected({ status: prevStatus });
      toast.error('Could not update status — please try again');
      return;
    }
    loadCounts();
  }

  async function saveNotes() {
    if (!selected) return;
    if ((selected.internal_notes || '') === notesDraft) return;
    const { error: err } = await supabase
      .from('demo_requests')
      .update({ internal_notes: notesDraft || null })
      .eq('id', selected.id);
    if (err) {
      toast.error('Could not save notes');
      return;
    }
    patchSelected({ internal_notes: notesDraft || null });
    toast.success('Notes saved');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Demo Requests — {counts.New} new</h1>
        <p className="text-sm text-gray-500">Leads from the public CRM landing page</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-gray-400" />
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setActiveFilter(f.key)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              activeFilter === f.key ? 'bg-[#1B2A4A] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.label} ({counts[f.key]})
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertTriangle className="h-10 w-10 text-amber-500 mb-2" />
              <p className="text-sm font-medium">Couldn&apos;t load demo requests</p>
              <p className="text-xs text-muted-foreground mt-1">Please try again</p>
              <Button size="sm" variant="outline" className="mt-4" onClick={loadRequests}>
                <RefreshCw className="mr-2 h-3.5 w-3.5" /> Retry
              </Button>
            </div>
          ) : loading ? (
            <div className="divide-y">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3.5">
                  <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-28 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                  <div className="h-4 flex-1 animate-pulse rounded bg-muted" />
                  <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
                </div>
              ))}
            </div>
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-xl bg-[#2C3E6B]/10 p-3 mb-3">
                <Inbox className="h-7 w-7 text-[#2C3E6B]" />
              </div>
              <p className="text-sm font-medium text-foreground">No demo requests yet</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-[300px]">
                Submissions from the &ldquo;Book a demo&rdquo; form on the landing page will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50/80">
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Received</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Company</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Email</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Team</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Interest</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {requests.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => setSelected(r)}
                      className="cursor-pointer hover:bg-gray-50/60 transition-colors"
                    >
                      <td
                        className={`px-4 py-3 text-gray-500 whitespace-nowrap border-l-2 ${
                          r.status === 'New' ? 'border-[#B8962E]' : 'border-transparent'
                        }`}
                      >
                        {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900 max-w-[160px] truncate">{r.full_name || '—'}</td>
                      <td className="px-4 py-3 text-gray-600 max-w-[160px] truncate">{r.company || '—'}</td>
                      <td className="px-4 py-3 text-gray-600 max-w-[180px] truncate">{r.work_email || '—'}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.team_size || '—'}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.interest ? (interestLabels[r.interest] || r.interest) : '—'}</td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className={statusColors[r.status] || 'bg-gray-100 text-gray-700'}>
                          {r.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-full p-0 flex flex-col gap-0 md:max-w-[480px]">
          {selected && (
            <>
              <SheetHeader className="border-b px-6 py-4 text-left space-y-1">
                <SheetTitle>{selected.full_name || 'Demo request'}</SheetTitle>
                <p className="text-xs text-muted-foreground">
                  {selected.interest ? (interestLabels[selected.interest] || selected.interest) : 'Demo'} · Received {formatDateTime(selected.created_at)}
                </p>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
                <DrawerSection title="Contact">
                  <div className="space-y-1">
                    <p className="font-medium text-gray-900">{selected.full_name || '—'}</p>
                    {selected.work_email && <p className="text-gray-600 break-all">{selected.work_email}</p>}
                    {selected.phone && <p className="text-gray-600">{formatPhone(selected.phone)}</p>}
                  </div>
                </DrawerSection>

                {(selected.company || selected.team_size) && (
                  <DrawerSection title="Agency">
                    <div className="space-y-0.5">
                      {selected.company && (
                        <div className="flex items-center gap-2 text-gray-800">
                          <Building2 className="h-3.5 w-3.5 text-gray-400" /> {selected.company}
                        </div>
                      )}
                      {selected.team_size && (
                        <div className="flex items-center gap-2 text-gray-800">
                          <Users className="h-3.5 w-3.5 text-gray-400" /> {selected.team_size}
                        </div>
                      )}
                    </div>
                  </DrawerSection>
                )}

                <DrawerSection title="Details">
                  <div className="space-y-0.5">
                    <KeyValueRow label="Interested in" value={selected.interest ? (interestLabels[selected.interest] || selected.interest) : '—'} />
                    <KeyValueRow label="Source" value={selected.source || '—'} />
                  </div>
                </DrawerSection>

                {selected.message && (
                  <DrawerSection title="Message">
                    <p className="whitespace-pre-wrap text-gray-800">{selected.message}</p>
                  </DrawerSection>
                )}

                <DrawerSection title="Internal Notes">
                  <Textarea
                    rows={3}
                    value={notesDraft}
                    onChange={(e) => setNotesDraft(e.target.value)}
                    onBlur={saveNotes}
                    placeholder="Staff-only notes (saved when you click away)"
                  />
                </DrawerSection>
              </div>

              <div className="border-t px-6 py-4 space-y-3">
                <Select value={selected.status} onValueChange={handleStatusChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEMO_REQUEST_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex flex-wrap gap-2">
                  {selected.work_email && (
                    <Button asChild variant="outline" size="sm" className="flex-1">
                      <a href={`mailto:${selected.work_email}`}>
                        <Mail className="mr-2 h-3.5 w-3.5" /> Email
                      </a>
                    </Button>
                  )}
                  {selected.phone && (
                    <Button asChild variant="outline" size="sm" className="flex-1">
                      <a href={`tel:${selected.phone}`}>
                        <Phone className="mr-2 h-3.5 w-3.5" /> Call
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
