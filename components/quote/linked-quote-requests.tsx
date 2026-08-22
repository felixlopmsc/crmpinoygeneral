'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { formatDateTime } from '@/lib/format';
import type { QuoteRequest } from '@/lib/types';
import { buildQuoteFieldGroups } from '@/lib/quote-fields';
import { QuoteFieldPanel } from '@/components/quote/quote-field-panel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileSpreadsheet, ExternalLink } from 'lucide-react';

/**
 * The quote data behind a lead or client, inline on their record.
 *
 * Before this, a lead auto-created from the wizard carried only the trigger's
 * one-line note ("Auto-created from web quote request. Coverage: Personal
 * Auto. Estimate: ... Ref: B56729E4"). Everything the applicant actually
 * typed — drivers, vehicles, VINs, prior carrier — lived on the quote request
 * and nothing on the lead pointed at it except that Ref.
 *
 * Collapsed by default: an auto quote with two drivers and two vehicles is a
 * lot of rows, and most visits to a lead are not transcription sessions.
 *
 * Renders nothing at all when there is no linked quote request, so records
 * created by hand or imported from CA SOS do not grow an empty section.
 */
export function LinkedQuoteRequests({ leadId, clientId }: { leadId?: string; clientId?: string }) {
  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);

  useEffect(() => {
    if (!leadId && !clientId) return;
    let cancelled = false;

    (async () => {
      let query = supabase
        .from('quote_requests')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      // Two callers, one column each — never both, so this stays an equality
      // filter rather than an `or` that could match unrelated rows.
      query = leadId ? query.eq('lead_id', leadId) : query.eq('client_id', clientId as string);

      const { data } = await query;
      if (!cancelled) setQuotes((data as unknown as QuoteRequest[]) || []);
    })();

    return () => { cancelled = true; };
  }, [leadId, clientId]);

  if (quotes.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-500">
          <FileSpreadsheet className="h-4 w-4" />
          {quotes.length === 1 ? 'Quote request' : `Quote requests (${quotes.length})`}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {quotes.map((q) => (
          <div key={q.id} className="space-y-2">
            <QuoteFieldPanel
              groups={buildQuoteFieldGroups(q)}
              collapsible
              title={q.coverage_type || 'Quote request'}
              subtitle={`Received ${formatDateTime(q.created_at)}`}
            />
            <Link
              href={`/quote-requests/${q.id}`}
              className="inline-flex items-center gap-1 text-xs font-medium text-[#1B2A4A] hover:underline"
            >
              <ExternalLink className="h-3 w-3" /> Open full view
            </Link>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
