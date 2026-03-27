'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { formatPhone, formatDate } from '@/lib/format';
import type { Client } from '@/lib/types';
import { CLIENT_STATUSES, CLIENT_SOURCES } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus, Search, Phone, Mail, MapPin, Filter, Zap, Upload, Flame, Clock, Moon, DollarSign, Sparkles, TriangleAlert as AlertTriangle, X, TrendingUp } from 'lucide-react';
import { getInitials } from '@/lib/format';
import { formatPhoneInput, formatZipInput, US_STATES } from '@/lib/form-autocomplete';
import { BulkClientImportDialog } from '@/components/forms/bulk-client-import';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const statusColors: Record<string, string> = {
  Lead: 'bg-blue-100 text-blue-700',
  Active: 'bg-emerald-100 text-emerald-700',
  Inactive: 'bg-gray-100 text-gray-700',
  Archived: 'bg-red-100 text-red-700',
};

type SmartFilterKey = 'hotLeads' | 'expiringSoon' | 'noActivity' | 'highValue' | 'newThisWeek' | 'missingInfo' | 'crossSell';

interface SmartFilterCounts {
  hotLeads: number;
  expiringSoon: number;
  noActivity: number;
  highValue: number;
  newThisWeek: number;
  missingInfo: number;
  crossSell: number;
}

const SMART_FILTERS: { key: SmartFilterKey; label: string; icon: any; color: string; activeColor: string; description: string }[] = [
  { key: 'hotLeads', label: 'Hot Leads', icon: Flame, color: 'text-orange-600', activeColor: 'bg-orange-50 border-orange-300 text-orange-700', description: 'Leads created in the last 7 days' },
  { key: 'expiringSoon', label: 'Expiring Soon', icon: Clock, color: 'text-amber-600', activeColor: 'bg-amber-50 border-amber-300 text-amber-700', description: 'Clients with policies expiring in 60 days' },
  { key: 'noActivity', label: 'No Activity', icon: Moon, color: 'text-gray-500', activeColor: 'bg-gray-100 border-gray-400 text-gray-700', description: 'No activity logged in the last 30 days' },
  { key: 'highValue', label: 'High Value', icon: DollarSign, color: 'text-emerald-600', activeColor: 'bg-emerald-50 border-emerald-300 text-emerald-700', description: 'Total active premiums over $2,000/year' },
  { key: 'newThisWeek', label: 'New This Week', icon: Sparkles, color: 'text-blue-600', activeColor: 'bg-blue-50 border-blue-300 text-blue-700', description: 'Added in the last 7 days' },
  { key: 'missingInfo', label: 'Missing Info', icon: AlertTriangle, color: 'text-red-500', activeColor: 'bg-red-50 border-red-300 text-red-700', description: 'Missing phone, email, or address' },
  { key: 'crossSell', label: 'Cross-Sell', icon: TrendingUp, color: 'text-teal-600', activeColor: 'bg-teal-50 border-teal-300 text-teal-700', description: 'Clients with open cross-sell opportunities' },
];

