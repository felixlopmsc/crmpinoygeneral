'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { formatDateTime, formatDate, formatPhone, formatCurrency } from '@/lib/format';
import type { QuoteRequest, QuoteRequestDocument } from '@/lib/types';
import { QUOTE_REQUEST_STATUSES } from '@/lib/types';
import { humanizeKey, formatLeafValue, isEmptyObject, resolveCoverageColumn } from '@/lib/quote-format';
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
  UserPlus,
  FileSpreadsheet,
  ExternalLink,
  Link2,
  Paperclip,
} from 'lucide-react';

type FilterKey = 'all' | 'New' | 'Contacted' | 'Quoted' | 'Won' | 'Lost';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'New', label: 'New' },
  { key: 'Contacted', label: 'Contacted' },
  { key: 'Quoted', label: 'Quoted' },
  { key: 'Won', label: 'Won' },
  { key: 'Lost', label: 'Lost' },
];

const statusColors: Record<string, string> = {
  New: 'bg-blue-100 text-blue-700',
  Contacted: 'bg-amber-100 text-amber-700',
  Quoted: 'bg-cyan-100 text-cyan-700',
  Won: 'bg-emerald-100 text-emerald-700',
  Lost: 'bg-gray-100 text-gray-700',
};

interface ClientMatch {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
}

const digitsOnly = (s: string | null | undefined) => (s || '').replace(/\D/g, '');
const escapeLike = (s: string) => s.replace(/([\\%_])/g, '\\$1');

function fullName(q: QuoteRequest): string {
  return [q.first_name, q.last_name].filter(Boolean).join(' ').trim() || '—';
}

function formatEstimate(q: QuoteRequest): string {
  if (q.estimate_low == null || q.estimate_high == null) return '—';
  return `${formatCurrency(Number(q.estimate_low))}–${formatCurrency(Number(q.estimate_high))}/yr`;
}

/* --- Coverage rendering ------------------------------------------------- */

function KeyValueRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-0.5">
      <span className="text-gray-500 shrink-0">{label}</span>
      <span className="text-gray-800 text-right break-words">{value}</span>
    </div>
  );
}

// Recursively renders a jsonb object/array as labelled key/value rows.
// Arrays of objects become numbered sub-groups; nested objects become
// indented sub-groups; leaves render as rows. Empty values are hidden.
function FormDataTree({ data }: { data: unknown }) {
  if (data === null || data === undefined) return null;

  if (Array.isArray(data)) {
    const items = data.filter((el) => !(typeof el === 'object' ? isEmptyObject(el) : formatLeafValue(el) === null));
    if (items.length === 0) return null;
    return (
      <>
        {items.map((el, i) => (
          <div key={i} className="mt-2 first:mt-0">
            {items.length > 1 && (
              <p className="text-[11px] font-medium text-gray-400">#{i + 1}</p>
            )}
            <FormDataTree data={el} />
          </div>
        ))}
      </>
    );
  }

  if (typeof data === 'object') {
    const entries = Object.entries(data as Record<string, unknown>);
    return (
      <>
        {entries.map(([k, v]) => {
          if (v !== null && typeof v === 'object') {
            if (isEmptyObject(v) && !(Array.isArray(v) && v.length)) return null;
            const child = <FormDataTree data={v} />;
            return (
              <div key={k} className="mt-2">
                <p className="text-xs font-medium text-gray-600">{humanizeKey(k)}</p>
                <div className="ml-3 border-l pl-3 border-gray-100">{child}</div>
              </div>
            );
          }
          const leaf = formatLeafValue(v);
          if (leaf === null) return null;
          return <KeyValueRow key={k} label={humanizeKey(k)} value={leaf} />;
        })}
      </>
    );
  }

  const leaf = formatLeafValue(data);
  return leaf === null ? null : <p className="text-sm text-gray-800">{leaf}</p>;
}

function DrawerSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">{title}</p>
      <div className="text-sm">{children}</div>
    </div>
  );
}

/* --- Page --------------------------------------------------------------- */

