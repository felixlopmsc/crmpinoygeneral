'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { formatPhone, formatDate } from '@/lib/format';
import type { Lead } from '@/lib/types';
import { LEAD_STATUSES, LEAD_PRIORITIES, LEAD_SOURCES } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Plus, Search, Users, Sparkles, Flame, TrendingUp, ArrowUpDown, UserCheck, Trash2, Pencil, Filter } from 'lucide-react';
import { formatPhoneInput, formatZipInput } from '@/lib/form-autocomplete';
import { convertLeadToClient } from '@/lib/convert-lead';
import { friendlyError, NOT_PERMITTED } from '@/lib/errors';

type FilterKey = 'all' | 'new' | 'contacted' | 'qualified' | 'converted' | 'high_priority' | 'unassigned';

interface KPIStats {
  total: number;
  newThisWeek: number;
  highPriority: number;
  conversionRate: number;
}

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All Leads' },
  { key: 'new', label: 'New' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'qualified', label: 'Qualified' },
  { key: 'converted', label: 'Converted' },
  { key: 'high_priority', label: 'High Priority' },
  { key: 'unassigned', label: 'Unassigned' },
];

const statusColors: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700',
  contacted: 'bg-amber-100 text-amber-700',
  qualified: 'bg-cyan-100 text-cyan-700',
  converted: 'bg-emerald-100 text-emerald-700',
  declined: 'bg-red-100 text-red-700',
};

const priorityColors: Record<string, string> = {
  high: 'bg-red-100 text-red-700',
  hot: 'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  normal: 'bg-amber-100 text-amber-700',
  low: 'bg-gray-100 text-gray-700',
};

function getScoreColor(score: number): string {
  if (score >= 7) return 'bg-emerald-100 text-emerald-700';
  if (score >= 4) return 'bg-amber-100 text-amber-700';
  return 'bg-gray-100 text-gray-700';
}

type SortField = 'name' | 'lead_score' | 'priority' | 'status' | 'created_date';
type SortDir = 'asc' | 'desc';

