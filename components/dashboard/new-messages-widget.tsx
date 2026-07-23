'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/lib/supabase';
import type { ContactSubmission } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, MessageSquare, TriangleAlert as AlertTriangle } from 'lucide-react';

export function NewMessagesWidget() {
  const [messages, setMessages] = useState<ContactSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { data, error: err } = await supabase
      .from('contact_submissions')
      .select('*')
      .eq('status', 'New')
      .order('created_at', { ascending: false })
      .limit(5);

    if (err) {
      setError(true);
      setLoading(false);
      return;
    }
    setMessages(data || []);
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
          <CardTitle className="text-base font-semibold">New Messages</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertTriangle className="h-10 w-10 text-amber-500 mb-2" />
            <p className="text-sm font-medium">Couldn&apos;t load messages</p>
            <p className="text-xs text-muted-foreground">Please try again later</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base font-semibold">New Messages</CardTitle>
        <Button asChild variant="ghost" size="sm" className="text-xs">
          <Link href="/messages">
            View All <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="rounded-xl bg-[#2C3E6B]/10 p-3 mb-3">
              <MessageSquare className="h-7 w-7 text-[#2C3E6B]" />
            </div>
            <p className="text-sm font-medium text-foreground">No new messages</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-[220px]">
              Submissions from the website contact form will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((m) => (
              <Link key={m.id} href="/messages">
                <div className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50">
                  <div className="mt-0.5 rounded-lg bg-blue-50 p-1.5 shrink-0">
                    <MessageSquare className="h-3.5 w-3.5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{m.name}</p>
                      <Badge variant="secondary" className="text-[10px] shrink-0 bg-blue-100 text-blue-700">
                        New
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{m.message}</p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
