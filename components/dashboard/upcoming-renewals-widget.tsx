'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { formatCurrency, daysUntil } from '@/lib/format';
import type { Policy, Client } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, CalendarDays, TriangleAlert as AlertTriangle, RefreshCw, Send, MailCheck, MailX } from 'lucide-react';
import { toast } from 'sonner';

interface RenewalPolicy extends Policy {
  client: Client;
}

export function UpcomingRenewalsWidget() {
  const [policies, setPolicies] = useState<RenewalPolicy[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPremium, setTotalPremium] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [emailStats, setEmailStats] = useState({ total_sent: 0, total_failed: 0 });
  const [triggering, setTriggering] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const today = new Date().toISOString().split('T')[0];
    const future30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const [policiesRes, logsRes] = await Promise.all([
      supabase
        .from('policies')
        .select('*, client:clients(id, first_name, last_name, email)')
        .eq('status', 'Active')
        .is('deleted_at', null)
        .gte('expiration_date', today)
        .lte('expiration_date', future30)
        .order('expiration_date', { ascending: true }),
      supabase
        .from('renewal_log')
        .select('email_status')
        .order('sent_at', { ascending: false })
        .limit(100),
    ]);

    if (policiesRes.error) {
      setError(true);
      setLoading(false);
      return;
    }

    const data = (policiesRes.data as any) || [];
    setTotalCount(data.length);
    setPolicies(data.slice(0, 5));
    setTotalPremium(data.reduce((sum: number, p: any) => sum + (p.annual_premium || 0), 0));

    const logs = logsRes.data || [];
    setEmailStats({
      total_sent: logs.filter((l: any) => l.email_status === 'sent').length,
      total_failed: logs.filter((l: any) => l.email_status === 'failed').length,
    });

    setLoading(false);
  }

  async function triggerRenewalCheck() {
    setTriggering(true);
    try {
      const apiUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/check-renewals`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (response.ok) {
        toast.success(`Renewal check complete: ${result.emails_sent} emails sent, ${result.checked} policies checked`);
        loadData();
      } else {
        toast.error(result.error || 'Failed to run renewal check');
      }
    } catch {
      toast.error('Failed to connect to renewal service');
    } finally {
      setTriggering(false);
    }
  }

  function getUrgencyBadge(days: number) {
    if (days <= 7) return <Badge variant="destructive" className="text-[10px]">Urgent</Badge>;
    return <Badge className="text-[10px] bg-amber-100 text-amber-700 hover:bg-amber-100">This Month</Badge>;
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
              <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
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
          <CardTitle className="text-lg font-semibold">Renewal Automation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertTriangle className="h-10 w-10 text-amber-500 mb-2" />
            <p className="text-sm font-medium">Couldn&apos;t load renewal data</p>
            <p className="text-xs text-muted-foreground">Please try again later</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Renewal Automation</CardTitle>
          <Button asChild variant="ghost" size="sm" className="text-xs">
            <Link href="/renewals">
              View All <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        </div>
        <div className="flex items-center gap-3 mt-2">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <MailCheck className="h-3 w-3 text-emerald-500" />
            {emailStats.total_sent} sent
          </span>
          {emailStats.total_failed > 0 && (
            <span className="flex items-center gap-1 text-xs text-red-500">
              <MailX className="h-3 w-3" />
              {emailStats.total_failed} failed
            </span>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={triggerRenewalCheck}
            disabled={triggering}
            className="text-xs ml-auto h-7"
          >
            {triggering ? (
              <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
            ) : (
              <Send className="mr-1 h-3 w-3" />
            )}
            {triggering ? 'Checking...' : 'Run Check'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {totalCount === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CalendarDays className="h-10 w-10 text-emerald-500 mb-2" />
            <p className="text-sm font-medium">No upcoming renewals</p>
            <p className="text-xs text-muted-foreground">All policies are up to date</p>
          </div>
        ) : (
          <div className="space-y-3">
            <Link href="/renewals">
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 transition-colors hover:bg-amber-100/70">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-amber-900">
                      {totalCount} {totalCount === 1 ? 'policy' : 'policies'} renewing in 30 days
                    </p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      {formatCurrency(totalPremium)} premium at risk
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-amber-600" />
                </div>
              </div>
            </Link>

            {policies.map((policy) => {
              const days = daysUntil(policy.expiration_date);
              const client = policy.client;
              if (!client) return null;

              return (
                <Link key={policy.id} href={`/clients/${client.id}`}>
                  <div className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50">
                    <div className={`rounded-lg p-2 shrink-0 ${
                      days <= 7 ? 'bg-red-100' : days <= 30 ? 'bg-amber-100' : 'bg-blue-50'
                    }`}>
                      <CalendarDays className={`h-4 w-4 ${
                        days <= 7 ? 'text-red-600' : days <= 30 ? 'text-amber-600' : 'text-[#2C3E6B]'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">
                          {client.first_name} {client.last_name}
                        </p>
                        {getUrgencyBadge(days)}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {policy.policy_type} - {policy.carrier}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-xs font-medium ${
                        days <= 7 ? 'text-red-600' : days <= 30 ? 'text-amber-600' : 'text-muted-foreground'
                      }`}>
                        {days}d left
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(policy.annual_premium)}
                      </p>
                    </div>
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
