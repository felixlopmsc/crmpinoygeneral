'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/format';
import type { Client, Policy } from '@/lib/types';
import { POLICY_TYPES, CARRIERS } from '@/lib/types';
import {
  getCarrierTemplate,
  getDefaultCommissionRate,
  getCoverageTypes,
  computeExpirationDate,
  getPolicyNumberFormatHint,
  POLICY_TYPE_PRESETS,
  QUICK_FILL_PRESETS,
  type QuickFillPreset,
} from '@/lib/carrier-templates';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  Car,
  Chrome as Home,
  Briefcase,
  Heart,
  Umbrella,
  Building2,
  Sparkles,
  Search,
  Zap,
  DollarSign,
  ChevronRight,
  Info,
  Copy,
  ArrowLeft,
  FileText,
} from 'lucide-react';

const typeIcons: Record<string, any> = {
  Auto: Car,
  Home: Home,
  Renters: Building2,
  Business: Briefcase,
  Life: Heart,
  Umbrella: Umbrella,
};

interface SmartPolicyFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId?: string;
  userId: string;
  onSaved: () => void;
}

type FormStep = 'type' | 'details' | 'copy-picker';

export function SmartPolicyForm({ open, onOpenChange, clientId, userId, onSaved }: SmartPolicyFormProps) {
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<FormStep>('type');
  const [clients, setClients] = useState<Client[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const clientSearchRef = useRef<HTMLDivElement>(null);
  const [carrierSearch, setCarrierSearch] = useState('');
  const [showCarrierDropdown, setShowCarrierDropdown] = useState(false);
  const carrierSearchRef = useRef<HTMLDivElement>(null);
  const [availableCoverageTypes, setAvailableCoverageTypes] = useState<string[]>([]);
  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(new Set());

  const [existingPolicies, setExistingPolicies] = useState<(Policy & { client?: Client })[]>([]);
  const [copySearch, setCopySearch] = useState('');
  const [loadingPolicies, setLoadingPolicies] = useState(false);

  const [form, setForm] = useState({
    policy_type: '',
    carrier: '',
    policy_number: '',
    coverage_type: '',
    effective_date: '',
    expiration_date: '',
    annual_premium: '',
    commission_rate: '',
    payment_frequency: 'Monthly',
    notes: '',
    client_id: clientId || '',
  });

  useEffect(() => {
    if (open) {
      setStep('type');
      setForm({
        policy_type: '', carrier: '', policy_number: '', coverage_type: '',
        effective_date: '', expiration_date: '', annual_premium: '',
        commission_rate: '', payment_frequency: 'Monthly', notes: '',
        client_id: clientId || '',
      });
      setAutoFilledFields(new Set());
      setSelectedClient(null);
      setClientSearch('');
      setCarrierSearch('');

      if (clientId) {
        supabase.from('clients').select('*').eq('id', clientId).maybeSingle()
          .then(({ data }) => { if (data) setSelectedClient(data); });
      }
    }
  }, [open, clientId]);

  const searchClients = useCallback(async (query: string) => {
    if (!query || query.length < 2) { setClients([]); return; }
    const { data } = await supabase
      .from('clients')
      .select('*')
      .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(8);
    setClients(data || []);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => searchClients(clientSearch), 200);
    return () => clearTimeout(timer);
  }, [clientSearch, searchClients]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (clientSearchRef.current && !clientSearchRef.current.contains(e.target as Node)) {
        setShowClientDropdown(false);
      }
      if (carrierSearchRef.current && !carrierSearchRef.current.contains(e.target as Node)) {
        setShowCarrierDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectPolicyType = (type: string) => {
    const preset = POLICY_TYPE_PRESETS[type];
    const newAutoFilled = new Set<string>();
    const updates: Record<string, string> = { policy_type: type };

    if (preset) {
      updates.coverage_type = preset.defaultCoverageType;
      updates.payment_frequency = preset.defaultPaymentFrequency;
      updates.commission_rate = String(preset.typicalCommission);
      newAutoFilled.add('coverage_type');
      newAutoFilled.add('payment_frequency');
      newAutoFilled.add('commission_rate');

      const today = new Date();
      updates.effective_date = today.toISOString().split('T')[0];
      updates.expiration_date = computeExpirationDate(updates.effective_date, preset.suggestedTermMonths);
      newAutoFilled.add('effective_date');
      newAutoFilled.add('expiration_date');
    }

    if (form.carrier) {
      const rate = getDefaultCommissionRate(form.carrier, type);
      if (rate > 0) {
        updates.commission_rate = String(rate);
        newAutoFilled.add('commission_rate');
      }
      const coverages = getCoverageTypes(form.carrier, type);
      setAvailableCoverageTypes(coverages);
      if (coverages.length > 0) {
        updates.coverage_type = coverages[0];
        newAutoFilled.add('coverage_type');
      }
    }

    setAutoFilledFields(newAutoFilled);
    setForm((f) => ({ ...f, ...updates }));
    setStep('details');
  };

  const selectCarrier = (carrier: string) => {
    const template = getCarrierTemplate(carrier);
    const newAutoFilled = new Set(autoFilledFields);
    const updates: Record<string, string> = { carrier };

    setCarrierSearch(carrier);
    setShowCarrierDropdown(false);

    if (form.policy_type) {
      const rate = getDefaultCommissionRate(carrier, form.policy_type);
      if (rate > 0) {
        updates.commission_rate = String(rate);
        newAutoFilled.add('commission_rate');
      }

      const coverages = getCoverageTypes(carrier, form.policy_type);
      setAvailableCoverageTypes(coverages);
      if (coverages.length > 0 && !form.coverage_type) {
        updates.coverage_type = coverages[0];
        newAutoFilled.add('coverage_type');
      }
    }

    if (template) {
      const prefix = template.policyNumberPrefix;
      if (!form.policy_number || autoFilledFields.has('policy_number')) {
        updates.policy_number = prefix;
        newAutoFilled.add('policy_number');
      }
    }

    setAutoFilledFields(newAutoFilled);
    setForm((f) => ({ ...f, ...updates }));
  };

  const applyQuickFill = (preset: QuickFillPreset) => {
    const newAutoFilled = new Set(autoFilledFields);
    const today = new Date().toISOString().split('T')[0];
    const updates: Record<string, string> = {
      coverage_type: preset.coverageType,
      payment_frequency: preset.paymentFrequency,
    };

    if (!form.effective_date) {
      updates.effective_date = today;
      newAutoFilled.add('effective_date');
    }
    updates.expiration_date = computeExpirationDate(
      form.effective_date || today,
      preset.termMonths,
    );

    newAutoFilled.add('coverage_type');
    newAutoFilled.add('payment_frequency');
    newAutoFilled.add('expiration_date');

    if (form.carrier) {
      const rate = getDefaultCommissionRate(form.carrier, preset.policyType);
      if (rate > 0) {
        updates.commission_rate = String(rate);
        newAutoFilled.add('commission_rate');
      }
    }

    setAutoFilledFields(newAutoFilled);
    setForm((f) => ({ ...f, ...updates }));
    toast.success(`Applied "${preset.label}" template`);
  };

  const openCopyPicker = async () => {
    setLoadingPolicies(true);
    setCopySearch('');
    setStep('copy-picker');

    const resolvedClientId = clientId || form.client_id;
    let query = supabase
      .from('policies')
      .select('*, client:clients(id, first_name, last_name, email)')
      .order('created_at', { ascending: false })
      .limit(50);

    if (resolvedClientId) {
      query = query.eq('client_id', resolvedClientId);
    }

    const { data } = await query;
    setExistingPolicies((data as any) || []);
    setLoadingPolicies(false);
  };

  const copyFromPolicy = (policy: Policy & { client?: Client }) => {
    const newAutoFilled = new Set<string>();
    const today = new Date().toISOString().split('T')[0];
    const preset = POLICY_TYPE_PRESETS[policy.policy_type];
    const termMonths = preset?.suggestedTermMonths || 12;

    setForm((f) => ({
      ...f,
      policy_type: policy.policy_type,
      carrier: policy.carrier,
      policy_number: '',
      coverage_type: policy.coverage_type,
      effective_date: today,
      expiration_date: computeExpirationDate(today, termMonths),
      annual_premium: String(policy.annual_premium || ''),
      commission_rate: String(policy.commission_rate || ''),
      payment_frequency: policy.payment_frequency,
      notes: `Renewed from policy ${policy.policy_number}`,
    }));

    setCarrierSearch(policy.carrier);

    const coverages = getCoverageTypes(policy.carrier, policy.policy_type);
    setAvailableCoverageTypes(coverages.length > 0 ? coverages : [policy.coverage_type]);

    ['coverage_type', 'effective_date', 'expiration_date', 'annual_premium', 'commission_rate', 'payment_frequency'].forEach((f) => newAutoFilled.add(f));
    setAutoFilledFields(newAutoFilled);

    setStep('details');
    toast.success(`Copied from ${policy.carrier} ${policy.policy_type} - ${policy.policy_number}`);
  };

  const computedCommission = (() => {
    const premium = parseFloat(form.annual_premium) || 0;
    const rate = parseFloat(form.commission_rate) || 0;
    return (premium * rate) / 100;
  })();

  const filteredCarriers = carrierSearch
    ? CARRIERS.filter((c) => c.toLowerCase().includes(carrierSearch.toLowerCase()))
    : [...CARRIERS];

  const policyNumberHint = form.carrier ? getPolicyNumberFormatHint(form.carrier) : null;

  const currentTypePresets = form.policy_type
    ? QUICK_FILL_PRESETS.filter((p) => p.policyType === form.policy_type)
    : [];

  const filteredExistingPolicies = copySearch
    ? existingPolicies.filter((p) => {
        const q = copySearch.toLowerCase();
        return (
          p.policy_number?.toLowerCase().includes(q) ||
          p.carrier?.toLowerCase().includes(q) ||
          p.policy_type?.toLowerCase().includes(q) ||
          (p.client as any)?.first_name?.toLowerCase().includes(q) ||
          (p.client as any)?.last_name?.toLowerCase().includes(q)
        );
      })
    : existingPolicies;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.client_id && !clientId) {
      toast.error('Please select a client');
      return;
    }
    setSaving(true);
    const premium = parseFloat(form.annual_premium) || 0;
    const rate = parseFloat(form.commission_rate) || 0;
    const { error } = await supabase.from('policies').insert({
      client_id: form.client_id || clientId,
      policy_number: form.policy_number,
      carrier: form.carrier,
      policy_type: form.policy_type,
      coverage_type: form.coverage_type,
      effective_date: form.effective_date,
      expiration_date: form.expiration_date,
      annual_premium: premium,
      commission_rate: rate,
      commission_amount: (premium * rate) / 100,
      payment_frequency: form.payment_frequency,
      notes: form.notes,
      assigned_agent_id: userId,
    });
    if (error) toast.error(error.message);
    else {
      toast.success('Policy created');
      onOpenChange(false);
      onSaved();
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-0 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#1E40AF]" />
            {step === 'type' && 'New Policy - Choose Type'}
            {step === 'details' && 'New Policy - Details'}
            {step === 'copy-picker' && 'Copy from Existing Policy'}
          </DialogTitle>
        </DialogHeader>

        {step === 'type' ? (
          <div className="px-6 pb-6 space-y-4 overflow-y-auto">
            {!clientId && (
              <div className="space-y-1.5" ref={clientSearchRef}>
                <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Client</Label>
                {selectedClient ? (
                  <div className="flex items-center gap-2 rounded-lg border p-2.5 bg-muted/30">
                    <div className="h-8 w-8 rounded-full bg-[#1E40AF] flex items-center justify-center text-white text-xs font-medium">
                      {selectedClient.first_name[0]}{selectedClient.last_name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{selectedClient.first_name} {selectedClient.last_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{selectedClient.email}</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => { setSelectedClient(null); setForm((f) => ({ ...f, client_id: '' })); setClientSearch(''); }}
                    >
                      Change
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={clientSearch}
                      onChange={(e) => { setClientSearch(e.target.value); setShowClientDropdown(true); }}
                      onFocus={() => setShowClientDropdown(true)}
                      placeholder="Search clients by name or email..."
                      className="pl-9"
                    />
                    {showClientDropdown && clients.length > 0 && (
                      <div className="absolute z-50 mt-1 w-full rounded-lg border bg-white shadow-lg max-h-48 overflow-y-auto">
                        {clients.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-muted/50 text-left transition-colors"
                            onClick={() => {
                              setSelectedClient(c);
                              setForm((f) => ({ ...f, client_id: c.id }));
                              setShowClientDropdown(false);
                              setClientSearch('');
                            }}
                          >
                            <div className="h-7 w-7 rounded-full bg-[#1E40AF]/10 flex items-center justify-center text-[#1E40AF] text-xs font-medium">
                              {c.first_name[0]}{c.last_name[0]}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{c.first_name} {c.last_name}</p>
                              <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={openCopyPicker}
                disabled={!clientId && !form.client_id}
              >
                <Copy className="h-3.5 w-3.5" />
                Copy from Existing Policy
              </Button>
            </div>

            <div>
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Select Policy Type</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {POLICY_TYPES.map((type) => {
                  const preset = POLICY_TYPE_PRESETS[type];
                  const Icon = typeIcons[type] || Briefcase;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => selectPolicyType(type)}
                      disabled={!clientId && !form.client_id}
                      className="group relative flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all hover:border-[#1E40AF] hover:bg-[#1E40AF]/5 hover:shadow-sm disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#1E40AF]/20"
                    >
                      <div className="flex items-center gap-2 w-full">
                        <div className="rounded-lg bg-[#1E40AF]/10 p-2 group-hover:bg-[#1E40AF]/15 transition-colors">
                          <Icon className="h-4 w-4 text-[#1E40AF]" />
                        </div>
                        <span className="font-semibold text-sm">{type}</span>
                        <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      {preset && (
                        <p className="text-[11px] text-muted-foreground leading-tight">{preset.description}</p>
                      )}
                      {preset && (
                        <div className="flex gap-3 text-[10px] text-muted-foreground mt-auto">
                          <span>{formatCurrency(preset.typicalPremiumRange[0])}-{formatCurrency(preset.typicalPremiumRange[1])}/yr</span>
                          <span>{preset.typicalCommission}% comm</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              {!clientId && !form.client_id && (
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <Info className="h-3 w-3" /> Select a client first to choose a policy type
                </p>
              )}
            </div>
          </div>
        ) : step === 'copy-picker' ? (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="px-6 pb-3 shrink-0 space-y-3">
              <button
                type="button"
                onClick={() => setStep('type')}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </button>
              <p className="text-xs text-muted-foreground">
                Select a policy to copy its details into a new policy. Dates will be set to today with a fresh term.
              </p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={copySearch}
                  onChange={(e) => setCopySearch(e.target.value)}
                  placeholder="Search by carrier, type, or policy number..."
                  className="pl-9"
                />
              </div>
            </div>
            <ScrollArea className="flex-1 px-6 pb-6">
              {loadingPolicies ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
                  ))}
                </div>
              ) : filteredExistingPolicies.length === 0 ? (
                <div className="py-12 text-center">
                  <FileText className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-sm font-medium text-muted-foreground">No policies found</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {copySearch ? 'Try a different search term' : 'This client has no existing policies'}
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {filteredExistingPolicies.map((policy) => {
                    const Icon = typeIcons[policy.policy_type] || Briefcase;
                    return (
                      <button
                        key={policy.id}
                        type="button"
                        onClick={() => copyFromPolicy(policy)}
                        className="group w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-all hover:border-[#1E40AF] hover:bg-[#1E40AF]/5"
                      >
                        <div className="rounded-lg bg-[#1E40AF]/10 p-2 shrink-0">
                          <Icon className="h-4 w-4 text-[#1E40AF]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{policy.carrier}</span>
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{policy.policy_type}</Badge>
                            <Badge
                              variant="secondary"
                              className={`text-[10px] px-1.5 py-0 ${
                                policy.status === 'Active' ? 'bg-emerald-50 text-emerald-700' :
                                policy.status === 'Expired' ? 'bg-gray-100 text-gray-600' :
                                'bg-amber-50 text-amber-700'
                              }`}
                            >
                              {policy.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-muted-foreground">{policy.policy_number || 'No number'}</span>
                            <span className="text-xs text-muted-foreground">-</span>
                            <span className="text-xs text-muted-foreground">{policy.coverage_type}</span>
                            <span className="text-xs text-muted-foreground">-</span>
                            <span className="text-xs font-medium">{formatCurrency(policy.annual_premium)}/yr</span>
                          </div>
                          {!clientId && policy.client && (
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {(policy.client as any).first_name} {(policy.client as any).last_name}
                            </p>
                          )}
                        </div>
                        <Copy className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="px-6 overflow-y-auto space-y-4 flex-1">
              <div className="flex items-center gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setStep('type')}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Policy Type
                </button>
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
                <span className="text-sm font-medium flex items-center gap-1.5">
                  {(() => { const Icon = typeIcons[form.policy_type] || Briefcase; return <Icon className="h-3.5 w-3.5 text-[#1E40AF]" />; })()}
                  {form.policy_type}
                </span>
              </div>

              {currentTypePresets.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                    <Zap className="h-3 w-3 text-[#1E40AF]" /> Quick Fill
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {currentTypePresets.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => applyQuickFill(preset)}
                        className="group relative inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all hover:border-[#1E40AF] hover:bg-[#1E40AF]/5 hover:text-[#1E40AF]"
                      >
                        <Zap className="h-3 w-3 text-muted-foreground group-hover:text-[#1E40AF] transition-colors" />
                        {preset.shortLabel}
                      </button>
                    ))}
                  </div>
                  {currentTypePresets.length > 0 && (
                    <p className="text-[10px] text-muted-foreground">
                      {currentTypePresets.find((p) => p.coverageType === form.coverage_type)?.description || 'Click a template above to auto-fill coverage, term, and payment details'}
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-1.5" ref={carrierSearchRef}>
                <Label className="flex items-center gap-1.5">
                  Carrier
                  {autoFilledFields.has('commission_rate') && form.carrier && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-0.5 bg-emerald-50 text-emerald-700 border-emerald-200">
                      <Zap className="h-2.5 w-2.5" /> auto-fill active
                    </Badge>
                  )}
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={carrierSearch}
                    onChange={(e) => {
                      setCarrierSearch(e.target.value);
                      setShowCarrierDropdown(true);
                      if (!e.target.value) {
                        setForm((f) => ({ ...f, carrier: '' }));
                      }
                    }}
                    onFocus={() => setShowCarrierDropdown(true)}
                    placeholder="Type to search carriers..."
                    className="pl-9"
                  />
                  {showCarrierDropdown && filteredCarriers.length > 0 && (
                    <div className="absolute z-50 mt-1 w-full rounded-lg border bg-white shadow-lg max-h-48 overflow-y-auto">
                      {filteredCarriers.map((c) => {
                        const template = getCarrierTemplate(c);
                        const supportsType = template?.policyTypes.includes(form.policy_type);
                        return (
                          <button
                            key={c}
                            type="button"
                            className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/50 text-left transition-colors"
                            onClick={() => selectCarrier(c)}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{c}</span>
                              {template && supportsType && (
                                <Badge variant="secondary" className="text-[10px] px-1 py-0 bg-emerald-50 text-emerald-700">
                                  {template.defaultCommissionRates[form.policy_type]}%
                                </Badge>
                              )}
                            </div>
                            {template && !supportsType && (
                              <span className="text-[10px] text-amber-600">No {form.policy_type}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Policy Number</Label>
                  <div className="relative">
                    <Input
                      value={form.policy_number}
                      onChange={(e) => {
                        setForm((f) => ({ ...f, policy_number: e.target.value }));
                        setAutoFilledFields((s) => { const n = new Set(s); n.delete('policy_number'); return n; });
                      }}
                      placeholder={policyNumberHint?.placeholder || 'Policy number'}
                    />
                    {autoFilledFields.has('policy_number') && (
                      <Zap className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-emerald-500" />
                    )}
                  </div>
                  {policyNumberHint && (
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Info className="h-2.5 w-2.5 shrink-0" />
                      {form.carrier} format: {policyNumberHint.format}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Coverage Type</Label>
                  {availableCoverageTypes.length > 1 ? (
                    <Select value={form.coverage_type} onValueChange={(v) => {
                      setForm((f) => ({ ...f, coverage_type: v }));
                      setAutoFilledFields((s) => { const n = new Set(s); n.delete('coverage_type'); return n; });
                    }}>
                      <SelectTrigger className={autoFilledFields.has('coverage_type') ? 'border-emerald-300 bg-emerald-50/30' : ''}>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableCoverageTypes.map((ct) => (
                          <SelectItem key={ct} value={ct}>{ct}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="relative">
                      <Input
                        value={form.coverage_type}
                        onChange={(e) => {
                          setForm((f) => ({ ...f, coverage_type: e.target.value }));
                          setAutoFilledFields((s) => { const n = new Set(s); n.delete('coverage_type'); return n; });
                        }}
                        placeholder="Coverage type"
                        className={autoFilledFields.has('coverage_type') ? 'border-emerald-300 bg-emerald-50/30' : ''}
                      />
                      {autoFilledFields.has('coverage_type') && (
                        <Zap className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-emerald-500" />
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Effective Date</Label>
                  <Input
                    type="date"
                    value={form.effective_date}
                    onChange={(e) => {
                      const newDate = e.target.value;
                      setForm((f) => ({ ...f, effective_date: newDate }));
                      setAutoFilledFields((s) => { const n = new Set(s); n.delete('effective_date'); return n; });
                      if (newDate && form.policy_type) {
                        const preset = POLICY_TYPE_PRESETS[form.policy_type];
                        if (preset) {
                          const exp = computeExpirationDate(newDate, preset.suggestedTermMonths);
                          setForm((f) => ({ ...f, effective_date: newDate, expiration_date: exp }));
                        }
                      }
                    }}
                    required
                    className={autoFilledFields.has('effective_date') ? 'border-emerald-300 bg-emerald-50/30' : ''}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Expiration Date</Label>
                  <Input
                    type="date"
                    value={form.expiration_date}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, expiration_date: e.target.value }));
                      setAutoFilledFields((s) => { const n = new Set(s); n.delete('expiration_date'); return n; });
                    }}
                    required
                    className={autoFilledFields.has('expiration_date') ? 'border-emerald-300 bg-emerald-50/30' : ''}
                  />
                </div>
              </div>

              <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-[#1E40AF]" />
                  <span className="text-sm font-medium">Premium & Commission</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Annual Premium</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.annual_premium}
                      onChange={(e) => setForm((f) => ({ ...f, annual_premium: e.target.value }))}
                      placeholder="0.00"
                      required
                      className={autoFilledFields.has('annual_premium') ? 'border-emerald-300 bg-emerald-50/30' : ''}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-1">
                      Commission %
                      {autoFilledFields.has('commission_rate') && (
                        <Zap className="h-3 w-3 text-emerald-500" />
                      )}
                    </Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={form.commission_rate}
                      onChange={(e) => {
                        setForm((f) => ({ ...f, commission_rate: e.target.value }));
                        setAutoFilledFields((s) => { const n = new Set(s); n.delete('commission_rate'); return n; });
                      }}
                      placeholder="0"
                      className={autoFilledFields.has('commission_rate') ? 'border-emerald-300 bg-emerald-50/30' : ''}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Payment</Label>
                    <Select
                      value={form.payment_frequency}
                      onValueChange={(v) => {
                        setForm((f) => ({ ...f, payment_frequency: v }));
                        setAutoFilledFields((s) => { const n = new Set(s); n.delete('payment_frequency'); return n; });
                      }}
                    >
                      <SelectTrigger className={`text-xs ${autoFilledFields.has('payment_frequency') ? 'border-emerald-300 bg-emerald-50/30' : ''}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {['Monthly', 'Quarterly', 'Semi-Annual', 'Annual'].map((f) => (
                          <SelectItem key={f} value={f}>{f}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {computedCommission > 0 && (
                  <div className="flex items-center justify-between pt-2 border-t text-sm">
                    <span className="text-muted-foreground">Estimated Commission</span>
                    <span className="font-semibold text-emerald-700">{formatCurrency(computedCommission)}</span>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  placeholder="Additional policy notes..."
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t shrink-0 flex justify-end gap-2 bg-white">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" className="bg-[#1E40AF] hover:bg-[#1E3A8A] text-white gap-1.5" disabled={saving}>
                {saving ? 'Creating...' : 'Create Policy'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
