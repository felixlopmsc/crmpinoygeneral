'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDate, daysUntil } from '@/lib/format';
import type { Policy, Client } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowRight,
  CalendarDays,
  FileCheck,
  Mail,
  MailCheck,
  MailX,
  RefreshCw,
  Send,
} from 'lucide-react';
import { toast } from 'sonner';

interface RenewalWithTracking {
  id: string;
  policy_id: string;
  client_id: string;
  renewal_date: string;
  reminder_90_days: boolean;
  reminder_60_days: boolean;
  reminder_30_days: boolean;
  reminder_7_days: boolean;
  status: string;
  policy: Policy;
  client: Client;
}

interface EmailStats {
  total_sent: number;
  total_failed: number;
  last_sent_at: string | null;
}

export function UpcomingRenewalsWidget() {
  const [renewals, setRenewals] = useState<RenewalWithTracking[]>([]);
  const [emailStats, setEmailStats] = useState<EmailStats>({ total_sent: 0, total_failed: 0, last_sent_at: null });
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const today = new Date().toISOString().split('T')[0];
    const future90 = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const [renewalsRes, logsRes] = await Promise.all([
      supabase
        .from('renewals')
        .select('*, policy:policies(*, client:clients(*)), client:clients(*)')
        .in('status', ['Upcoming', 'Pending', 'Contacted'])
        .gte('renewal_date', today)
        .lte('renewal_date', future90)
        .order('renewal_date', { ascending: true })
        .limit(6),
      supabase
        .from('renewal_log')
        .select('email_status, sent_at')
        .order('sent_at', { ascending: false })
        .limit(100),
    ]);

    setRenewals((renewalsRes.data as any) || []);

    const logs = logsRes.data || [];
    setEmailStats({
      total_sent: logs.filter((l: any) => l.email_status === 'sent').length,
      total_failed: logs.filter((l: any) => l.email_status === 'failed').length,
      last_sent_at: logs.length > 0 ? logs[0].sent_at : null,
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

  function getReminderProgress(renewal: RenewalWithTracking): number {
    let sent = 0;
    if (renewal.reminder_90_days) sent++;
    if (renewal.reminder_60_days) sent++;
    if (renewal.reminder_30_days) sent++;
    if (renewal.reminder_7_days) sent++;
    return (sent / 4) * 100;
  }

  function getUrgencyBadge(days: number) {
    if (days <= 7) return <Badge variant="destructive" className="text-[10px]">Urgent</Badge>;
    if (days <= 30) return <Badge className="text-[10px] bg-amber-100 text-amber-700 hover:bg-amber-100">This Month</Badge>;
    if (days <= 60) return <Badge className="text-[10px] bg-blue-100 text-blue-700 hover:bg-blue-100">60 Days</Badge>;
    return <Badge variant="secondary" className="text-[10px]">90 Days</Badge>;
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base font-semibold">Renewal Automation</CardTitle>
          <div className="flex items-center gap-3 mt-1">
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
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={triggerRenewalCheck}
            disabled={triggering}
            className="text-xs"
          >
            {triggering ? (
              <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
            ) : (
              <Send className="mr-1 h-3 w-3" />
            )}
            {triggering ? 'Checking...' : 'Run Check'}
          </Button>
          <Button asChild variant="ghost" size="sm" className="text-xs">
            <Link href="/renewals">
              View All <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {renewals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FileCheck className="h-10 w-10 text-[#10B981] mb-2" />
            <p className="text-sm font-medium">No upcoming renewals</p>
            <p className="text-xs text-muted-foreground">All policies are up to date</p>
          </div>
        ) : (
          <div className="space-y-3">
            {renewals.map((renewal) => {
              const days = daysUntil(renewal.renewal_date);
              const progress = getReminderProgress(renewal);
              const client = renewal.client;
              const policy = renewal.policy;
              if (!client || !policy) return null;

              return (
                <Link key={renewal.id} href={`/clients/${renewal.client_id}`}>
                  <div className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50">
                    <div className={`rounded-lg p-2 shrink-0 ${
                      days <= 7 ? 'bg-red-100' : days <= 30 ? 'bg-amber-100' : 'bg-blue-50'
                    }`}>
                      <CalendarDays className={`h-4 w-4 ${
                        days <= 7 ? 'text-red-600' : days <= 30 ? 'text-amber-600' : 'text-[#1E40AF]'
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
                      <div className="flex items-center gap-2 mt-1">
                        <div className="h-1 flex-1 max-w-[80px] rounded-full bg-secondary overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {Math.round(progress / 25)}/4 reminders
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-xs font-medium ${
                        days <= 7 ? 'text-red-600' : days <= 30 ? 'text-amber-600' : 'text-muted-foreground'
                      }`}>
                        {days <= 0 ? 'Expired' : `${days}d left`}
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
