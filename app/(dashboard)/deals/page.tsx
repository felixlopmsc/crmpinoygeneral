'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { formatCurrency, formatDate, getInitials } from '@/lib/format';
import type { Deal, Client } from '@/lib/types';
import { DEAL_STAGES, POLICY_TYPES, CARRIERS, STAGE_PROBABILITIES } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, GripVertical, List, LayoutGrid } from 'lucide-react';

const stageColors: Record<string, string> = {
  'New Lead': 'border-t-blue-500',
  'Contacted': 'border-t-cyan-500',
  'Quote Sent': 'border-t-amber-500',
  'Negotiating': 'border-t-orange-500',
  'Closed Won': 'border-t-emerald-500',
  'Closed Lost': 'border-t-red-500',
};

const stageBgColors: Record<string, string> = {
  'New Lead': 'bg-blue-50',
  'Contacted': 'bg-cyan-50',
  'Quote Sent': 'bg-amber-50',
  'Negotiating': 'bg-orange-50',
  'Closed Won': 'bg-emerald-50',
  'Closed Lost': 'bg-red-50',
};

export default function DealsPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [deals, setDeals] = useState<(Deal & { client: Client })[]>([]);
  const [clients, setClients] = useState<Pick<Client, 'id' | 'first_name' | 'last_name'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(searchParams.get('new') === 'true');
  const [view, setView] = useState<'kanban' | 'list'>('kanban');

  const loadDeals = useCallback(async () => {
    const { data } = await supabase
      .from('deals')
      .select('*, client:clients(id, first_name, last_name, email)')
      .order('created_at', { ascending: false });
    setDeals((data as any) || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadDeals(); }, [loadDeals]);

  useEffect(() => {
    if (showForm) {
      supabase.from('clients').select('id, first_name, last_name').order('first_name').then(({ data }) => {
        setClients(data || []);
      });
    }
  }, [showForm]);

  const handleStageChange = async (dealId: string, newStage: string) => {
    const probability = STAGE_PROBABILITIES[newStage] ?? 0;
    const status = newStage === 'Closed Won' ? 'Won' : newStage === 'Closed Lost' ? 'Lost' : 'Open';
    await supabase.from('deals').update({ stage: newStage, probability, status, updated_at: new Date().toISOString() }).eq('id', dealId);
    loadDeals();
    toast.success(`Deal moved to ${newStage}`);
  };

  const handleSave = async (formData: any) => {
    const { error } = await supabase.from('deals').insert({
      ...formData,
      assigned_agent_id: user?.id,
      probability: STAGE_PROBABILITIES[formData.stage] ?? 10,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Deal created');
    setShowForm(false);
    loadDeals();
  };

  const openDeals = deals.filter((d) => d.status === 'Open');
  const totalPipelineValue = openDeals.reduce((sum, d) => sum + (d.value || 0), 0);
  const weightedValue = openDeals.reduce((sum, d) => sum + (d.value || 0) * (d.probability || 0) / 100, 0);

  if (loading) {
    return <div className="space-y-4"><div className="h-8 w-48 animate-pulse rounded bg-muted" /><div className="h-96 animate-pulse rounded-xl bg-muted" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sales Pipeline</h1>
          <p className="text-sm text-muted-foreground">
            {openDeals.length} open deals - {formatCurrency(totalPipelineValue)} pipeline - {formatCurrency(weightedValue)} weighted
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-lg border">
            <Button variant={view === 'kanban' ? 'secondary' : 'ghost'} size="sm" onClick={() => setView('kanban')}><LayoutGrid className="h-4 w-4" /></Button>
            <Button variant={view === 'list' ? 'secondary' : 'ghost'} size="sm" onClick={() => setView('list')}><List className="h-4 w-4" /></Button>
          </div>
          <Button onClick={() => setShowForm(true)} className="bg-[#1E40AF] hover:bg-[#1E3A8A] text-white">
            <Plus className="mr-1 h-4 w-4" /> New Deal
          </Button>
        </div>
      </div>

      {view === 'kanban' ? (
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
          {DEAL_STAGES.map((stage) => {
            const stageDeals = deals.filter((d) => d.stage === stage);
            const stageValue = stageDeals.reduce((sum, d) => sum + (d.value || 0), 0);
            return (
              <div key={stage} className="flex-shrink-0 w-[280px]">
                <div className={`rounded-t-lg px-3 py-2 ${stageBgColors[stage]}`}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">{stage}</h3>
                    <Badge variant="secondary" className="text-[10px]">{stageDeals.length}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{formatCurrency(stageValue)}</p>
                </div>
                <div className={`space-y-2 rounded-b-lg border border-t-4 ${stageColors[stage]} bg-muted/30 p-2 min-h-[200px]`}>
                  {stageDeals.map((deal) => (
                    <Card key={deal.id} className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardContent className="p-3">
                        <p className="text-sm font-medium truncate">{deal.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Link href={`/clients/${deal.client_id}`} className="text-xs text-[#1E40AF] hover:underline">
                            {(deal.client as any)?.first_name} {(deal.client as any)?.last_name}
                          </Link>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-sm font-semibold">{formatCurrency(deal.value)}</span>
                          <Badge variant="outline" className="text-[10px]">{deal.policy_type}</Badge>
                        </div>
                        {deal.expected_close_date && (
                          <p className="text-[10px] text-muted-foreground mt-1">Close: {formatDate(deal.expected_close_date)}</p>
                        )}
                        {stage !== 'Closed Won' && stage !== 'Closed Lost' && (
                          <div className="mt-2 flex gap-1">
                            {DEAL_STAGES.filter((s) => s !== stage).slice(0, 3).map((s) => (
                              <Button key={s} variant="ghost" size="sm" className="h-6 text-[10px] px-1.5"
                                onClick={(e) => { e.stopPropagation(); handleStageChange(deal.id, s); }}>
                                {s}
                              </Button>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b">
                <th className="text-left p-3 font-medium">Deal</th>
                <th className="text-left p-3 font-medium">Client</th>
                <th className="text-left p-3 font-medium">Stage</th>
                <th className="text-left p-3 font-medium">Type</th>
                <th className="text-right p-3 font-medium">Value</th>
                <th className="text-left p-3 font-medium">Close Date</th>
              </tr></thead>
              <tbody>
                {deals.map((deal) => (
                  <tr key={deal.id} className="border-b hover:bg-muted/50">
                    <td className="p-3 font-medium">{deal.title}</td>
                    <td className="p-3">
                      <Link href={`/clients/${deal.client_id}`} className="text-[#1E40AF] hover:underline">
                        {(deal.client as any)?.first_name} {(deal.client as any)?.last_name}
                      </Link>
                    </td>
                    <td className="p-3"><Badge variant="secondary" className="text-[10px]">{deal.stage}</Badge></td>
                    <td className="p-3">{deal.policy_type}</td>
                    <td className="p-3 text-right font-medium">{formatCurrency(deal.value)}</td>
                    <td className="p-3 text-muted-foreground">{deal.expected_close_date ? formatDate(deal.expected_close_date) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <DealFormDialog open={showForm} onOpenChange={setShowForm} clients={clients} onSave={handleSave} preselectedClientId={searchParams.get('client') || ''} />
    </div>
  );
}

function DealFormDialog({ open, onOpenChange, clients, onSave, preselectedClientId }: {
  open: boolean; onOpenChange: (o: boolean) => void; clients: Pick<Client, 'id' | 'first_name' | 'last_name'>[]; onSave: (data: any) => Promise<void>; preselectedClientId: string;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '', client_id: preselectedClientId, stage: 'New Lead', value: '',
    policy_type: 'Auto', carrier_quoted: '', expected_close_date: '', notes: '',
  });

  useEffect(() => {
    if (preselectedClientId) setForm((f) => ({ ...f, client_id: preselectedClientId }));
  }, [preselectedClientId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave({ ...form, value: parseFloat(form.value) || 0, quoted_premium: parseFloat(form.value) || 0 });
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>New Deal</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Client</Label>
            <Select value={form.client_id || 'none'} onValueChange={(v) => setForm({ ...form, client_id: v === 'none' ? '' : v })}>
              <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Select client</SelectItem>
                {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Auto Insurance Quote" required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Policy Type</Label>
              <Select value={form.policy_type} onValueChange={(v) => setForm({ ...form, policy_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{POLICY_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Stage</Label>
              <Select value={form.stage} onValueChange={(v) => setForm({ ...form, stage: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DEAL_STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Value ($)</Label><Input type="number" step="0.01" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} required /></div>
            <div className="space-y-1.5"><Label>Expected Close</Label><Input type="date" value={form.expected_close_date} onChange={(e) => setForm({ ...form, expected_close_date: e.target.value })} /></div>
          </div>
          <div className="space-y-1.5"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="bg-[#1E40AF] hover:bg-[#1E3A8A] text-white" disabled={saving}>{saving ? 'Saving...' : 'Create Deal'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