export default function QuoteRequestsPage() {
  const { user } = useAuth();
  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
  const [counts, setCounts] = useState<Record<FilterKey, number>>({ all: 0, New: 0, Contacted: 0, Quoted: 0, Won: 0, Lost: 0 });
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState<QuoteRequest | null>(null);

  // Drawer-scoped state
  const [documents, setDocuments] = useState<(QuoteRequestDocument & { signedUrl: string | null })[]>([]);
  const [notesDraft, setNotesDraft] = useState('');
  const [clientMatches, setClientMatches] = useState<ClientMatch[]>([]);
  const [attaching, setAttaching] = useState(false);
  const [creatingLead, setCreatingLead] = useState(false);

  const loadCounts = useCallback(async () => {
    const base = () => supabase.from('quote_requests').select('id', { count: 'exact', head: true }).is('deleted_at', null);
    const [allRes, newRes, contactedRes, quotedRes, wonRes, lostRes] = await Promise.all([
      base(),
      base().eq('status', 'New'),
      base().eq('status', 'Contacted'),
      base().eq('status', 'Quoted'),
      base().eq('status', 'Won'),
      base().eq('status', 'Lost'),
    ]);
    setCounts({
      all: allRes.count || 0,
      New: newRes.count || 0,
      Contacted: contactedRes.count || 0,
      Quoted: quotedRes.count || 0,
      Won: wonRes.count || 0,
      Lost: lostRes.count || 0,
    });
  }, []);

  const loadQuotes = useCallback(async () => {
    setLoading(true);
    setError(false);
    let query = supabase
      .from('quote_requests')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (activeFilter !== 'all') query = query.eq('status', activeFilter);

    const { data, error: err } = await query.limit(200);
    if (err) {
      setError(true);
      setLoading(false);
      return;
    }
    setQuotes((data as unknown as QuoteRequest[]) || []);
    setLoading(false);
  }, [activeFilter]);

  useEffect(() => { loadCounts(); }, [loadCounts]);
  useEffect(() => { loadQuotes(); }, [loadQuotes]);

  // When a drawer opens, load its documents, notes draft, and client matches.
  useEffect(() => {
    if (!selected) return;
    setNotesDraft(selected.internal_notes || '');
    setDocuments([]);
    setClientMatches([]);

    let cancelled = false;

    (async () => {
      const { data: docs } = await supabase
        .from('quote_request_documents')
        .select('*')
        .eq('quote_request_id', selected.id)
        .order('created_at', { ascending: true });

      const withUrls = await Promise.all(
        ((docs as unknown as QuoteRequestDocument[]) || []).map(async (d) => {
          const { data: signed } = await supabase.storage
            .from('quote-documents')
            .createSignedUrl(d.file_path, 3600);
          return { ...d, signedUrl: signed?.signedUrl ?? null };
        })
      );
      if (!cancelled) setDocuments(withUrls);
    })();

    // Client-match lookup only when not already attached.
    if (!selected.client_id) {
      (async () => {
        const matches = new Map<string, ClientMatch>();
        const email = selected.email?.trim();
        if (email) {
          const { data } = await supabase
            .from('clients')
            .select('id, first_name, last_name, email, phone')
            .ilike('email', escapeLike(email))
            .limit(10);
          (data || []).forEach((c: any) => matches.set(c.id, c));
        }
        const digits = digitsOnly(selected.phone);
        if (digits.length >= 7) {
          const pattern = '%' + digits.split('').join('%') + '%';
          const { data } = await supabase
            .from('clients')
            .select('id, first_name, last_name, email, phone')
            .ilike('phone', pattern)
            .limit(25);
          (data || []).forEach((c: any) => {
            if (digitsOnly(c.phone) === digits) matches.set(c.id, c);
          });
        }
        if (!cancelled) setClientMatches(Array.from(matches.values()));
      })();
    }

    return () => { cancelled = true; };
  }, [selected]);

  function patchSelected(patch: Partial<QuoteRequest>) {
    setSelected((prev) => (prev ? { ...prev, ...patch } : prev));
    setQuotes((qs) => qs.map((q) => (selected && q.id === selected.id ? { ...q, ...patch } : q)));
  }

  async function handleStatusChange(newStatus: string) {
    if (!selected) return;
    const prevStatus = selected.status;
    patchSelected({ status: newStatus as QuoteRequest['status'] });

    const { error: updateError } = await supabase
      .from('quote_requests')
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
      .from('quote_requests')
      .update({ internal_notes: notesDraft || null })
      .eq('id', selected.id);
    if (err) {
      toast.error('Could not save notes');
      return;
    }
    patchSelected({ internal_notes: notesDraft || null });
    toast.success('Notes saved');
  }

  async function handleCreateLead() {
    if (!selected || selected.lead_id) return;
    setCreatingLead(true);
    const { data, error: insertError } = await supabase
      .from('leads')
      .insert({
        first_name: selected.first_name || 'Unknown',
        last_name: selected.last_name || '',
        email: selected.email || null,
        phone: selected.phone || null,
        address_zip: selected.address_zip || null,
        lead_source: 'Web Quote',
        status: 'new',
        priority: 'hot',
      })
      .select('id')
      .maybeSingle();

    if (insertError || !data) {
      toast.error('Could not create lead');
      setCreatingLead(false);
      return;
    }
    const { error: linkError } = await supabase
      .from('quote_requests')
      .update({ lead_id: data.id })
      .eq('id', selected.id);
    if (linkError) {
      toast.error('Could not create lead');
      setCreatingLead(false);
      return;
    }
    patchSelected({ lead_id: data.id as string });
    toast.success('Lead created');
    setCreatingLead(false);
  }

  async function handleAttachToClient(clientId: string) {
    if (!selected) return;
    setAttaching(true);
    const { error: err } = await supabase
      .from('quote_requests')
      .update({ client_id: clientId })
      .eq('id', selected.id);
    if (err) {
      toast.error('Could not attach to client');
      setAttaching(false);
      return;
    }
    patchSelected({ client_id: clientId });
    toast.success('Attached to client');
    setAttaching(false);
  }

  const coverage = selected ? resolveCoverageColumn(selected) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Quote Requests — {counts.New} new</h1>
        <p className="text-sm text-gray-500">Submissions from the website quote wizard</p>
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
              <p className="text-sm font-medium">Couldn&apos;t load quote requests</p>
              <p className="text-xs text-muted-foreground mt-1">Please try again</p>
              <Button size="sm" variant="outline" className="mt-4" onClick={loadQuotes}>
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
          ) : quotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-xl bg-[#2C3E6B]/10 p-3 mb-3">
                <FileSpreadsheet className="h-7 w-7 text-[#2C3E6B]" />
              </div>
              <p className="text-sm font-medium text-foreground">No quote requests yet</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-[300px]">
                Submissions from the website quote form will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50/80">
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Received</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Coverage</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Email</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Phone</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">ZIP</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Estimate</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Linked</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {quotes.map((q) => (
                    <tr
                      key={q.id}
                      onClick={() => setSelected(q)}
                      className="cursor-pointer hover:bg-gray-50/60 transition-colors"
                    >
                      <td
                        className={`px-4 py-3 text-gray-500 whitespace-nowrap border-l-2 ${
                          q.status === 'New' ? 'border-[#B8962E]' : 'border-transparent'
                        }`}
                      >
                        {formatDistanceToNow(new Date(q.created_at), { addSuffix: true })}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900 max-w-[160px] truncate">{fullName(q)}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{q.coverage_type || '—'}</td>
                      <td className="px-4 py-3 text-gray-600 max-w-[180px] truncate">{q.email || '—'}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{q.phone ? formatPhone(q.phone) : '—'}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{q.address_zip || '—'}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatEstimate(q)}</td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className={statusColors[q.status] || 'bg-gray-100 text-gray-700'}>
                          {q.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          {q.lead_id && (
                            <Link href={`/leads/${q.lead_id}`} className="inline-flex items-center rounded-full bg-cyan-100 text-cyan-700 px-2 py-0.5 text-[10px] font-medium hover:bg-cyan-200">
                              Lead
                            </Link>
                          )}
                          {q.client_id && (
                            <Link href={`/clients/${q.client_id}`} className="inline-flex items-center rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 text-[10px] font-medium hover:bg-emerald-200">
                              Client
                            </Link>
                          )}
                          {!q.lead_id && !q.client_id && <span className="text-gray-400">—</span>}
                        </div>
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
                <SheetTitle>{fullName(selected)}</SheetTitle>
                <p className="text-xs text-muted-foreground">
                  {selected.coverage_type || 'Quote'} · Received {formatDateTime(selected.created_at)}
                </p>
                {/* The drawer is for skimming. Rekeying into a carrier portal
                    wants the full page: nothing truncated, every field
                    individually copyable, and a window you can put side by
                    side with Mercury or Progressive. */}
                <Link
                  href={`/quote-requests/${selected.id}`}
                  className="inline-flex items-center gap-1 pt-1 text-xs font-medium text-[#1B2A4A] hover:underline"
                >
                  <ExternalLink className="h-3 w-3" /> Open full view for carrier entry
                </Link>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
                {/* Applicant */}
                <DrawerSection title="Applicant">
                  <div className="space-y-1">
                    <p className="font-medium text-gray-900">{fullName(selected)}</p>
                    {selected.email && <p className="text-gray-600 break-all">{selected.email}</p>}
                    {selected.phone && <p className="text-gray-600">{formatPhone(selected.phone)}</p>}
                    {selected.date_of_birth && (
                      <KeyValueRow label="Date of Birth" value={formatDate(selected.date_of_birth)} />
                    )}
                    {(selected.address_street || selected.address_city || selected.address_state || selected.address_zip) && (
                      <p className="text-gray-600 pt-1">
                        {[selected.address_street, selected.address_city, [selected.address_state, selected.address_zip].filter(Boolean).join(' ')]
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                    )}
                  </div>
                </DrawerSection>

                {/* Business (commercial only) */}
                {coverage?.commercial && (selected.business_legal_name || selected.business_dba || selected.business_fein || selected.business_entity_type || selected.business_description) && (
                  <DrawerSection title="Business">
                    <div className="space-y-0.5">
                      {selected.business_legal_name && <KeyValueRow label="Legal Name" value={selected.business_legal_name} />}
                      {selected.business_dba && <KeyValueRow label="DBA" value={selected.business_dba} />}
                      {selected.business_entity_type && <KeyValueRow label="Entity Type" value={selected.business_entity_type} />}
                      {selected.business_fein && <KeyValueRow label="FEIN" value={selected.business_fein} />}
                      {selected.business_year_est != null && <KeyValueRow label="Year Established" value={String(selected.business_year_est)} />}
                      {selected.business_phone && <KeyValueRow label="Business Phone" value={formatPhone(selected.business_phone)} />}
                      {selected.business_website && <KeyValueRow label="Website" value={selected.business_website} />}
                      {selected.business_description && <KeyValueRow label="Description" value={selected.business_description} />}
                    </div>
                  </DrawerSection>
                )}

                {/* Coverage details */}
                {coverage && !isEmptyObject(selected[coverage.column]) && (
                  <DrawerSection title="Coverage Details">
                    <FormDataTree data={selected[coverage.column]} />
                  </DrawerSection>
                )}

                {/* Loss history */}
                {(selected.has_prior_losses != null || (Array.isArray(selected.loss_history) && (selected.loss_history as unknown[]).length > 0) || selected.prior_cancellation != null) && (
                  <DrawerSection title="Loss History">
                    <div className="space-y-0.5">
                      {selected.has_prior_losses != null && <KeyValueRow label="Prior Losses" value={selected.has_prior_losses ? 'Yes' : 'No'} />}
                      {Array.isArray(selected.loss_history) && (selected.loss_history as unknown[]).length > 0 && (
                        <FormDataTree data={selected.loss_history} />
                      )}
                      {selected.prior_cancellation != null && <KeyValueRow label="Prior Cancellation" value={selected.prior_cancellation ? 'Yes' : 'No'} />}
                      {selected.prior_cancellation_explanation && <KeyValueRow label="Explanation" value={selected.prior_cancellation_explanation} />}
                    </div>
                  </DrawerSection>
                )}

                {/* Prior insurance */}
                {(selected.prior_carrier || selected.prior_policy_expiration || selected.years_continuously_insured != null) && (
                  <DrawerSection title="Prior Insurance">
                    <div className="space-y-0.5">
                      {selected.prior_carrier && <KeyValueRow label="Prior Carrier" value={selected.prior_carrier} />}
                      {selected.prior_policy_expiration && <KeyValueRow label="Policy Expiration" value={formatDate(selected.prior_policy_expiration)} />}
                      {selected.years_continuously_insured != null && <KeyValueRow label="Years Insured" value={String(selected.years_continuously_insured)} />}
                    </div>
                  </DrawerSection>
                )}

                {/* Estimate */}
                {(selected.estimate_low != null || selected.estimate_high != null || !isEmptyObject(selected.estimate_factors)) && (
                  <DrawerSection title="Estimate">
                    <div className="space-y-0.5">
                      {selected.estimate_low != null && selected.estimate_high != null && (
                        <KeyValueRow label="Range" value={formatEstimate(selected)} />
                      )}
                      {!isEmptyObject(selected.estimate_factors) && <FormDataTree data={selected.estimate_factors} />}
                    </div>
                  </DrawerSection>
                )}

                {/* Documents */}
                {documents.length > 0 && (
                  <DrawerSection title="Documents">
                    <div className="space-y-1.5">
                      {documents.map((d) => (
                        <div key={d.id} className="flex items-center gap-2">
                          <Paperclip className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                          {d.signedUrl ? (
                            <a href={d.signedUrl} target="_blank" rel="noopener noreferrer" className="text-[#1B2A4A] hover:underline break-all">
                              {d.file_name}
                            </a>
                          ) : (
                            <span className="text-gray-400 cursor-not-allowed break-all" title="Could not generate a secure link for this file">
                              {d.file_name}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </DrawerSection>
                )}

                {/* Internal notes */}
                <DrawerSection title="Internal Notes">
                  <Textarea
                    rows={3}
                    value={notesDraft}
                    onChange={(e) => setNotesDraft(e.target.value)}
                    onBlur={saveNotes}
                    placeholder="Staff-only notes (saved when you click away)"
                  />
                </DrawerSection>

                {/* Client match picker */}
                {!selected.client_id && clientMatches.length > 1 && (
                  <DrawerSection title="Matching Clients">
                    <div className="space-y-1.5">
                      {clientMatches.map((c) => (
                        <div key={c.id} className="flex items-center justify-between gap-2 rounded-lg border p-2">
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate">{c.first_name} {c.last_name}</p>
                            <p className="text-xs text-gray-500 truncate">{c.email || (c.phone ? formatPhone(c.phone) : '')}</p>
                          </div>
                          <Button size="sm" variant="outline" disabled={attaching} onClick={() => handleAttachToClient(c.id)}>
                            <Link2 className="mr-1 h-3.5 w-3.5" /> Attach
                          </Button>
                        </div>
                      ))}
                    </div>
                  </DrawerSection>
                )}
              </div>

              {/* Sticky footer */}
              <div className="border-t px-6 py-4 space-y-3">
                <Select value={selected.status} onValueChange={handleStatusChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {QUOTE_REQUEST_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex flex-wrap gap-2">
                  {selected.email && (
                    <Button asChild variant="outline" size="sm" className="flex-1">
                      <a href={`mailto:${selected.email}`}>
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

                {selected.lead_id ? (
                  <Button asChild variant="secondary" size="sm" className="w-full">
                    <Link href={`/leads/${selected.lead_id}`}>
                      <ExternalLink className="mr-2 h-3.5 w-3.5" /> View Lead
                    </Link>
                  </Button>
                ) : (
                  <Button size="sm" className="w-full bg-[#1B2A4A] hover:bg-[#2C3E6B]" onClick={handleCreateLead} disabled={creatingLead}>
                    <UserPlus className="mr-2 h-3.5 w-3.5" />
                    {creatingLead ? 'Creating...' : 'Create Lead'}
                  </Button>
                )}

                {selected.client_id ? (
                  <Button asChild variant="secondary" size="sm" className="w-full">
                    <Link href={`/clients/${selected.client_id}`}>
                      <ExternalLink className="mr-2 h-3.5 w-3.5" /> View Client
                    </Link>
                  </Button>
                ) : clientMatches.length === 1 ? (
                  <Button size="sm" variant="outline" className="w-full" disabled={attaching} onClick={() => handleAttachToClient(clientMatches[0].id)}>
                    <Link2 className="mr-2 h-3.5 w-3.5" />
                    {attaching ? 'Attaching...' : `Attach to ${clientMatches[0].first_name} ${clientMatches[0].last_name}`}
                  </Button>
                ) : null}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
