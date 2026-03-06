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
import { Plus, Search, Phone, Mail, MapPin, Filter } from 'lucide-react';
import { getInitials } from '@/lib/format';

const statusColors: Record<string, string> = {
  Lead: 'bg-blue-100 text-blue-700',
  Active: 'bg-emerald-100 text-emerald-700',
  Inactive: 'bg-gray-100 text-gray-700',
  Archived: 'bg-red-100 text-red-700',
};

export default function ClientsPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(searchParams.get('new') === 'true');
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const loadClients = useCallback(async () => {
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

    const { data } = await query.limit(50);
    setClients(data || []);
    setLoading(false);
  }, [search, statusFilter]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

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
      const { error } = await supabase.from('clients').insert({
        ...formData,
        assigned_agent_id: user?.id,
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
        <Button onClick={() => { setEditingClient(null); setShowForm(true); }} className="bg-[#1E40AF] hover:bg-[#1E3A8A] text-white">
          <Plus className="mr-1 h-4 w-4" />
          Add Client
        </Button>
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
            <p className="text-lg font-medium">No clients found</p>
            <p className="text-sm text-muted-foreground mt-1">Add your first client to get started</p>
            <Button onClick={() => setShowForm(true)} className="mt-4 bg-[#1E40AF] hover:bg-[#1E3A8A] text-white">
              <Plus className="mr-1 h-4 w-4" /> Add Client
            </Button>
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
  }, [client, open]);

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
            <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone *</Label>
              <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(555) 555-5555" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone_2">Phone 2</Label>
              <Input id="phone_2" value={form.phone_2} onChange={(e) => setForm({ ...form, phone_2: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dob">Date of Birth</Label>
            <Input id="dob" type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="street">Street Address</Label>
            <Input id="street" value={form.address_street} onChange={(e) => setForm({ ...form, address_street: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="city">City</Label>
              <Input id="city" value={form.address_city} onChange={(e) => setForm({ ...form, address_city: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="state">State</Label>
              <Input id="state" value={form.address_state} onChange={(e) => setForm({ ...form, address_state: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="zip">ZIP</Label>
              <Input id="zip" value={form.address_zip} onChange={(e) => setForm({ ...form, address_zip: e.target.value })} />
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
