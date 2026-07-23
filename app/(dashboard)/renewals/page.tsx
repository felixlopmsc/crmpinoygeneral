'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { formatCurrency, formatDate, daysUntil, formatPhone } from '@/lib/format';
import type { Policy, Client } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getInitials } from '@/lib/format';
import { toast } from 'sonner';
import { Phone, Mail, TriangleAlert as AlertTriangle, Clock, CircleCheck as CheckCircle2, Send, RefreshCw, MailCheck, MailX, ArrowUpRight } from 'lucide-react';

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
  const router = useRouter();
  const { user } = useAuth();
  const [policies, setPolicies] = useState<RenewalPolicy[]>([]);
  const [emailLogs, setEmailLogs] = useState<RenewalLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [sendingForPolicy, setSendingForPolicy] = useState<string | null>(null);
  const [composeTarget, setComposeTarget] = useState<RenewalPolicy | null>(null);
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [composeSending, setComposeSending] = useState(false);
  const [logContactTarget, setLogContactTarget] = useState<RenewalPolicy | null>(null);
  const [logContactType, setLogContactType] = useState<'Call' | 'Email' | 'Note'>('Call');
  const [logContactNotes, setLogContactNotes] = useState('');
  const [logContactSaving, setLogContactSaving] = useState(false);

  useEffect(() => { loadRenewals(); loadEmailLogs(); }, []);

  async function loadRenewals() {
    const today = new Date().toISOString().split('T')[0];
    const future30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const { data } = await supabase
      .from('policies')
      .select('*, client:clients(id, first_name, last_name, email, phone)')
      .ilike('status', 'Active')
      .is('deleted_at', null)
      .gte('expiration_date', today)
      .lte('expiration_date', future30)
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
          <p className="text-sm text-muted-foreground">{policies.length} policies expiring in next 30 days</p>
        </div>
        <Button
          onClick={triggerRenewalCheck}
          disabled={triggering}
          className="bg-gradient-to-r from-[#2C3E6B] to-[#1B2A4A] hover:from-[#1B2A4A] hover:to-[#2C3E6B] text-white border border-[#B8962E]/20"
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
                  <Card key={policy.id} className={`border-l-4 ${group.color} cursor-pointer transition-colors hover:bg-muted/50`} onClick={() => router.push(`/policies/${policy.id}`)}>
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row items-start gap-3">
                        <Avatar className="h-10 w-10 shrink-0">
                          <AvatarFallback className="bg-[#2C3E6B] text-white text-xs">
                            {getInitials(`${(policy.client as any)?.first_name} ${(policy.client as any)?.last_name}`)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <Link href={`/clients/${policy.client_id}`} className="font-semibold text-[#2C3E6B] hover:underline" onClick={(e) => e.stopPropagation()}>
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
                        <div className="flex gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => sendRenewalEmail(policy.id)}
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
                          <Button size="sm" variant="outline" title="Compose email" onClick={() => {
                            setComposeTarget(policy);
                            setComposeSubject(`Renewal Reminder - ${policy.policy_type} Policy #${policy.policy_number || ''}`);
                            setComposeBody(`Hi ${(policy.client as any)?.first_name},\n\nThis is a reminder that your ${policy.policy_type} policy with ${policy.carrier} is expiring on ${formatDate(policy.expiration_date)}.\n\nPlease let us know how you'd like to proceed with your renewal.\n\nBest regards`);
                          }}>
                            <Mail className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="outline" title="Log contact" onClick={() => {
                            setLogContactTarget(policy);
                            setLogContactType('Call');
                            setLogContactNotes('');
                          }}>
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/policies/${policy.id}`}>View</Link>
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
        <Card><CardContent className="py-16 text-center"><CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-2" /><p className="text-lg font-medium">No upcoming renewals</p><p className="text-sm text-muted-foreground">All policies are up to date for the next 30 days</p></CardContent></Card>
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

      {/* Compose Email Modal */}
      <Dialog open={!!composeTarget} onOpenChange={(open) => { if (!open) setComposeTarget(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Compose Renewal Email</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="text-sm text-muted-foreground">
              To: {(composeTarget?.client as any)?.email || 'No email'}
            </div>
            <div className="space-y-1.5">
              <Label>Subject</Label>
              <Input value={composeSubject} onChange={(e) => setComposeSubject(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Message</Label>
              <Textarea rows={6} value={composeBody} onChange={(e) => setComposeBody(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setComposeTarget(null)}>Cancel</Button>
              <Button
                disabled={composeSending}
                className="bg-[#2C3E6B] hover:bg-[#1B2A4A] text-white"
                onClick={async () => {
                  if (!composeTarget || !user?.id) return;
                  setComposeSending(true);
                  const clientEmail = (composeTarget.client as any)?.email;
                  if (clientEmail) {
                    window.open(`mailto:${clientEmail}?subject=${encodeURIComponent(composeSubject)}&body=${encodeURIComponent(composeBody)}`, '_blank');
                  }
                  const { error } = await supabase.from('activities').insert({
                    client_id: composeTarget.client_id,
                    activity_type: 'Email',
                    subject: composeSubject || 'Renewal email',
                    description: composeBody,
                    activity_date: new Date().toISOString(),
                    completed: true,
                    created_by: user.id,
                  });
                  if (error) {
                    toast.error("Couldn't log activity");
                  } else {
                    toast.success('Activity logged');
                  }
                  setComposeSending(false);
                  setComposeTarget(null);
                }}
              >
                {composeSending ? 'Sending...' : 'Send & Log'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Log Contact Modal */}
      <Dialog open={!!logContactTarget} onOpenChange={(open) => { if (!open) setLogContactTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Log Contact</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="text-sm text-muted-foreground">
              Client: {(logContactTarget?.client as any)?.first_name} {(logContactTarget?.client as any)?.last_name}
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={logContactType} onValueChange={(v) => setLogContactType(v as 'Call' | 'Email' | 'Note')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Call">Call</SelectItem>
                  <SelectItem value="Email">Email</SelectItem>
                  <SelectItem value="Note">Note</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea rows={3} value={logContactNotes} onChange={(e) => setLogContactNotes(e.target.value)} placeholder="Add notes about this contact..." />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setLogContactTarget(null)}>Cancel</Button>
              <Button
                disabled={logContactSaving}
                className="bg-[#2C3E6B] hover:bg-[#1B2A4A] text-white"
                onClick={async () => {
                  if (!logContactTarget || !user?.id) return;
                  setLogContactSaving(true);
                  const clientName = `${(logContactTarget.client as any)?.first_name || ''} ${(logContactTarget.client as any)?.last_name || ''}`.trim();
                  const { error } = await supabase.from('activities').insert({
                    client_id: logContactTarget.client_id,
                    activity_type: logContactType,
                    subject: `${logContactType} - ${clientName} (Renewal)`,
                    description: logContactNotes || '',
                    activity_date: new Date().toISOString(),
                    completed: true,
                    created_by: user.id,
                  });
                  if (error) {
                    toast.error("Couldn't log activity");
                  } else {
                    toast.success('Activity logged');
                  }
                  setLogContactSaving(false);
                  setLogContactTarget(null);
                }}
              >
                {logContactSaving ? 'Saving...' : 'Log Activity'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
