'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/format';
import type { QuoteRequest } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, FileSpreadsheet, TriangleAlert as AlertTriangle } from 'lucide-react';

function fullName(q: QuoteRequest): string {
  return [q.first_name, q.last_name].filter(Boolean).join(' ').trim() || 'Unknown';
}

function estimateLabel(q: QuoteRequest): string | null {
  if (q.estimate_low == null || q.estimate_high == null) return null;
  return `${formatCurrency(Number(q.estimate_low))}–${formatCurrency(Number(q.estimate_high))}/yr`;
}

export function NewQuoteRequestsWidget() {
  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { data, error: err } = await supabase
      .from('quote_requests')
      .select('*')
      .is('deleted_at', null)
      .eq('status', 'New')
      .order('created_at', { ascending: false })
      .limit(5);

    if (err) {
      setError(true);
      setLoading(false);
      return;
    }
    setQuotes((data as unknown as QuoteRequest[]) || []);
    setLoading(false);
  }

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="h-5 w-40 animate-pulse rounded bg-muted" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">New Web Quotes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertTriangle className="h-10 w-10 text-amber-500 mb-2" />
            <p className="text-sm font-medium">Couldn&apos;t load quote requests</p>
            <p className="text-xs text-muted-foreground">Please try again later</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base font-semibold">New Web Quotes</CardTitle>
        <Button asChild variant="ghost" size="sm" className="text-xs">
          <Link href="/quote-requests">
            View All <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {quotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="rounded-xl bg-[#2C3E6B]/10 p-3 mb-3">
              <FileSpreadsheet className="h-7 w-7 text-[#2C3E6B]" />
            </div>
            <p className="text-sm font-medium text-foreground">No new quote requests</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-[220px]">
              Submissions from the website quote form will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {quotes.map((q) => {
              const est = estimateLabel(q);
              return (
                <Link key={q.id} href="/quote-requests">
                  <div className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50">
                    <div className="mt-0.5 rounded-lg bg-blue-50 p-1.5 shrink-0">
                      <FileSpreadsheet className="h-3.5 w-3.5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{fullName(q)}</p>
                        <Badge variant="secondary" className="text-[10px] shrink-0 bg-blue-100 text-blue-700">
                          New
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {q.coverage_type || 'Quote'}{est ? ` · ${est}` : ''}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatDistanceToNow(new Date(q.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