export default function LeadsPage() {
  const { session } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [kpi, setKpi] = useState<KPIStats>({ total: 0, newThisWeek: 0, highPriority: 0, conversionRate: 0 });
  const [sortField, setSortField] = useState<SortField>('created_date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const [showForm, setShowForm] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    address_zip: '',
    lead_source: '',
    lead_score: 5,
    life_event_type: '',
    priority: 'normal',
    status: 'new',
    notes: '',
  });

  const loadKpi = useCallback(async () => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [totalRes, newRes, highRes, convertedRes] = await Promise.all([
      supabase.from('leads').select('id', { count: 'exact', head: true }),
      supabase.from('leads').select('id', { count: 'exact', head: true }).eq('status', 'new').gte('created_date', sevenDaysAgo),
      supabase.from('leads').select('id', { count: 'exact', head: true }).in('priority', ['high', 'hot']),
      supabase.from('leads').select('id', { count: 'exact', head: true }).eq('status', 'converted'),
    ]);

    const total = totalRes.count || 0;
    const converted = convertedRes.count || 0;

    setKpi({
      total,
      newThisWeek: newRes.count || 0,
      highPriority: highRes.count || 0,
      conversionRate: total > 0 ? Math.round((converted / total) * 100) : 0,
    });
  }, []);

  const loadLeads = useCallback(async () => {
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    if (!currentSession) { setLoading(false); return; }

    let query = supabase.from('leads').select('*');

    if (activeFilter === 'new') query = query.eq('status', 'new');
    else if (activeFilter === 'contacted') query = query.eq('status', 'contacted');
    else if (activeFilter === 'qualified') query = query.eq('status', 'qualified');
    else if (activeFilter === 'converted') query = query.eq('status', 'converted');
    else if (activeFilter === 'high_priority') query = query.in('priority', ['high', 'hot']);
    else if (activeFilter === 'unassigned') query = query.is('notes', null);

    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    if (sortField === 'created_date') {
      query = query.order('created_date', { ascending: sortDir === 'asc' });
    } else if (sortField === 'lead_score') {
      query = query.order('lead_score', { ascending: sortDir === 'asc' });
    } else if (sortField === 'priority') {
      query = query.order('priority', { ascending: sortDir === 'asc' });
    } else if (sortField === 'status') {
      query = query.order('status', { ascending: sortDir === 'asc' });
    } else if (sortField === 'name') {
      query = query.order('last_name', { ascending: sortDir === 'asc' });
    }

    const { data } = await query.limit(200);
    setLeads(data || []);
    setLoading(false);
  }, [search, activeFilter, sortField, sortDir]);

  useEffect(() => {
    if (session) {
      loadKpi();
      loadLeads();
    }
  }, [session, loadKpi, loadLeads]);

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  }

  function openAddForm() {
    setEditingLead(null);
    setFormData({ first_name: '', last_name: '', phone: '', email: '', address_zip: '', lead_source: '', lead_score: 5, life_event_type: '', priority: 'normal', status: 'new', notes: '' });
    setShowForm(true);
  }

  function openEditForm(lead: Lead) {
    setEditingLead(lead);
    setFormData({
      first_name: lead.first_name,
      last_name: lead.last_name,
      phone: lead.phone || '',
      email: lead.email || '',
      address_zip: lead.address_zip || '',
      lead_source: lead.lead_source || '',
      lead_score: lead.lead_score,
      life_event_type: lead.life_event_type || '',
      priority: lead.priority,
      status: lead.status,
      notes: lead.notes || '',
    });
    setShowForm(true);
  }

  async function handleSave() {
    if (!formData.first_name || !formData.last_name) {
      toast.error('First name and last name are required');
      return;
    }
    setFormLoading(true);

    const payload = {
      first_name: formData.first_name,
      last_name: formData.last_name,
      phone: formData.phone || null,
      email: formData.email || null,
      address_zip: formData.address_zip || null,
      lead_source: formData.lead_source || null,
      lead_score: formData.lead_score,
      life_event_type: formData.life_event_type || null,
      priority: formData.priority,
      status: formData.status,
      notes: formData.notes || null,
      updated_at: new Date().toISOString(),
    };

    if (editingLead) {
      const { error } = await supabase.from('leads').update(payload).eq('id', editingLead.id);
      if (error) { toast.error(friendlyError(error)); setFormLoading(false); return; }
      toast.success('Lead updated');
    } else {
      const { error } = await supabase.from('leads').insert(payload);
      if (error) { toast.error(friendlyError(error)); setFormLoading(false); return; }
      toast.success('Lead created');
    }

    setShowForm(false);
    setFormLoading(false);
    loadLeads();
    loadKpi();
  }

  async function handleDelete() {
    if (!deleteId) return;
    // .select() so there is a row count: a policy that hides the row makes the
    // delete match nothing and return no error, which must not read as success.
    const { data, error } = await supabase
      .from('leads')
      .delete()
      .eq('id', deleteId)
      .select('id');

    if (error) { toast.error(friendlyError(error, { action: 'delete this lead' })); return; }
    if (!data || data.length === 0) { toast.error(NOT_PERMITTED); setDeleteId(null); return; }

    toast.success('Lead deleted');
    setDeleteId(null);
    loadLeads();
    loadKpi();
  }

  async function handleConvert(lead: Lead) {
    const result = await convertLeadToClient(lead);
    if (!result.ok) { toast.error(friendlyError(result)); return; }

    toast.success(`${lead.first_name} ${lead.last_name} is now a client`);
    window.location.href = `/clients/${result.clientId}`;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <p className="text-sm text-gray-500">Manage and track incoming insurance prospects</p>
        </div>
        <Button onClick={openAddForm} className="bg-[#1B2A4A] hover:bg-[#2C3E6B]">
          <Plus className="mr-2 h-4 w-4" /> Add Lead
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-50 p-2"><Users className="h-5 w-5 text-blue-600" /></div>
              <div>
                <p className="text-sm text-gray-500">Total Leads</p>
                <p className="text-2xl font-bold text-gray-900">{kpi.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-50 p-2"><Sparkles className="h-5 w-5 text-emerald-600" /></div>
              <div>
                <p className="text-sm text-gray-500">New This Week</p>
                <p className="text-2xl font-bold text-gray-900">{kpi.newThisWeek}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-red-50 p-2"><Flame className="h-5 w-5 text-red-600" /></div>
              <div>
                <p className="text-sm text-gray-500">High Priority</p>
                <p className="text-2xl font-bold text-gray-900">{kpi.highPriority}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-teal-50 p-2"><TrendingUp className="h-5 w-5 text-teal-600" /></div>
              <div>
                <p className="text-sm text-gray-500">Conversion Rate</p>
                <p className="text-2xl font-bold text-gray-900">{kpi.conversionRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                activeFilter === f.key
                  ? 'bg-[#1B2A4A] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search leads..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50/80">
                  <th className="cursor-pointer px-4 py-3 text-left font-medium text-gray-600" onClick={() => toggleSort('name')}>
                    <span className="inline-flex items-center gap-1">Name <ArrowUpDown className="h-3 w-3" /></span>
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Phone</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Email</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">ZIP</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Source</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Life Event</th>
                  <th className="cursor-pointer px-4 py-3 text-left font-medium text-gray-600" onClick={() => toggleSort('lead_score')}>
                    <span className="inline-flex items-center gap-1">Score <ArrowUpDown className="h-3 w-3" /></span>
                  </th>
                  <th className="cursor-pointer px-4 py-3 text-left font-medium text-gray-600" onClick={() => toggleSort('priority')}>
                    <span className="inline-flex items-center gap-1">Priority <ArrowUpDown className="h-3 w-3" /></span>
                  </th>
                  <th className="cursor-pointer px-4 py-3 text-left font-medium text-gray-600" onClick={() => toggleSort('status')}>
                    <span className="inline-flex items-center gap-1">Status <ArrowUpDown className="h-3 w-3" /></span>
                  </th>
                  <th className="cursor-pointer px-4 py-3 text-left font-medium text-gray-600" onClick={() => toggleSort('created_date')}>
                    <span className="inline-flex items-center gap-1">Created <ArrowUpDown className="h-3 w-3" /></span>
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr><td colSpan={11} className="px-4 py-12 text-center text-gray-400">Loading...</td></tr>
                ) : leads.length === 0 ? (
                  <tr><td colSpan={11} className="px-4 py-12 text-center text-gray-400">No leads found</td></tr>
                ) : leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/leads/${lead.id}`} className="font-medium text-[#1B2A4A] hover:underline">
                        {lead.first_name} {lead.last_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{lead.phone ? formatPhone(lead.phone) : '—'}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-[180px] truncate">{lead.email || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{lead.address_zip || '—'}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-[140px] truncate">{lead.lead_source || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{lead.life_event_type || '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className={getScoreColor(lead.lead_score)}>
                        {lead.lead_score}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className={priorityColors[lead.priority] || 'bg-gray-100 text-gray-700'}>
                        {lead.priority}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className={statusColors[lead.status] || 'bg-gray-100 text-gray-700'}>
                        {lead.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(lead.created_date)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEditForm(lead)} title="Edit">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {lead.status !== 'converted' && (
                          <Button variant="ghost" size="sm" onClick={() => handleConvert(lead)} title="Convert to Client" className="text-emerald-600 hover:text-emerald-700">
                            <UserCheck className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => setDeleteId(lead.id)} title="Delete" className="text-red-500 hover:text-red-600">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Lead Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingLead ? 'Edit Lead' : 'Add New Lead'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>First Name *</Label>
                <Input value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Last Name *</Label>
                <Input value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: formatPhoneInput(e.target.value) })} placeholder="(555) 123-4567" />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>ZIP Code</Label>
                <Input value={formData.address_zip} onChange={(e) => setFormData({ ...formData, address_zip: formatZipInput(e.target.value) })} placeholder="90650" />
              </div>
              <div className="space-y-1.5">
                <Label>Lead Score (1-10)</Label>
                <Input type="number" min={1} max={10} value={formData.lead_score} onChange={(e) => setFormData({ ...formData, lead_score: parseInt(e.target.value) || 1 })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Lead Source</Label>
                <Select value={formData.lead_source} onValueChange={(v) => setFormData({ ...formData, lead_source: v })}>
                  <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                  <SelectContent>
                    {LEAD_SOURCES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Life Event</Label>
                <Input value={formData.life_event_type} onChange={(e) => setFormData({ ...formData, life_event_type: e.target.value })} placeholder="e.g. New Home, Baby" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LEAD_PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LEAD_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea rows={3} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
            </div>
            <Button onClick={handleSave} disabled={formLoading} className="bg-[#1B2A4A] hover:bg-[#2C3E6B]">
              {formLoading ? 'Saving...' : editingLead ? 'Update Lead' : 'Create Lead'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lead</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this lead? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
