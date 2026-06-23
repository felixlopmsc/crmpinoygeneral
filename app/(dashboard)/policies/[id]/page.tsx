'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDate } from '@/lib/format';
import type { Policy, Client } from '@/lib/types';
import { POLICY_TYPES, CARRIERS } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Car,
  Chrome as Home,
  Building2,
  Briefcase,
  Heart,
  Umbrella,
  Pencil,
  Trash2,
  Save,
  X,
  User,
} from 'lucide-react';

const statusColors: Record<string, string> = {
  Active: 'bg-emerald-100 text-emerald-700',
  Pending: 'bg-amber-100 text-amber-700',
  Cancelled: 'bg-red-100 text-red-700',
  Expired: 'bg-gray-100 text-gray-700',
};

const typeIcons: Record<string, any> = {
  Auto: Car,
  Home: Home,
  Renters: Building2,
  Business: Briefcase,
  Life: Heart,
  Umbrella: Umbrella,
};

interface PolicyWithClient extends Policy {
  client: Client;
}

export default function PolicyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [policy, setPolicy] = useState<PolicyWithClient | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    policy_number: '',
    carrier: '',
    policy_type: '' as string,
    coverage_type: '',
    effective_date: '',
    expiration_date: '',
    annual_premium: '',
    commission_rate: '',
    status: '' as string,
    payment_frequency: '' as string,
    auto_renewal: true,
    notes: '',
  });

  useEffect(() => {
    loadPolicy();
  }, [id]);

  async function loadPolicy() {
    const { data, error: err } = await supabase
      .from('policies')
      .select('*, client:clients(id, first_name, last_name, email, phone)')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();

    if (err || !data) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setPolicy(data as any);
    setForm({
      policy_number: data.policy_number || '',
      carrier: data.carrier || '',
      policy_type: data.policy_type,
      coverage_type: data.coverage_type || '',
      effective_date: data.effective_date || '',
      expiration_date: data.expiration_date || '',
      annual_premium: String(data.annual_premium || 0),
      commission_rate: String(data.commission_rate || 0),
      status: data.status,
      payment_frequency: data.payment_frequency || 'Monthly',
      auto_renewal: data.auto_renewal ?? true,
      notes: data.notes || '',
    });
    setLoading(false);
  }

  function validate(): string | null {
    if (!form.carrier.trim()) return 'Carrier is required.';
    if (!form.policy_number.trim()) return 'Policy number is required.';
    if (!form.policy_type) return 'Policy type is required.';
    if (!form.effective_date) return 'Effective date is required.';
    if (!form.expiration_date) return 'Expiration date is required.';
    const premium = parseFloat(form.annual_premium);
    if (isNaN(premium) || premium < 0) return 'Premium must be a non-negative number.';
    const rate = parseFloat(form.commission_rate);
    if (isNaN(rate) || rate < 0) return 'Commission rate must be a non-negative number.';
    if (form.expiration_date <= form.effective_date) return 'Expiration date must be after effective date.';
    return null;
  }

  async function handleSave() {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setSaving(true);

    const premium = parseFloat(form.annual_premium);
    const rate = parseFloat(form.commission_rate);

    const { error: updateErr } = await supabase
      .from('policies')
      .update({
        policy_number: form.policy_number.trim(),
        carrier: form.carrier.trim(),
        policy_type: form.policy_type,
        coverage_type: form.coverage_type.trim(),
        effective_date: form.effective_date,
        expiration_date: form.expiration_date,
        annual_premium: premium,
        commission_rate: rate,
        commission_amount: premium * (rate / 100),
        status: form.status,
        payment_frequency: form.payment_frequency,
        auto_renewal: form.auto_renewal,
        notes: form.notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    setSaving(false);

    if (updateErr) {
      setError('Failed to save changes. Please try again.');
      return;
    }

    toast.success('Policy updated successfully');
    setEditing(false);
    loadPolicy();
  }

  async function handleDelete() {
    const { error: delErr } = await supabase
      .from('policies')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (delErr) {
      toast.error('Failed to delete policy');
      return;
    }

    toast.success('Policy deleted');
    router.push('/policies');
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h2 className="text-xl font-semibold">Policy Not Found</h2>
        <p className="text-sm text-muted-foreground mt-1">This policy may have been deleted or doesn&apos;t exist.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/policies"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Policies</Link>
        </Button>
      </div>
    );
  }

  if (!policy) return null;

  const Icon = typeIcons[policy.policy_type] || Briefcase;
  const insured = (policy.insured_items || {}) as Record<string, any>;
  const showVehicle = policy.policy_type === 'Auto' && Boolean(insured.year || insured.make || insured.model || insured.vin);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/policies"><ArrowLeft className="mr-1 h-4 w-4" /> Policies</Link>
        </Button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-[#2C3E6B]/10 p-2.5">
            <Icon className="h-6 w-6 text-[#2C3E6B]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{policy.policy_type} Policy</h1>
              <Badge className={`${statusColors[policy.status]} text-xs`}>{policy.status}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {policy.carrier} {policy.policy_number && `- #${policy.policy_number}`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {!editing ? (
            <>
              <Button onClick={() => setEditing(true)} variant="outline" size="sm">
                <Pencil className="mr-1 h-4 w-4" /> Edit
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50">
                    <Trash2 className="mr-1 h-4 w-4" /> Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this policy?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will archive the policy. It will no longer appear in any lists, but commission and audit history will be preserved.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                      Delete Policy
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          ) : (
            <>
              <Button onClick={handleSave} disabled={saving} size="sm" className="bg-gradient-to-r from-[#2C3E6B] to-[#1B2A4A] text-white">
                <Save className="mr-1 h-4 w-4" /> {saving ? 'Saving...' : 'Save'}
              </Button>
              <Button onClick={() => { setEditing(false); setError(''); loadPolicy(); }} variant="outline" size="sm">
                <X className="mr-1 h-4 w-4" /> Cancel
              </Button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Policy Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {editing ? (
              <>
                <div className="space-y-2">
                  <Label>Policy Number *</Label>
                  <Input value={form.policy_number} onChange={(e) => setForm({ ...form, policy_number: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Carrier *</Label>
                  <Select value={form.carrier} onValueChange={(v) => setForm({ ...form, carrier: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CARRIERS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Policy Type *</Label>
                  <Select value={form.policy_type} onValueChange={(v) => setForm({ ...form, policy_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {POLICY_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Coverage Type</Label>
                  <Input value={form.coverage_type} onChange={(e) => setForm({ ...form, coverage_type: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Cancelled">Cancelled</SelectItem>
                      <SelectItem value="Expired">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Payment Frequency</Label>
                  <Select value={form.payment_frequency} onValueChange={(v) => setForm({ ...form, payment_frequency: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Monthly">Monthly</SelectItem>
                      <SelectItem value="Quarterly">Quarterly</SelectItem>
                      <SelectItem value="Semi-Annual">Semi-Annual</SelectItem>
                      <SelectItem value="Annual">Annual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Policy Number</p>
                  <p className="font-medium">{policy.policy_number || '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Carrier</p>
                  <p className="font-medium">{policy.carrier}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Type</p>
                  <p className="font-medium">{policy.policy_type}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Coverage</p>
                  <p className="font-medium">{policy.coverage_type || '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge className={`${statusColors[policy.status]} text-xs`}>{policy.status}</Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Payment</p>
                  <p className="font-medium">{policy.payment_frequency}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Auto-Renewal</p>
                  <p className="font-medium">{policy.auto_renewal ? 'Yes' : 'No'}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Dates & Financials</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {editing ? (
              <>
                <div className="space-y-2">
                  <Label>Effective Date *</Label>
                  <Input type="date" value={form.effective_date} onChange={(e) => setForm({ ...form, effective_date: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Expiration Date *</Label>
                  <Input type="date" value={form.expiration_date} onChange={(e) => setForm({ ...form, expiration_date: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Annual Premium ($) *</Label>
                  <Input type="number" min="0" step="0.01" value={form.annual_premium} onChange={(e) => setForm({ ...form, annual_premium: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Commission Rate (%)</Label>
                  <Input type="number" min="0" max="100" step="0.1" value={form.commission_rate} onChange={(e) => setForm({ ...form, commission_rate: e.target.value })} />
                </div>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Effective Date</p>
                  <p className="font-medium">{formatDate(policy.effective_date)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Expiration Date</p>
                  <p className="font-medium">{formatDate(policy.expiration_date)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Annual Premium</p>
                  <p className="font-medium text-lg">{formatCurrency(policy.annual_premium)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Commission Rate</p>
                  <p className="font-medium">{policy.commission_rate}%</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Commission Amount</p>
                  <p className="font-medium">{formatCurrency(policy.commission_amount)}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Linked Client</CardTitle>
          </CardHeader>
          <CardContent>
            {policy.client ? (
              <Link href={`/clients/${policy.client.id}`} className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors">
                <div className="rounded-full bg-[#2C3E6B]/10 p-2">
                  <User className="h-4 w-4 text-[#2C3E6B]" />
                </div>
                <div>
                  <p className="font-medium text-[#2C3E6B]">{policy.client.first_name} {policy.client.last_name}</p>
                  <p className="text-xs text-muted-foreground">{policy.client.email}</p>
                </div>
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground">No linked client</p>
            )}
          </CardContent>
        </Card>

        {showVehicle && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Vehicle Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
                {insured.year && (
                  <div>
                    <p className="text-muted-foreground">Year</p>
                    <p className="font-medium">{String(insured.year)}</p>
                  </div>
                )}
                {insured.make && (
                  <div>
                    <p className="text-muted-foreground">Make</p>
                    <p className="font-medium">{String(insured.make)}</p>
                  </div>
                )}
                {insured.model && (
                  <div>
                    <p className="text-muted-foreground">Model</p>
                    <p className="font-medium">{String(insured.model)}</p>
                  </div>
                )}
                {insured.vin && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">VIN</p>
                    <p className="font-medium font-mono text-xs">{String(insured.vin)}</p>
                  </div>
                )}
                {insured.named_insureds && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Named Insureds</p>
                    <p className="font-medium">{Array.isArray(insured.named_insureds) ? (insured.named_insureds as string[]).join(', ') : String(insured.named_insureds)}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {(policy.notes || editing) && (
          <Card className={showVehicle ? '' : 'md:col-span-1'}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              {editing ? (
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={4} />
              ) : (
                <p className="text-sm whitespace-pre-wrap">{policy.notes || '—'}</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
