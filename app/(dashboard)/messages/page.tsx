'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { formatDateTime, formatPhone } from '@/lib/format';
import type { ContactSubmission } from '@/lib/types';
import { CONTACT_SUBMISSION_STATUSES } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  MessageSquare,
  ExternalLink,
} from 'lucide-react';

type FilterKey = 'all' | 'New' | 'Replied' | 'Closed';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'New', label: 'New' },
  { key: 'Replied', label: 'Replied' },
  { key: 'Closed', label: 'Closed' },
];

const statusColors: Record<string, string> = {
  New: 'bg-blue-100 text-blue-700',
  Replied: 'bg-amber-100 text-amber-700',
  Closed: 'bg-gray-100 text-gray-700',
};

interface MessageRow extends ContactSubmission {
  handled_by_user?: { full_name: string } | null;
}

export default function MessagesPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [counts, setCounts] = useState({ all: 0, New: 0, Replied: 0, Closed: 0 });
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState<MessageRow | null>(null);
  const [converting, setConverting] = useState(false);

  const loadCounts = useCallback(async () => {
    const [allRes, newRes, repliedRes, closedRes] = await Promise.all([
      supabase.from('contact_submissions').select('id', { count: 'exact', head: true }),
      supabase.from('contact_submissions').select('id', { count: 'exact', head: true }).eq('status', 'New'),
      supabase.from('contact_submissions').select('id', { count: 'exact', head: true }).eq('status', 'Replied'),
      supabase.from('contact_submissions').select('id', { count: 'exact', head: true }).eq('status', 'Closed'),
    ]);
    setCounts({
      all: allRes.count || 0,
      New: newRes.count || 0,
      Replied: repliedRes.count || 0,
      Closed: closedRes.count || 0,
    });
  }, []);

  const loadMessages = useCallback(async () => {
    setLoading(true);
    setError(false);

    let query = supabase
      .from('contact_submissions')
      .select('*, handled_by_user:users(full_name)')
      .order('created_at', { ascending: false });

    if (activeFilter !== 'all') query = query.eq('status', activeFilter);

    const { data, error: err } = await query.limit(200);
    if (err) {
      setError(true);
      setLoading(false);
      return;
    }
    setMessages((data as unknown as MessageRow[]) || []);
    setLoading(false);
  }, [activeFilter]);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  async function refetchRow(id: string) {
    const { data } = await supabase
      .from('contact_submissions')
      .select('*, handled_by_user:users(full_name)')
      .eq('id', id)
      .maybeSingle();
    return data as unknown as MessageRow | null;
  }

  async function handleStatusChange(newStatus: string) {
    if (!selected) return;
    const prev = selected;
    const handledAt = new Date().toISOString();
    const optimistic: MessageRow = {
      ...selected,
      status: newStatus as ContactSubmission['status'],
      handled_by: user?.id ?? selected.handled_by,
      handled_at: handledAt,
    };
    setSelected(optimistic);
    setMessages((m) => m.map((msg) => (msg.id === optimistic.id ? optimistic : msg)));

    const { error: updateError } = await supabase
      .from('contact_submissions')
      .update({ status: newStatus, handled_by: user?.id, handled_at: handledAt })
      .eq('id', prev.id);

    if (updateError) {
      const fresh = await refetchRow(prev.id);
      if (fresh) {
        setSelected(fresh);
        setMessages((m) => m.map((msg) => (msg.id === fresh.id ? fresh : msg)));
      }
      toast.error('Could not update status — please try again');
      return;
    }

    loadCounts();
  }

  async function handleConvertToLead() {
    if (!selected || selected.lead_id) return;
    setConverting(true);

    const parts = selected.name.trim().split(/\s+/);
    const first_name = parts[0] || selected.name;
    const last_name = parts.slice(1).join(' ');

    const { data, error: insertError } = await supabase
      .from('leads')
      .insert({
        first_name,
        last_name,
        email: selected.email || null,
        phone: selected.phone || null,
        lead_source: 'Contact Form',
        status: 'new',
        priority: 'normal',
      })
      .select('id')
      .maybeSingle();

    if (insertError || !data) {
      toast.error('Could not create lead');
      setConverting(false);
      return;
    }

    const { error: linkError } = await supabase
      .from('contact_submissions')
      .update({ lead_id: data.id })
      .eq('id', selected.id);

    if (linkError) {
      toast.error('Could not create lead');
      setConverting(false);
      return;
    }

    const updated = { ...selected, lead_id: data.id as string };
    setSelected(updated);
    setMessages((m) => m.map((msg) => (msg.id === updated.id ? updated : msg)));
    toast.success('Lead created');
    setConverting(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Messages — {counts.New} new</h1>
        <p className="text-sm text-gray-500">Submissions from the website contact form</p>
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
              <p className="text-sm font-medium">Couldn&apos;t load messages</p>
              <p className="text-xs text-muted-foreground mt-1">Please try again</p>
              <Button size="sm" variant="outline" className="mt-4" onClick={loadMessages}>
                <RefreshCw className="mr-2 h-3.5 w-3.5" /> Retry
              </Button>
            </div>
          ) : loading ? (
            <div className="divide-y">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3.5">
                  <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-28 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                  <div className="h-4 flex-1 animate-pulse rounded bg-muted" />
                  <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-xl bg-[#2C3E6B]/10 p-3 mb-3">
                <MessageSquare className="h-7 w-7 text-[#2C3E6B]" />
              </div>
              <p className="text-sm font-medium text-foreground">No messages yet</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-[280px]">
                Submissions from the website contact form will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50/80">
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Received</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Email</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Phone</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Message</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {messages.map((m) => (
                    <tr
                      key={m.id}
                      onClick={() => setSelected(m)}
                      className="cursor-pointer hover:bg-gray-50/60 transition-colors"
                    >
                      <td
                        className={`px-4 py-3 text-gray-500 whitespace-nowrap border-l-2 ${
                          m.status === 'New' ? 'border-[#B8962E]' : 'border-transparent'
                        }`}
                      >
                        {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900 max-w-[160px] truncate">{m.name}</td>
                      <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate">{m.email}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {m.phone ? formatPhone(m.phone) : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600 max-w-[280px] truncate">{m.message}</td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className={statusColors[m.status] || 'bg-gray-100 text-gray-700'}>
                          {m.status}
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
                <SheetTitle>{selected.name}</SheetTitle>
                <p className="text-xs text-muted-foreground">Received {formatDateTime(selected.created_at)}</p>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Sender</p>
                  <div className="space-y-1 text-sm">
                    <p className="font-medium text-gray-900">{selected.name}</p>
                    <p className="text-gray-600 break-all">{selected.email}</p>
                    {selected.phone && <p className="text-gray-600">{formatPhone(selected.phone)}</p>}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Message</p>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap break-words leading-relaxed">
                    {selected.message}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Details</p>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Received</span>
                      <span className="text-gray-800">{formatDateTime(selected.created_at)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Status</span>
                      <Badge variant="secondary" className={statusColors[selected.status]}>
                        {selected.status}
                      </Badge>
                    </div>
                    {selected.handled_at && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Handled</span>
                        <span className="text-gray-800">
                          {selected.handled_by_user?.full_name || 'Staff'} · {formatDateTime(selected.handled_at)}
                        </span>
                      </div>
                    )}
                    {selected.lead_id && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Lead</span>
                        <Link
                          href={`/leads/${selected.lead_id}`}
                          className="inline-flex items-center gap-1 text-[#1B2A4A] hover:underline"
                        >
                          View lead <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="border-t px-6 py-4 space-y-3">
                <Select value={selected.status} onValueChange={handleStatusChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTACT_SUBMISSION_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="outline" size="sm" className="flex-1">
                    <a href={`mailto:${selected.email}`}>
                      <Mail className="mr-2 h-3.5 w-3.5" /> Reply by email
                    </a>
                  </Button>
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
                  <Button
                    size="sm"
                    className="w-full bg-[#1B2A4A] hover:bg-[#2C3E6B]"
                    onClick={handleConvertToLead}
                    disabled={converting}
                  >
                    <UserPlus className="mr-2 h-3.5 w-3.5" />
                    {converting ? 'Converting...' : 'Convert to Lead'}
                  </Button>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
