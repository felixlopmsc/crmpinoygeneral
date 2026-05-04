'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDate, daysUntil, formatPhone } from '@/lib/format';
import type { Policy, Client } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getInitials } from '@/lib/format';
import { toast } from 'sonner';
import { Phone, Mail, CalendarDays, TriangleAlert as AlertTriangle, Clock, CircleCheck as CheckCircle2, Circle as XCircle, Send, RefreshCw, MailCheck, MailX } from 'lucide-react';

interface RenewalPolicy extends Policy {
  client: Client;
}

interface RenewalLog {
  id: string;
  reminder_type: string;
  email_sent_to: string;
  email_status: string;
  email_subject: string;
  error_message: string | null;
  sent_at: string;
  client: Client;
  policy: Policy;
}

export default function RenewalsPage() {
  const [policies, setPolicies] = useState<RenewalPolicy[]>([]);
  const [emailLogs, setEmailLogs] = useState<RenewalLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [sendingForPolicy, setSendingForPolicy] = useState<string | null>(null);

  useEffect(() => { loadRenewals(); loadEmailLogs(); }, []);

  async function loadRenewals() {
    const today = new Date().toISOString().split('T')[0];
    const future90 = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const { data } = await supabase
      .from('policies')
      .select('*, client:clients(id, first_name, last_name, email, phone)')
      .eq('status', 'Active')
      .gte('expiration_date', today)
      .lte('expiration_date', future90)
      .order('expiration_date', { ascending: true });

    setPolicies((data as any) || []);
    setLoading(false);
  }

  async function loadEmailLogs() {
    const { data } = await supabase
      .from('renewal_log')
      .select('*, client:clients(id, first_name, last_name), policy:policies(id, policy_type, carrier, policy_number)')
      .order('sent_at', { ascending: false })
      .limit(50);

    setEmailLogs((data as any) || []);
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
        loadRenewals();
        loadEmailLogs();
      } else {
        toast.error(result.error || 'Failed to run renewal check');
      }
    } catch {
      toast.error('Failed to connect to renewal service');
    } finally {
      setTriggering(false);
    }
  }

  async function sendRenewalEmail(policyId: string) {
    setSendingForPolicy(policyId);
    try {
      const apiUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/check-renewals`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ policy_id: policyId }),
      });
      const result = await response.json();
      if (response.ok && result.emails_sent > 0) {
        toast.success('Renewal email sent successfully');
        loadEmailLogs();
      } else if (response.ok && result.emails_sent === 0) {
        toast.info('No new reminders to send for this policy');
      } else {
        toast.error(result.error || 'Failed to send renewal email');
      }
    } catch {
      toast.error('Failed to connect to renewal service');
    } finally {
      setSendingForPolicy(null);
    }
  }

  const groups = [
    { label: 'Urgent (Next 7 Days)', min: 0, max: 7, color: 'border-l-red-500', bg: 'bg-red-50', icon: AlertTriangle, iconColor: 'text-red-600' },
    { label: 'This Month (8-30 Days)', min: 8, max: 30, color: 'border-l-amber-500', bg: 'bg-amber-50', icon: Clock, iconColor: 'text-amber-600' },
    { label: 'Next Month (31-60 Days)', min: 31, max: 60, color: 'border-l-blue-500', bg: 'bg-blue-50', icon: CalendarDays, iconColor: 'text-blue-600' },
    { label: 'Future (61-90 Days)', min: 61, max: 90, color: 'border-l-emerald-500', bg: 'bg-emerald-50', icon: CheckCircle2, iconColor: 'text-emerald-600' },
  ];

  const totalPremiumAtRisk = policies.reduce((sum, p) => sum + (p.annual_premium || 0), 0);

  if (loading) {
    return <div className="space-y-6"><div className="h-8 w-48 animate-pulse rounded bg-muted" /><div className="h-96 animate-pulse rounded-xl bg-muted" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Renewals</h1>
          <p className="text-sm text-muted-foreground">{policies.length} policies expiring in next 90 days</p>
        </div>
        <Button
          onClick={triggerRenewalCheck}
          disabled={triggering}
          className="bg-[#1E40AF] hover:bg-[#1E3A8A] text-white"
          size="sm"
        >
          {triggering ? (
            <RefreshCw className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <Send className="mr-1.5 h-4 w-4" />
          )}
          {triggering ? 'Running Check...' : 'Run Renewal Check'}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Renewals</p>
            <p className="text-2xl font-bold">{policies.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Premium at Risk</p>
            <p className="text-2xl font-bold text-amber-600">{formatCurrency(totalPremiumAtRisk)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Urgent (7 days)</p>
            <p className="text-2xl font-bold text-red-600">{policies.filter((p) => daysUntil(p.expiration_date) <= 7).length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">This Month</p>
            <p className="text-2xl font-bold">{policies.filter((p) => daysUntil(p.expiration_date) <= 30).length}</p>
          </CardContent>
        </Card>
      </div>

      {groups.map((group) => {
        const groupPolicies = policies.filter((p) => {
          const days = daysUntil(p.expiration_date);
          return days >= group.min && days <= group.max;
        });
        if (groupPolicies.length === 0) return null;
        return (
          <div key={group.label}>
            <div className={`flex items-center gap-2 mb-3 rounded-lg ${group.bg} p-3`}>
              <group.icon className={`h-5 w-5 ${group.iconColor}`} />
              <h2 className="font-semibold">{group.label}</h2>
              <Badge variant="secondary" className="ml-auto">{groupPolicies.length}</Badge>
            </div>
            <div className="space-y-2">
              {groupPolicies.map((policy) => {
                const days = daysUntil(policy.expiration_date);
                return (
                  <Card key={policy.id} className={`border-l-4 ${group.color}`}>
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row items-start gap-3">
                        <Avatar className="h-10 w-10 shrink-0">
                          <AvatarFallback className="bg-[#1E40AF] text-white text-xs">
                            {getInitials(`${(policy.client as any)?.first_name} ${(policy.client as any)?.last_name}`)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <Link href={`/clients/${policy.client_id}`} className="font-semibold text-[#1E40AF] hover:underline">
                            {(policy.client as any)?.first_name} {(policy.client as any)?.last_name}
                          </Link>
                          <p className="text-sm text-muted-foreground">
                            {policy.policy_type} - {policy.carrier} {policy.policy_number && `(#${policy.policy_number})`}
                          </p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-sm font-medium">{formatCurrency(policy.annual_premium)}/yr</span>
                            <span className={`text-sm font-medium ${days <= 7 ? 'text-red-600' : days <= 30 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                              Expires {formatDate(policy.expiration_date)} ({days} days)
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => { e.preventDefault(); sendRenewalEmail(policy.id); }}
                            disabled={sendingForPolicy === policy.id}
                            title="Send renewal reminder"
                          >
                            {sendingForPolicy === policy.id ? (
                              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Send className="h-3.5 w-3.5" />
                            )}
                          </Button>
                          {(policy.client as any)?.phone && (
                            <Button size="sm" variant="outline" asChild>
                              <a href={`tel:${(policy.client as any).phone}`}><Phone className="h-3.5 w-3.5" /></a>
                            </Button>
                          )}
                          <Button size="sm" variant="outline" asChild>
                            <a href={`mailto:${(policy.client as any)?.email}`}><Mail className="h-3.5 w-3.5" /></a>
                          </Button>
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/clients/${policy.client_id}`}>View</Link>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}

      {policies.length === 0 && (
        <Card><CardContent className="py-16 text-center"><CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-2" /><p className="text-lg font-medium">No upcoming renewals</p><p className="text-sm text-muted-foreground">All policies are up to date for the next 90 days</p></CardContent></Card>
      )}

      {emailLogs.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Log
              <Badge variant="secondary" className="ml-1">{emailLogs.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {emailLogs.map((log) => (
                <div key={log.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <div className={`rounded-full p-1.5 shrink-0 ${log.email_status === 'sent' ? 'bg-emerald-100' : 'bg-red-100'}`}>
                    {log.email_status === 'sent' ? (
                      <MailCheck className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <MailX className="h-3.5 w-3.5 text-red-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{log.email_subject}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">
                        To: {log.email_sent_to}
                      </span>
                      {log.client && (
                        <span className="text-xs text-muted-foreground">
                          ({(log.client as any).first_name} {(log.client as any).last_name})
                        </span>
                      )}
                    </div>
                    {log.error_message && (
                      <p className="text-xs text-red-500 mt-0.5 truncate">{log.error_message}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <Badge
                      variant={log.email_status === 'sent' ? 'secondary' : 'destructive'}
                      className="text-[10px]"
                    >
                      {log.reminder_type.replace('_', ' ')}
                    </Badge>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {formatDate(log.sent_at.split('T')[0])}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
