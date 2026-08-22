'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { formatDateTime } from '@/lib/format';
import type { QuoteRequest, QuoteRequestDocument } from '@/lib/types';
import { buildQuoteFieldGroups } from '@/lib/quote-fields';
import { QuoteFieldPanel } from '@/components/quote/quote-field-panel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { ArrowLeft, Paperclip, Link2 } from 'lucide-react';

const statusColors: Record<string, string> = {
  New: 'bg-blue-100 text-blue-700',
  Contacted: 'bg-amber-100 text-amber-700',
  Quoted: 'bg-cyan-100 text-cyan-700',
  Won: 'bg-emerald-100 text-emerald-700',
  Lost: 'bg-gray-100 text-gray-700',
};

/**
 * Full-page view of one quote request, built for transcription into a carrier
 * portal rather than for skimming. The list drawer stays as the quick look;
 * this is the page you put beside Mercury or Progressive.
 */
export default function QuoteRequestDetailPage() {
  const { id } = useParams();
  const [quote, setQuote] = useState<QuoteRequest | null>(null);
  const [documents, setDocuments] = useState<(QuoteRequestDocument & { signedUrl: string | null })[]>([]);
  const [notesDraft, setNotesDraft] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    // Soft-deleted rows are not reachable by URL either — otherwise a stale
    // link would quietly resurrect a record staff had removed from the list.
    const { data } = await supabase
      .from('quote_requests')
      .select('*')
      .eq('id', id as string)
      .is('deleted_at', null)
      .maybeSingle();

    const q = (data as unknown as QuoteRequest) || null;
    setQuote(q);
    setNotesDraft(q?.internal_notes || '');
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!quote) return;
    let cancelled = false;

    (async () => {
      const { data: docs } = await supabase
        .from('quote_request_documents')
        .select('*')
        .eq('quote_request_id', quote.id)
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

    return () => { cancelled = true; };
  }, [quote]);

  async function saveNotes() {
    if (!quote || notesDraft === (quote.internal_notes || '')) return;
    const { error } = await supabase
      .from('quote_requests')
      .update({ internal_notes: notesDraft })
      .eq('id', quote.id);
    if (error) { toast.error('Could not save notes'); return; }
    setQuote({ ...quote, internal_notes: notesDraft });
    toast.success('Notes saved');
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-gray-400">Loading...</div>;
  }

  if (!quote) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-gray-500">Quote request not found</p>
        <Link href="/quote-requests" className="mt-4 text-sm text-[#1B2A4A] hover:underline">
          Back to Quote Requests
        </Link>
      </div>
    );
  }

  const name = [quote.first_name, quote.last_name].filter(Boolean).join(' ') || 'Quote request';
  const groups = buildQuoteFieldGroups(quote);

  return (
    <div className="space-y-6">
      <Link
        href="/quote-requests"
        className="inline-flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Quote Requests
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">{name}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className={statusColors[quote.status] || 'bg-gray-100 text-gray-700'}>
            {quote.status}
          </Badge>
          <span className="text-sm text-gray-500">
            {quote.coverage_type || 'Quote'} · Received {formatDateTime(quote.created_at)}
          </span>
          {quote.lead_id && (
            <Link
              href={`/leads/${quote.lead_id}`}
              className="inline-flex items-center gap-1 rounded-full bg-cyan-100 px-2 py-0.5 text-[11px] font-medium text-cyan-700 hover:bg-cyan-200"
            >
              <Link2 className="h-3 w-3" /> Lead
            </Link>
          )}
          {quote.client_id && (
            <Link
              href={`/clients/${quote.client_id}`}
              className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700 hover:bg-emerald-200"
            >
              <Link2 className="h-3 w-3" /> Client
            </Link>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Submitted information</CardTitle>
          <p className="text-xs text-muted-foreground">
            Everything the applicant entered, ready to copy into a carrier portal.
          </p>
        </CardHeader>
        <CardContent>
          <QuoteFieldPanel groups={groups} />
        </CardContent>
      </Card>

      {documents.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Documents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {documents.map((d) => (
              <div key={d.id} className="flex items-center gap-2 text-sm">
                <Paperclip className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                {d.signedUrl ? (
                  <a
                    href={d.signedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all text-[#1B2A4A] hover:underline"
                  >
                    {d.file_name}
                  </a>
                ) : (
                  <span
                    className="cursor-not-allowed break-all text-gray-400"
                    title="Could not generate a secure link for this file"
                  >
                    {d.file_name}
                  </span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Internal notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            rows={3}
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
            onBlur={saveNotes}
            placeholder="Staff-only notes (saved when you click away)"
          />
        </CardContent>
      </Card>
    </div>
  );
}
