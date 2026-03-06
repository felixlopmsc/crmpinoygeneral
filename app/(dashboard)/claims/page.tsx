'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { formatCurrency, formatDate } from '@/lib/format';
import type { Claim, Client, Policy } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, Shield, Filter } from 'lucide-react';

const statusColors: Record<string, string> = {
  Filed: 'bg-blue-100 text-blue-700',
  'Under Review': 'bg-amber-100 text-amber-700',
  Approved: 'bg-emerald-100 text-emerald-700',
  Denied: 'bg-red-100 text-red-700',
  Paid: 'bg-green-100 text-green-700',
  Closed: 'bg-gray-100 text-gray-700',
};

export default function ClaimsPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [claims, setClaims] = useState<(Claim & { client: Client; policy: Policy })[]>([]);
  const [clients, setClients] = useState<(Client & { policies?: Policy[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(searchParams.get('new') === 'true');

  const loadClaims = useCallback(async () => {
    let query = supabase
      .from('claims')
      .select('*, client:clients(id, first_name, last_name), policy:policies(id, policy_number, policy_type, carrier)')
      .order('claim_date', { ascending: false });

    if (statusFilter !== 'all') query = query.eq('status', statusFilter);

    const { data } = await query.limit(100);
    setClaims((data as any) || []);
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { loadClaims(); }, [loadClaims]);

  const handleOpenForm = async () => {
    const { data } = await supabase.from('clients').select('id, first_name, last_name, policies:policies(id, policy_number, policy_type, carrier)').order('first_name').limit(100);
    setClients((data as any) || []);
    setShowForm(true);
  };

  const handleSave = async (formData: any) => {
    const { error } = await supabase.from('claims').insert(formData);
    if (error) { toast.error(error.message); return; }
    toast.success('Claim filed');
    setShowForm(false);
    loadClaims();
  };

  const handleStatusUpdate = async (claimId: string, newStatus: string) => {
    await supabase.from('claims').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', claimId);
    loadClaims();
    toast.success('Status updated');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Claims</h1>
          <p className="text-sm text-muted-foreground">{claims.length} claims</p>
        </div>
        <Button onClick={handleOpenForm} className="bg-[#1E40AF] hover:bg-[#1E3A8A] text-white">
          <Plus className="mr-1 h-4 w-4" /> File Claim
        </Button>
      </div>

      <div className="flex gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><Filter className="mr-2 h-4 w-4" /><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {['Filed', 'Under Review', 'Approved', 'Denied', 'Paid', 'Closed'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-14 animate-pulse rounded bg-muted" />)}</div>
      ) : claims.length === 0 ? (
        <Card><CardContent className="py-16 text-center"><Shield className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" /><p className="text-lg font-medium">No claims found</p></CardContent></Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Claim #</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Policy</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {claims.map((claim) => (
                  <TableRow key={claim.id}>
                    <TableCell>
                      <Link href={`/clients/${claim.client_id}`} className="font-medium text-[#1E40AF] hover:underline">
                        {(claim.client as any)?.first_name} {(claim.client as any)?.last_name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{claim.claim_number || '-'}</TableCell>
                    <TableCell>{claim.claim_type}</TableCell>
                    <TableCell className="text-muted-foreground">{(claim.policy as any)?.policy_type} - {(claim.policy as any)?.carrier}</TableCell>
                    <TableCell>{formatDate(claim.claim_date)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(claim.claim_amount)}</TableCell>
                    <TableCell>
                      <Select value={claim.status} onValueChange={(v) => handleStatusUpdate(claim.id, v)}>
                        <SelectTrigger className="h-7 w-32 text-xs">
                          <Badge className={`${statusColors[claim.status]} text-[10px]`}>{claim.status}</Badge>
                        </SelectTrigger>
                        <SelectContent>
                          {['Filed', 'Under Review', 'Approved', 'Denied', 'Paid', 'Closed'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>File a Claim</DialogTitle></DialogHeader>
          <ClaimForm
            clients={clients}
            onSave={handleSave}
            onCancel={() => setShowForm(false)}
            preselectedClientId={searchParams.get('client') || ''}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ClaimForm({ clients, onSave, onCancel, preselectedClientId }: {
  clients: (Client & { policies?: Policy[] })[]; onSave: (data: any) => Promise<void>; onCancel: () => void; preselectedClientId: string;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    client_id: preselectedClientId, policy_id: '', claim_number: '', claim_date: '',
    claim_type: 'Auto Accident', description: '', claim_amount: '', adjuster_name: '', adjuster_phone: '',
  });

  const selectedClient = clients.find((c) => c.id === form.client_id);
  const clientPolicies = (selectedClient as any)?.policies || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave({
      ...form,
      claim_amount: parseFloat(form.claim_amount) || 0,
      reported_date: new Date().toISOString().split('T')[0],
    });
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Client</Label>
        <Select value={form.client_id || 'none'} onValueChange={(v) => setForm({ ...form, client_id: v === 'none' ? '' : v, policy_id: '' })}>
          <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Select client</SelectItem>
            {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {clientPolicies.length > 0 && (
        <div className="space-y-1.5">
          <Label>Policy</Label>
          <Select value={form.policy_id || 'none'} onValueChange={(v) => setForm({ ...form, policy_id: v === 'none' ? '' : v })}>
            <SelectTrigger><SelectValue placeholder="Select policy" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Select policy</SelectItem>
              {clientPolicies.map((p: Policy) => <SelectItem key={p.id} value={p.id}>{p.policy_type} - {p.carrier} {p.policy_number && `(#${p.policy_number})`}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label>Claim Number</Label><Input value={form.claim_number} onChange={(e) => setForm({ ...form, claim_number: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Claim Date</Label><Input type="date" value={form.claim_date} onChange={(e) => setForm({ ...form, claim_date: e.target.value })} required /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Type</Label>
          <Select value={form.claim_type} onValueChange={(v) => setForm({ ...form, claim_type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{['Auto Accident', 'Property Damage', 'Theft', 'Injury', 'Liability', 'Other'].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>Amount</Label><Input type="number" step="0.01" value={form.claim_amount} onChange={(e) => setForm({ ...form, claim_amount: e.target.value })} /></div>
      </div>
      <div className="space-y-1.5"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label>Adjuster Name</Label><Input value={form.adjuster_name} onChange={(e) => setForm({ ...form, adjuster_name: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Adjuster Phone</Label><Input value={form.adjuster_phone} onChange={(e) => setForm({ ...form, adjuster_phone: e.target.value })} /></div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="bg-[#1E40AF] hover:bg-[#1E3A8A] text-white" disabled={saving}>{saving ? 'Saving...' : 'File Claim'}</Button>
      </div>
    </form>
  );
}