export default function ClientsPage() {
  const { user, session } = useAuth();
  const searchParams = useSearchParams();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(searchParams.get('new') === 'true');
  const [showImport, setShowImport] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [activeFilters, setActiveFilters] = useState<Set<SmartFilterKey>>(new Set());
  const [filterCounts, setFilterCounts] = useState<SmartFilterCounts>({ hotLeads: 0, expiringSoon: 0, noActivity: 0, highValue: 0, newThisWeek: 0, missingInfo: 0, crossSell: 0 });
  const [filterClientIds, setFilterClientIds] = useState<Record<SmartFilterKey, Set<string>>>({
    hotLeads: new Set(), expiringSoon: new Set(), noActivity: new Set(),
    highValue: new Set(), newThisWeek: new Set(), missingInfo: new Set(), crossSell: new Set(),
  });
  const [countsLoading, setCountsLoading] = useState(true);

  const loadFilterCounts = useCallback(async () => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const today = now.toISOString().split('T')[0];

    const [hotLeadsRes, expiringRes, allClientsRes, activitiesRes, highValueRes, crossSellRes] = await Promise.all([
      supabase.from('clients').select('id').eq('status', 'Lead').gte('created_at', sevenDaysAgo),
      supabase.from('policies').select('client_id').eq('status', 'Active').gte('expiration_date', today).lte('expiration_date', sixtyDaysFromNow),
      supabase.from('clients').select('id, phone, email, address_street, created_at'),
      supabase.from('activities').select('client_id, activity_date').order('activity_date', { ascending: false }),
      supabase.from('policies').select('client_id, annual_premium').eq('status', 'Active'),
      supabase.from('cross_sell_opportunities').select('client_id').eq('status', 'open'),
    ]);

    const hotLeadIds = new Set((hotLeadsRes.data || []).map((r: any) => r.id));

    const expiringClientIds = new Set((expiringRes.data || []).map((r: any) => r.client_id));

    const allClients = allClientsRes.data || [];
    const newThisWeekIds = new Set(allClients.filter((c: any) => c.created_at >= sevenDaysAgo).map((c: any) => c.id));
    const missingInfoIds = new Set(allClients.filter((c: any) => !c.phone || !c.email || !c.address_street).map((c: any) => c.id));

    const lastActivityByClient: Record<string, string> = {};
    (activitiesRes.data || []).forEach((a: any) => {
      if (!lastActivityByClient[a.client_id] || a.activity_date > lastActivityByClient[a.client_id]) {
        lastActivityByClient[a.client_id] = a.activity_date;
      }
    });
    const allClientIds = new Set(allClients.map((c: any) => c.id));
    const noActivityIds = new Set<string>();
    allClientIds.forEach((cid) => {
      const last = lastActivityByClient[cid];
      if (!last || last < thirtyDaysAgo) noActivityIds.add(cid);
    });

    const premiumByClient: Record<string, number> = {};
    (highValueRes.data || []).forEach((p: any) => {
      premiumByClient[p.client_id] = (premiumByClient[p.client_id] || 0) + (p.annual_premium || 0);
    });
    const highValueIds = new Set(Object.entries(premiumByClient).filter(([, v]) => v > 2000).map(([k]) => k));

    const crossSellClientIds = new Set((crossSellRes.data || []).map((r: any) => r.client_id));

    setFilterCounts({
      hotLeads: hotLeadIds.size,
      expiringSoon: expiringClientIds.size,
      noActivity: noActivityIds.size,
      highValue: highValueIds.size,
      newThisWeek: newThisWeekIds.size,
      missingInfo: missingInfoIds.size,
      crossSell: crossSellClientIds.size,
    });
    setFilterClientIds({
      hotLeads: hotLeadIds,
      expiringSoon: expiringClientIds,
      noActivity: noActivityIds,
      highValue: highValueIds,
      newThisWeek: newThisWeekIds,
      missingInfo: missingInfoIds,
      crossSell: crossSellClientIds,
    });
    setCountsLoading(false);
  }, []);

  const loadClients = useCallback(async () => {
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    if (!currentSession) {
      setLoading(false);
      return;
    }

    let query = supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    if (activeFilters.size > 0) {
      let matchingIds: Set<string> | null = null;
      activeFilters.forEach((filterKey) => {
        const ids = filterClientIds[filterKey];
        if (matchingIds === null) {
          matchingIds = new Set(ids);
        } else {
          const intersection = new Set<string>();
          matchingIds.forEach((id) => { if (ids.has(id)) intersection.add(id); });
          matchingIds = intersection;
        }
      });

      if (matchingIds && (matchingIds as Set<string>).size > 0) {
        query = query.in('id', Array.from(matchingIds as Set<string>));
      } else {
        setClients([]);
        setLoading(false);
        return;
      }
    }

    const { data } = await query.limit(100);
    setClients(data || []);
    setLoading(false);
  }, [search, statusFilter, activeFilters, filterClientIds]);

  useEffect(() => {
    if (session) {
      loadFilterCounts();
      const interval = setInterval(loadFilterCounts, 30000);
      return () => clearInterval(interval);
    }
  }, [session, loadFilterCounts]);

  useEffect(() => {
    if (session) {
      loadClients();
    }
  }, [loadClients, session]);

  const toggleFilter = (key: SmartFilterKey) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const clearFilters = () => {
    setActiveFilters(new Set());
  };

  const handleSave = async (formData: Partial<Client>) => {
    if (editingClient) {
      const { error } = await supabase
        .from('clients')
        .update({ ...formData, updated_at: new Date().toISOString() })
        .eq('id', editingClient.id);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success('Client updated');
    } else {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const agentId = currentSession?.user?.id;
      if (!agentId) {
        toast.error('You must be logged in to create a client');
        return;
      }
      const { error } = await supabase.from('clients').insert({
        ...formData,
        assigned_agent_id: agentId,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success('Client created');
    }
    setShowForm(false);
    setEditingClient(null);
    loadClients();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clients</h1>
          <p className="text-sm text-muted-foreground">{clients.length} clients found</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowImport(true)}>
            <Upload className="mr-1 h-4 w-4" />
            Import CSV
          </Button>
          <Button onClick={() => { setEditingClient(null); setShowForm(true); }} className="bg-[#1E40AF] hover:bg-[#1E3A8A] text-white">
            <Plus className="mr-1 h-4 w-4" />
            Add Client
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or phone..."
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {CLIENT_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <TooltipProvider delayDuration={300}>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {SMART_FILTERS.map((f) => {
            const isActive = activeFilters.has(f.key);
            const count = filterCounts[f.key];
            return (
              <Tooltip key={f.key}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => toggleFilter(f.key)}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all ${
                      isActive
                        ? f.activeColor
                        : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-muted/50'
                    }`}
                  >
                    <f.icon className={`h-3.5 w-3.5 ${isActive ? '' : f.color}`} />
                    {f.label}
                    {!countsLoading && (
                      <Badge variant="secondary" className={`ml-0.5 h-4 min-w-[16px] px-1 text-[10px] ${isActive ? 'bg-white/60' : ''}`}>
                        {count}
                      </Badge>
                    )}
                    {countsLoading && (
                      <span className="ml-0.5 h-3 w-4 animate-pulse rounded bg-muted inline-block" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">{f.description}</TooltipContent>
              </Tooltip>
            );
          })}
          {activeFilters.size > 0 && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:bg-muted/50 hover:text-gray-700 transition-colors whitespace-nowrap"
            >
              <X className="h-3 w-3" /> Clear
            </button>
          )}
        </div>
      </TooltipProvider>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : clients.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            {activeFilters.size > 0 ? (
              <>
                <p className="text-lg font-medium">No matching clients</p>
                <p className="text-sm text-muted-foreground mt-1">
                  No clients match the active filters: {Array.from(activeFilters).map((k) => SMART_FILTERS.find((f) => f.key === k)?.label).join(', ')}
                </p>
                <Button onClick={clearFilters} variant="outline" className="mt-4">
                  <X className="mr-1 h-4 w-4" /> Clear Filters
                </Button>
              </>
            ) : (
              <>
                <p className="text-lg font-medium">No clients found</p>
                <p className="text-sm text-muted-foreground mt-1">Add your first client to get started</p>
                <Button onClick={() => setShowForm(true)} className="mt-4 bg-[#1E40AF] hover:bg-[#1E3A8A] text-white">
                  <Plus className="mr-1 h-4 w-4" /> Add Client
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <Link key={client.id} href={`/clients/${client.id}`}>
              <Card className="transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer h-full">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarFallback className="bg-[#1E40AF] text-white text-xs">
                        {getInitials(`${client.first_name} ${client.last_name}`)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold truncate">{client.first_name} {client.last_name}</p>
                        <Badge className={`${statusColors[client.status]} text-[10px] shrink-0`}>
                          {client.status}
                        </Badge>
                      </div>
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3 shrink-0" />
                          <span className="truncate">{client.email}</span>
                        </div>
                        {client.phone && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3 shrink-0" />
                            <span>{formatPhone(client.phone)}</span>
                          </div>
                        )}
                        {client.address_city && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span>{client.address_city}, {client.address_state}</span>
                          </div>
                        )}
                      </div>
                      {client.tags && client.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {client.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">{tag}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <ClientFormDialog
        open={showForm}
        onOpenChange={(open) => { setShowForm(open); if (!open) setEditingClient(null); }}
        client={editingClient}
        onSave={handleSave}
      />

      <BulkClientImportDialog
        open={showImport}
        onOpenChange={setShowImport}
        onComplete={loadClients}
      />
    </div>
  );
}

function ClientFormDialog({
  open,
  onOpenChange,
  client,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null;
  onSave: (data: Partial<Client>) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [emailSuggestion, setEmailSuggestion] = useState('');
  const [showStateSuggestions, setShowStateSuggestions] = useState(false);
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    phone_2: '',
    date_of_birth: '',
    address_street: '',
    address_city: '',
    address_state: 'CA',
    address_zip: '',
    status: 'Lead' as Client['status'],
    source: '' as string,
    notes: '',
  });

  useEffect(() => {
    if (client) {
      setForm({
        first_name: client.first_name,
        last_name: client.last_name,
        email: client.email,
        phone: client.phone,
        phone_2: client.phone_2,
        date_of_birth: client.date_of_birth || '',
        address_street: client.address_street,
        address_city: client.address_city,
        address_state: client.address_state,
        address_zip: client.address_zip,
        status: client.status,
        source: client.source,
        notes: client.notes,
      });
    } else {
      setForm({
        first_name: '', last_name: '', email: '', phone: '', phone_2: '',
        date_of_birth: '', address_street: '', address_city: '', address_state: 'CA',
        address_zip: '', status: 'Lead', source: '', notes: '',
      });
    }
    setEmailSuggestion('');
  }, [client, open]);

  useEffect(() => {
    if (!client && form.first_name && form.last_name && !form.email) {
      setEmailSuggestion(`${form.first_name.toLowerCase()}.${form.last_name.toLowerCase()}@pinoygeneralinsurance.com`);
    } else {
      setEmailSuggestion('');
    }
  }, [form.first_name, form.last_name, form.email, client]);

  const filteredStates = form.address_state
    ? US_STATES.filter(
        (s) =>
          s.code.toLowerCase().includes(form.address_state.toLowerCase()) ||
          s.name.toLowerCase().includes(form.address_state.toLowerCase())
      )
    : US_STATES;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{client ? 'Edit Client' : 'Add New Client'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="first_name">First Name *</Label>
              <Input id="first_name" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="last_name">Last Name *</Label>
              <Input id="last_name" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email *</Label>
            <div className="relative">
              <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              {emailSuggestion && !form.email && (
                <button
                  type="button"
                  onClick={() => { setForm({ ...form, email: emailSuggestion }); setEmailSuggestion(''); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 rounded-md bg-muted/80 px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <Zap className="h-3 w-3 text-[#1E40AF]" />
                  <span className="max-w-[180px] truncate">{emailSuggestion}</span>
                </button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: formatPhoneInput(e.target.value) })}
                placeholder="(555) 555-5555"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone_2">Phone 2</Label>
              <Input
                id="phone_2"
                value={form.phone_2}
                onChange={(e) => setForm({ ...form, phone_2: formatPhoneInput(e.target.value) })}
                placeholder="(555) 555-5555"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dob">Date of Birth</Label>
            <Input id="dob" type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="street">Street Address</Label>
            <Input id="street" value={form.address_street} onChange={(e) => setForm({ ...form, address_street: e.target.value })} placeholder="123 Main St" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="city">City</Label>
              <Input id="city" value={form.address_city} onChange={(e) => setForm({ ...form, address_city: e.target.value })} />
            </div>
            <div className="space-y-1.5 relative">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={form.address_state}
                onChange={(e) => { setForm({ ...form, address_state: e.target.value }); setShowStateSuggestions(true); }}
                onFocus={() => setShowStateSuggestions(true)}
                onBlur={() => setTimeout(() => setShowStateSuggestions(false), 200)}
                placeholder="CA"
              />
              {showStateSuggestions && filteredStates.length > 0 && form.address_state.length >= 1 && form.address_state.length < 3 && (
                <div className="absolute z-50 mt-1 w-48 rounded-lg border bg-white shadow-lg max-h-32 overflow-y-auto">
                  {filteredStates.slice(0, 8).map((s) => (
                    <button
                      key={s.code}
                      type="button"
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted/50 text-left"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => { setForm({ ...form, address_state: s.code }); setShowStateSuggestions(false); }}
                    >
                      <span className="font-medium">{s.code}</span>
                      <span className="text-muted-foreground">{s.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="zip">ZIP</Label>
              <Input
                id="zip"
                value={form.address_zip}
                onChange={(e) => setForm({ ...form, address_zip: formatZipInput(e.target.value) })}
                placeholder="90210"
                maxLength={5}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as Client['status'] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CLIENT_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Source</Label>
              <Select value={form.source || 'none'} onValueChange={(v) => setForm({ ...form, source: v === 'none' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {CLIENT_SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="bg-[#1E40AF] hover:bg-[#1E3A8A] text-white" disabled={saving}>
              {saving ? 'Saving...' : client ? 'Update Client' : 'Create Client'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
