'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { formatDateTime, formatRelativeDate } from '@/lib/format';
import type { Activity, Client } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Phone, Mail, Calendar, FileText, SquareCheck as CheckSquare, MessageSquare, Filter } from 'lucide-react';

const typeIcons: Record<string, any> = {
  Call: Phone,
  Email: Mail,
  Meeting: Calendar,
  Note: FileText,
  Task: CheckSquare,
  SMS: MessageSquare,
};

const typeColors: Record<string, string> = {
  Call: 'bg-blue-100 text-blue-700',
  Email: 'bg-emerald-100 text-emerald-700',
  Meeting: 'bg-amber-100 text-amber-700',
  Note: 'bg-gray-100 text-gray-700',
  Task: 'bg-cyan-100 text-cyan-700',
  SMS: 'bg-teal-100 text-teal-700',
};

export default function ActivitiesPage() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<(Activity & { client: Client })[]>([]);
  const [clients, setClients] = useState<Pick<Client, 'id' | 'first_name' | 'last_name'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);

  const loadActivities = useCallback(async () => {
    let query = supabase
      .from('activities')
      .select('*, client:clients(id, first_name, last_name)')
      .order('activity_date', { ascending: false })
      .limit(50);

    if (typeFilter !== 'all') query = query.eq('activity_type', typeFilter);

    const { data } = await query;
    setActivities((data as any) || []);
    setLoading(false);
  }, [typeFilter]);

  useEffect(() => { loadActivities(); }, [loadActivities]);

  const handleOpenForm = async () => {
    const { data } = await supabase.from('clients').select('id, first_name, last_name').order('first_name').limit(100);
    setClients(data || []);
    setShowForm(true);
  };

  const handleSave = async (formData: any) => {
    const { error } = await supabase.from('activities').insert({
      ...formData,
      activity_date: new Date().toISOString(),
      created_by: user?.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Activity logged');
    setShowForm(false);
    loadActivities();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Activities</h1>
          <p className="text-sm text-muted-foreground">Activity timeline across all clients</p>
        </div>
        <Button onClick={handleOpenForm} className="bg-gradient-to-r from-[#2C3E6B] to-[#1B2A4A] hover:from-[#1B2A4A] hover:to-[#2C3E6B] text-white border border-[#B8962E]/20">
          <Plus className="mr-1 h-4 w-4" /> Log Activity
        </Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button variant={typeFilter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setTypeFilter('all')} className={typeFilter === 'all' ? 'bg-[#2C3E6B]' : ''}>All</Button>
        {Object.keys(typeIcons).map((type) => {
          const Icon = typeIcons[type];
          return (
            <Button key={type} variant={typeFilter === type ? 'default' : 'outline'} size="sm" onClick={() => setTypeFilter(type)} className={typeFilter === type ? 'bg-[#2C3E6B]' : ''}>
              <Icon className="mr-1 h-3.5 w-3.5" /> {type}
            </Button>
          );
        })}
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />)}</div>
      ) : activities.length === 0 ? (
        <Card><CardContent className="py-16 text-center"><FileText className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" /><p className="text-lg font-medium">No activities found</p></CardContent></Card>
      ) : (
        <div className="relative space-y-3 pl-8 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-px before:bg-border">
          {activities.map((activity) => {
            const Icon = typeIcons[activity.activity_type] || FileText;
            return (
              <div key={activity.id} className="relative">
                <div className={`absolute -left-8 top-3 rounded-full p-1.5 ${typeColors[activity.activity_type] || 'bg-gray-100'}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <Card className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{activity.subject}</p>
                        {activity.description && (
                          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{activity.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1.5">
                          {activity.client && (
                            <Link href={`/clients/${activity.client_id}`} className="text-xs text-[#2C3E6B] hover:underline font-medium">
                              {(activity.client as any).first_name} {(activity.client as any).last_name}
                            </Link>
                          )}
                          <span className="text-xs text-muted-foreground">{formatDateTime(activity.activity_date)}</span>
                        </div>
                      </div>
                      <Badge className={`${typeColors[activity.activity_type]} text-[10px] shrink-0`}>{activity.activity_type}</Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>Log Activity</DialogTitle></DialogHeader>
          <ActivityForm clients={clients} onSave={handleSave} onCancel={() => setShowForm(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ActivityForm({ clients, onSave, onCancel }: { clients: Pick<Client, 'id' | 'first_name' | 'last_name'>[]; onSave: (data: any) => Promise<void>; onCancel: () => void }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ client_id: '', activity_type: 'Call', subject: '', description: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
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
      <div className="space-y-1.5">
        <Label>Type</Label>
        <Select value={form.activity_type} onValueChange={(v) => setForm({ ...form, activity_type: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{['Call', 'Email', 'Meeting', 'Note', 'SMS'].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5"><Label>Subject</Label><Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required /></div>
      <div className="space-y-1.5"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="bg-gradient-to-r from-[#2C3E6B] to-[#1B2A4A] hover:from-[#1B2A4A] hover:to-[#2C3E6B] text-white border border-[#B8962E]/20" disabled={saving}>{saving ? 'Saving...' : 'Log Activity'}</Button>
      </div>
    </form>
  );
}
