'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { formatCurrency, formatDate, formatDateTime, formatPhone, formatRelativeDate, getInitials, daysUntil } from '@/lib/format';
import type { Client, Policy, Activity, Deal, Task, Claim } from '@/lib/types';
import { POLICY_TYPES, CARRIERS } from '@/lib/types';
import { SmartPolicyForm } from '@/components/forms/smart-policy-form';
import { TaskTemplateDialog } from '@/components/forms/task-template-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, Phone, Mail, MapPin, Calendar, Plus, Zap, FileText, TrendingUp, Shield, SquareCheck as CheckSquare, Clock, TriangleAlert as AlertTriangle, ExternalLink, StickyNote, CalendarPlus, Menu, DollarSign, Target, RefreshCw, Pencil } from 'lucide-react';
import { Select as StatusSelect, SelectContent as StatusSelectContent, SelectItem as StatusSelectItem, SelectTrigger as StatusSelectTrigger, SelectValue as StatusSelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const statusColors: Record<string, string> = {
  Lead: 'bg-blue-100 text-blue-700',
  Active: 'bg-emerald-100 text-emerald-700',
  Inactive: 'bg-gray-100 text-gray-700',
  Archived: 'bg-red-100 text-red-700',
};

const policyStatusColors: Record<string, string> = {
  Active: 'bg-emerald-100 text-emerald-700',
  Pending: 'bg-amber-100 text-amber-700',
  Cancelled: 'bg-red-100 text-red-700',
  Expired: 'bg-gray-100 text-gray-700',
};

export default function ClientProfilePage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [client, setClient] = useState<Client | null>(null);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [claims, setClaims] = useState<(Claim & { policy?: Policy })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [showPolicyForm, setShowPolicyForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showTaskTemplates, setShowTaskTemplates] = useState(false);
  const [showEditClient, setShowEditClient] = useState(false);
  const [crossSellOpps, setCrossSellOpps] = useState<any[]>([]);

  useEffect(() => {
    loadClient();
  }, [id]);

  async function loadClient() {
    const [clientRes, policiesRes, activitiesRes, dealsRes, tasksRes, claimsRes, crossSellRes] = await Promise.all([
      supabase.from('clients').select('*').eq('id', id).maybeSingle(),
      supabase.from('policies').select('*').eq('client_id', id).is('deleted_at', null).order('expiration_date', { ascending: false }),
      supabase.from('activities').select('*').eq('client_id', id).order('activity_date', { ascending: false }).limit(20),
      supabase.from('deals').select('*').eq('client_id', id).order('created_at', { ascending: false }),
      supabase.from('tasks').select('*').eq('related_client_id', id).order('due_date', { ascending: true }),
      supabase.from('claims').select('*, policy:policies(id, policy_number, policy_type, carrier)').eq('client_id', id).order('claim_date', { ascending: false }),
      supabase.from('cross_sell_opportunities').select('*').eq('client_id', id).eq('status', 'open').order('estimated_value', { ascending: false }),
    ]);

    setClient(clientRes.data);
    setPolicies(policiesRes.data || []);
    setActivities(activitiesRes.data || []);
    setDeals(dealsRes.data || []);
    setTasks(tasksRes.data || []);
    setClaims((claimsRes.data as any) || []);
    setCrossSellOpps(crossSellRes.data || []);
    setLoading(false);
  }

  async function logActivity(type: Activity['activity_type'], subject: string, description?: string) {
    if (!user?.id) return;
    const { error } = await supabase.from('activities').insert({
      client_id: id as string,
      activity_type: type,
      subject,
      description: description || '',
      activity_date: new Date().toISOString(),
      created_by: user.id,
    });
    if (error) {
      toast.error("Couldn't log activity");
    } else {
      toast.success('Activity logged');
      loadClient();
    }
  }

  const expiringPolicies = policies.filter((p) => {
    const days = daysUntil(p.expiration_date);
    return p.status === 'Active' && days >= 0 && days <= 30;
  });

  const crossSellTotal = crossSellOpps.reduce((sum: number, o: any) => sum + (o.estimated_value || 0), 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-32 animate-pulse rounded-xl bg-muted" />
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-lg font-medium">Client not found</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/clients">Back to Clients</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-1 text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>

      {expiringPolicies.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800">
            {expiringPolicies.length} {expiringPolicies.length === 1 ? 'policy expires' : 'policies expire'} within 30 days!
          </p>
        </div>
      )}

      {crossSellOpps.length > 0 && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center gap-3 mb-3">
            <TrendingUp className="h-5 w-5 text-[#10B981] shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-emerald-800">
                {crossSellOpps.length} Cross-Sell Opportunit{crossSellOpps.length > 1 ? 'ies' : 'y'}
              </p>
              <p className="text-xs text-emerald-700">
                Potential additional premium: {formatCurrency(crossSellTotal)}/year
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-100"
              onClick={async () => {
                const apiUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/analyze-cross-sell`;
                try {
                  await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ client_id: client.id }),
                  });
                  toast.success('Re-analyzed this client');
                  loadClient();
                } catch {
                  toast.error('Analysis failed');
                }
              }}
            >
              <RefreshCw className="mr-1 h-3 w-3" /> Re-scan
            </Button>
            <Button size="sm" variant="outline" className="shrink-0 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-100" asChild>
              <Link href={`/deals?new=true&client=${client.id}`}>Create Deal</Link>
            </Button>
          </div>
          <div className="space-y-2">
            {crossSellOpps.map((opp: any) => (
              <div key={opp.id} className="flex items-center gap-3 rounded-md bg-white p-2.5 border border-emerald-100">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge className={`text-[10px] ${
                      opp.priority === 'high' ? 'bg-red-100 text-red-700' :
                      opp.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                      'bg-emerald-100 text-emerald-700'
                    }`}>
                      {opp.priority}
                    </Badge>
                    <span className="text-sm font-medium">{opp.recommended_coverage}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {opp.pitch_message}
                  </p>
                </div>
                <span className="text-xs font-semibold text-[#10B981] shrink-0">
                  +{formatCurrency(opp.estimated_value)}/yr
                </span>
                <StatusSelect
                  value={opp.status}
                  onValueChange={async (val: string) => {
                    const updates: Record<string, any> = { status: val };
                    if (val === 'contacted') updates.contacted_at = new Date().toISOString();
                    if (val === 'quoted') updates.quoted_at = new Date().toISOString();
                    if (val === 'sold' || val === 'declined') updates.closed_at = new Date().toISOString();
                    const { error } = await supabase.from('cross_sell_opportunities').update(updates).eq('id', opp.id);
                    if (error) { toast.error('Failed to update'); return; }
                    toast.success(`Marked as ${val}`);
                    loadClient();
                  }}
                >
                  <StatusSelectTrigger className="h-7 w-[100px] text-[10px] shrink-0 bg-white">
                    <StatusSelectValue />
                  </StatusSelectTrigger>
                  <StatusSelectContent>
                    <StatusSelectItem value="open" className="text-xs">Open</StatusSelectItem>
                    <StatusSelectItem value="contacted" className="text-xs">Contacted</StatusSelectItem>
                    <StatusSelectItem value="quoted" className="text-xs">Quoted</StatusSelectItem>
                    <StatusSelectItem value="sold" className="text-xs">Sold</StatusSelectItem>
                    <StatusSelectItem value="declined" className="text-xs">Declined</StatusSelectItem>
                  </StatusSelectContent>
                </StatusSelect>
              </div>
            ))}
          </div>
        </div>
      )}

      <Card>
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <Avatar className="h-16 w-16 shrink-0">
              <AvatarFallback className="bg-[#2C3E6B] text-white text-lg">
                {getInitials(`${client.first_name} ${client.last_name}`)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold">{client.first_name} {client.last_name}</h1>
                <Badge className={statusColors[client.status]}>{client.status}</Badge>
                {client.source && <Badge variant="outline" className="text-xs">{client.source}</Badge>}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                {client.email ? (
                  <a href={`mailto:${client.email}`} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-[#2C3E6B]">
                    <Mail className="h-3.5 w-3.5" /> {client.email}
                  </a>
                ) : (
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground italic">
                    <Mail className="h-3.5 w-3.5" /> Not on file
                  </span>
                )}
                {client.phone ? (
                  <a href={`tel:${client.phone}`} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-[#2C3E6B]">
                    <Phone className="h-3.5 w-3.5" /> {formatPhone(client.phone)}
                  </a>
                ) : (
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground italic">
                    <Phone className="h-3.5 w-3.5" /> Not on file
                  </span>
                )}
              </div>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                {client.address_street || client.address_city ? (
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    {[client.address_street, client.address_city, client.address_state, client.address_zip].filter(Boolean).join(', ')}
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground italic">
                    <MapPin className="h-3.5 w-3.5" /> Not on file
                  </span>
                )}
                {client.date_of_birth ? (
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" /> {formatDate(client.date_of_birth)}
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground italic">
                    <Calendar className="h-3.5 w-3.5" /> Not on file
                  </span>
                )}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowEditClient(true)} className="shrink-0">
              <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit Client
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="sticky top-0 z-30 -mx-4 md:-mx-6 px-4 md:px-6 py-3 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="hidden sm:flex items-center gap-2">
          {client.phone ? (
            <Button size="sm" className="bg-[#10B981] hover:bg-[#059669] text-white" onClick={() => {
              logActivity('Call', `Called ${client.first_name} ${client.last_name}`, `Outbound call to ${formatPhone(client.phone)}`);
              window.open(`tel:${client.phone}`, '_self');
            }}>
              <Phone className="mr-1.5 h-3.5 w-3.5" /> Call
            </Button>
          ) : (
            <Button size="sm" disabled className="opacity-50"><Phone className="mr-1.5 h-3.5 w-3.5" /> Call</Button>
          )}
          {client.email ? (
            <Button size="sm" variant="outline" onClick={() => {
              logActivity('Email', `Emailed ${client.first_name} ${client.last_name}`, `Outbound email to ${client.email}`);
              window.open(`mailto:${client.email}`, '_self');
            }}>
              <Mail className="mr-1.5 h-3.5 w-3.5" /> Email
            </Button>
          ) : (
            <Button size="sm" variant="outline" disabled className="opacity-50"><Mail className="mr-1.5 h-3.5 w-3.5" /> Email</Button>
          )}
          <div className="w-px h-6 bg-border" />
          <Button size="sm" variant="outline" onClick={() => setShowNoteForm(true)}>
            <StickyNote className="mr-1.5 h-3.5 w-3.5" /> Add Note
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowTaskForm(true)}>
            <CalendarPlus className="mr-1.5 h-3.5 w-3.5" /> Schedule
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowPolicyForm(true)}>
            <FileText className="mr-1.5 h-3.5 w-3.5" /> Add Policy
          </Button>
        </div>
        <div className="flex sm:hidden items-center gap-2">
          {client.phone ? (
            <Button size="sm" className="bg-[#10B981] hover:bg-[#059669] text-white flex-1" onClick={() => {
              logActivity('Call', `Called ${client.first_name} ${client.last_name}`, `Outbound call to ${formatPhone(client.phone)}`);
              window.open(`tel:${client.phone}`, '_self');
            }}>
              <Phone className="mr-1.5 h-3.5 w-3.5" /> Call
            </Button>
          ) : (
            <Button size="sm" disabled className="opacity-50 flex-1"><Phone className="mr-1.5 h-3.5 w-3.5" /> Call</Button>
          )}
          {client.email ? (
            <Button size="sm" variant="outline" className="flex-1" onClick={() => {
              logActivity('Email', `Emailed ${client.first_name} ${client.last_name}`, `Outbound email to ${client.email}`);
              window.open(`mailto:${client.email}`, '_self');
            }}>
              <Mail className="mr-1.5 h-3.5 w-3.5" /> Email
            </Button>
          ) : (
            <Button size="sm" variant="outline" disabled className="opacity-50 flex-1"><Mail className="mr-1.5 h-3.5 w-3.5" /> Email</Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline"><Menu className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => setShowNoteForm(true)} className="gap-2">
                <StickyNote className="h-3.5 w-3.5" /> Add Note
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowTaskForm(true)} className="gap-2">
                <CalendarPlus className="h-3.5 w-3.5" /> Schedule
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowPolicyForm(true)} className="gap-2">
                <FileText className="h-3.5 w-3.5" /> Add Policy
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Tabs defaultValue="policies">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="policies" className="gap-1"><FileText className="h-3.5 w-3.5" /> Policies ({policies.length})</TabsTrigger>
          <TabsTrigger value="activities" className="gap-1"><Clock className="h-3.5 w-3.5" /> Activities ({activities.length})</TabsTrigger>
          <TabsTrigger value="deals" className="gap-1"><TrendingUp className="h-3.5 w-3.5" /> Deals ({deals.length})</TabsTrigger>
          <TabsTrigger value="tasks" className="gap-1"><CheckSquare className="h-3.5 w-3.5" /> Tasks ({tasks.length})</TabsTrigger>
          <TabsTrigger value="claims" className="gap-1"><Shield className="h-3.5 w-3.5" /> Claims ({claims.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="policies" className="mt-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold">Policies</h3>
            <Button size="sm" onClick={() => setShowPolicyForm(true)} className="bg-gradient-to-r from-[#2C3E6B] to-[#1B2A4A] hover:from-[#1B2A4A] hover:to-[#2C3E6B] text-white border border-[#B8962E]/20">
              <Plus className="mr-1 h-3.5 w-3.5" /> Add Policy
            </Button>
          </div>
          {policies.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No policies yet</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {policies.map((policy) => {
                const days = daysUntil(policy.expiration_date);
                return (
                  <Link key={policy.id} href={`/policies/${policy.id}`}>
                    <Card className="hover:shadow-sm transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{policy.policy_type}</p>
                              <Badge className={policyStatusColors[policy.status] || ''}>{policy.status}</Badge>
                              {policy.status === 'Active' && days <= 30 && days >= 0 && (
                                <Badge variant="outline" className="text-amber-600 border-amber-300 text-[10px]">{days}d left</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-0.5">
                              {policy.carrier} {policy.policy_number && `- #${policy.policy_number}`}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-semibold">{formatCurrency(policy.annual_premium)}/yr</p>
                            <p className="text-xs text-muted-foreground">
                              Exp: {formatDate(policy.expiration_date)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="activities" className="mt-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold">Activity Timeline</h3>
            <Button size="sm" onClick={() => setShowActivityForm(true)} className="bg-gradient-to-r from-[#2C3E6B] to-[#1B2A4A] hover:from-[#1B2A4A] hover:to-[#2C3E6B] text-white border border-[#B8962E]/20">
              <Plus className="mr-1 h-3.5 w-3.5" /> Log Activity
            </Button>
          </div>
          {activities.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No activities logged</CardContent></Card>
          ) : (
            <div className="relative space-y-3 pl-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-border">
              {activities.map((activity) => {
                const icons: Record<string, any> = { Call: Phone, Email: Mail, Meeting: Calendar, Note: FileText, Task: CheckSquare, SMS: Phone };
                const Icon = icons[activity.activity_type] || FileText;
                return (
                  <div key={activity.id} className="relative">
                    <div className="absolute -left-6 top-1 rounded-full border-2 border-white bg-muted p-1">
                      <Icon className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <Card>
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-medium">{activity.subject}</p>
                            {activity.description && <p className="text-xs text-muted-foreground mt-0.5">{activity.description}</p>}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant="secondary" className="text-[10px]">{activity.activity_type}</Badge>
                            <span className="text-xs text-muted-foreground">{formatDateTime(activity.activity_date)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="deals" className="mt-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold">Deals</h3>
            <Button size="sm" asChild className="bg-gradient-to-r from-[#2C3E6B] to-[#1B2A4A] hover:from-[#1B2A4A] hover:to-[#2C3E6B] text-white border border-[#B8962E]/20">
              <Link href={`/deals?new=true&client=${client.id}`}>
                <Plus className="mr-1 h-3.5 w-3.5" /> New Deal
              </Link>
            </Button>
          </div>
          {deals.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No deals yet</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {deals.map((deal) => (
                <Card key={deal.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{deal.title}</p>
                      <p className="text-xs text-muted-foreground">{deal.policy_type} - {deal.stage}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold">{formatCurrency(deal.value)}</p>
                      <Badge variant={deal.status === 'Won' ? 'default' : deal.status === 'Lost' ? 'destructive' : 'secondary'} className="text-[10px]">
                        {deal.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="tasks" className="mt-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold">Tasks</h3>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowTaskTemplates(true)} className="gap-1">
                <Zap className="h-3.5 w-3.5 text-[#2C3E6B]" /> Templates
              </Button>
              <Button size="sm" onClick={() => setShowTaskForm(true)} className="bg-gradient-to-r from-[#2C3E6B] to-[#1B2A4A] hover:from-[#1B2A4A] hover:to-[#2C3E6B] text-white border border-[#B8962E]/20">
                <Plus className="mr-1 h-3.5 w-3.5" /> Add Task
              </Button>
            </div>
          </div>
          {tasks.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No tasks</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => (
                <Card key={task.id}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={task.status === 'Completed'}
                      onChange={async () => {
                        const newStatus = task.status === 'Completed' ? 'To Do' : 'Completed';
                        await supabase.from('tasks').update({ status: newStatus, completed_at: newStatus === 'Completed' ? new Date().toISOString() : null }).eq('id', task.id);
                        loadClient();
                      }}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${task.status === 'Completed' ? 'line-through text-muted-foreground' : ''}`}>{task.title}</p>
                      {task.due_date && <p className="text-xs text-muted-foreground">{formatRelativeDate(task.due_date.split('T')[0])}</p>}
                    </div>
                    <Badge variant={task.priority === 'Urgent' ? 'destructive' : 'secondary'} className="text-[10px]">{task.priority}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="claims" className="mt-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold">Claims</h3>
            <Button size="sm" asChild className="bg-gradient-to-r from-[#2C3E6B] to-[#1B2A4A] hover:from-[#1B2A4A] hover:to-[#2C3E6B] text-white border border-[#B8962E]/20">
              <Link href={`/claims?new=true&client=${client.id}`}>
                <Plus className="mr-1 h-3.5 w-3.5" /> File Claim
              </Link>
            </Button>
          </div>
          {claims.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No claims filed</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {claims.map((claim) => (
                <Card key={claim.id}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{claim.claim_type} {claim.claim_number && `- #${claim.claim_number}`}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(claim.claim_date)} - {(claim.policy as any)?.carrier}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold">{formatCurrency(claim.claim_amount)}</p>
                      <Badge variant="secondary" className="text-[10px]">{claim.status}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <ActivityFormDialog
        open={showActivityForm}
        onOpenChange={setShowActivityForm}
        clientId={client.id}
        userId={user?.id || ''}
        onSaved={loadClient}
      />

      <SmartPolicyForm
        open={showPolicyForm}
        onOpenChange={setShowPolicyForm}
        clientId={client.id}
        userId={user?.id || ''}
        onSaved={loadClient}
      />

      <TaskFormDialog
        open={showTaskForm}
        onOpenChange={setShowTaskForm}
        clientId={client.id}
        userId={user?.id || ''}
        onSaved={loadClient}
      />

      <TaskTemplateDialog
        open={showTaskTemplates}
        onOpenChange={setShowTaskTemplates}
        clientId={client.id}
        userId={user?.id || ''}
        onSaved={loadClient}
      />

      <QuickNoteDialog
        open={showNoteForm}
        onOpenChange={setShowNoteForm}
        clientId={client.id}
        userId={user?.id || ''}
        onSaved={loadClient}
      />

      <EditClientDialog
        open={showEditClient}
        onOpenChange={setShowEditClient}
        client={client}
        onSaved={loadClient}
      />
    </div>
  );
}

function ActivityFormDialog({ open, onOpenChange, clientId, userId, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; clientId: string; userId: string; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ activity_type: 'Call' as Activity['activity_type'], subject: '', description: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from('activities').insert({
      client_id: clientId,
      activity_type: form.activity_type,
      subject: form.subject,
      description: form.description,
      activity_date: new Date().toISOString(),
      created_by: userId,
    });
    if (error) toast.error(error.message);
    else { toast.success('Activity logged'); onOpenChange(false); setForm({ activity_type: 'Call', subject: '', description: '' }); onSaved(); }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Log Activity</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={form.activity_type} onValueChange={(v) => setForm({ ...form, activity_type: v as Activity['activity_type'] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['Call', 'Email', 'Meeting', 'Note', 'SMS'].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Subject</Label>
            <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="bg-gradient-to-r from-[#2C3E6B] to-[#1B2A4A] hover:from-[#1B2A4A] hover:to-[#2C3E6B] text-white border border-[#B8962E]/20" disabled={saving}>{saving ? 'Saving...' : 'Log Activity'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}


function QuickNoteDialog({ open, onOpenChange, clientId, userId, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; clientId: string; userId: string; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from('activities').insert({
      client_id: clientId,
      activity_type: 'Note',
      subject: note.slice(0, 80) + (note.length > 80 ? '...' : ''),
      description: note,
      activity_date: new Date().toISOString(),
      created_by: userId,
    });
    if (error) toast.error("Couldn't log activity");
    else { toast.success('Activity logged'); onOpenChange(false); setNote(''); onSaved(); }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><StickyNote className="h-4 w-4 text-[#2C3E6B]" /> Quick Note</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Type your note here..."
            rows={4}
            required
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="bg-gradient-to-r from-[#2C3E6B] to-[#1B2A4A] hover:from-[#1B2A4A] hover:to-[#2C3E6B] text-white border border-[#B8962E]/20" disabled={saving}>{saving ? 'Saving...' : 'Save Note'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TaskFormDialog({ open, onOpenChange, clientId, userId, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; clientId: string; userId: string; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', due_date: '', priority: 'Medium' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from('tasks').insert({
      title: form.title,
      description: form.description,
      due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
      priority: form.priority,
      related_client_id: clientId,
      assigned_to: userId,
      created_by: userId,
    });
    if (error) { toast.error(error.message); }
    else {
      await supabase.from('activities').insert({
        client_id: clientId,
        activity_type: 'Meeting',
        subject: form.title,
        description: form.description,
        activity_date: new Date().toISOString(),
        due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
        created_by: userId,
      });
      toast.success('Activity logged');
      onOpenChange(false);
      setForm({ title: '', description: '', due_date: '', priority: 'Medium' });
      onSaved();
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Task</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5"><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
          <div className="space-y-1.5"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Due Date</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['Low', 'Medium', 'High', 'Urgent'].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="bg-gradient-to-r from-[#2C3E6B] to-[#1B2A4A] hover:from-[#1B2A4A] hover:to-[#2C3E6B] text-white border border-[#B8962E]/20" disabled={saving}>{saving ? 'Saving...' : 'Create Task'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditClientDialog({ open, onOpenChange, client, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; client: Client; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    first_name: client.first_name || '',
    last_name: client.last_name || '',
    email: client.email || '',
    phone: client.phone || '',
    date_of_birth: client.date_of_birth || '',
    address_street: client.address_street || '',
    address_city: client.address_city || '',
    address_state: client.address_state || '',
    address_zip: client.address_zip || '',
  });

  useEffect(() => {
    if (open) {
      setForm({
        first_name: client.first_name || '',
        last_name: client.last_name || '',
        email: client.email || '',
        phone: client.phone || '',
        date_of_birth: client.date_of_birth || '',
        address_street: client.address_street || '',
        address_city: client.address_city || '',
        address_state: client.address_state || '',
        address_zip: client.address_zip || '',
      });
      setError('');
    }
  }, [open, client]);

  function validate(): string | null {
    if (!form.first_name.trim()) return 'First name is required.';
    if (!form.last_name.trim()) return 'Last name is required.';
    if (form.phone && !/^[\d\s()+-]{7,}$/.test(form.phone)) return 'Phone number format is invalid.';
    if (form.date_of_birth) {
      const dob = new Date(form.date_of_birth);
      if (isNaN(dob.getTime()) || dob >= new Date()) return 'Date of birth must be a valid past date.';
    }
    if (form.address_street || form.address_city || form.address_state || form.address_zip) {
      if (!form.address_street.trim() || !form.address_city.trim() || !form.address_state.trim() || !form.address_zip.trim()) {
        return 'Address requires street, city, state, and ZIP.';
      }
    }
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setError('');
    setSaving(true);

    const { error: updateErr } = await supabase
      .from('clients')
      .update({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        date_of_birth: form.date_of_birth || null,
        address_street: form.address_street.trim(),
        address_city: form.address_city.trim(),
        address_state: form.address_state.trim(),
        address_zip: form.address_zip.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', client.id);

    setSaving(false);
    if (updateErr) {
      setError('Failed to save changes. Please try again.');
      return;
    }
    toast.success('Client updated');
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Edit Client</DialogTitle></DialogHeader>
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>First Name *</Label>
              <Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label>Last Name *</Label>
              <Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(555) 555-5555" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Date of Birth</Label>
            <Input type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} max={new Date().toISOString().split('T')[0]} />
          </div>
          <div className="space-y-1.5">
            <Label>Street Address</Label>
            <Input value={form.address_street} onChange={(e) => setForm({ ...form, address_street: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>City</Label>
              <Input value={form.address_city} onChange={(e) => setForm({ ...form, address_city: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>State</Label>
              <Input value={form.address_state} onChange={(e) => setForm({ ...form, address_state: e.target.value })} maxLength={2} />
            </div>
            <div className="space-y-1.5">
              <Label>ZIP</Label>
              <Input value={form.address_zip} onChange={(e) => setForm({ ...form, address_zip: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="bg-gradient-to-r from-[#2C3E6B] to-[#1B2A4A] hover:from-[#1B2A4A] hover:to-[#2C3E6B] text-white border border-[#B8962E]/20" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
