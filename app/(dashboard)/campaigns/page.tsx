'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { formatDate, formatDateTime } from '@/lib/format';
import type { EmailCampaign } from '@/lib/types';
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
import { Plus, Mail, Send, Eye, MousePointer, Users, CreditCard as Edit, Trash2 } from 'lucide-react';

const statusColors: Record<string, string> = {
  Draft: 'bg-gray-100 text-gray-700',
  Scheduled: 'bg-blue-100 text-blue-700',
  Sent: 'bg-emerald-100 text-emerald-700',
  Failed: 'bg-red-100 text-red-700',
};

const campaignTypes = ['Renewal Reminder', 'Birthday', 'Check-in', 'Newsletter', 'Holiday', 'Other'];

export default function CampaignsPage() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<EmailCampaign | null>(null);

  const loadCampaigns = useCallback(async () => {
    const { data } = await supabase
      .from('email_campaigns')
      .select('*')
      .order('created_at', { ascending: false });
    setCampaigns(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadCampaigns(); }, [loadCampaigns]);

  const handleSave = async (formData: Partial<EmailCampaign>) => {
    if (editingCampaign) {
      const { error } = await supabase.from('email_campaigns').update(formData).eq('id', editingCampaign.id);
      if (error) { toast.error(error.message); return; }
      toast.success('Campaign updated');
    } else {
      const { error } = await supabase.from('email_campaigns').insert({ ...formData, created_by: user?.id });
      if (error) { toast.error(error.message); return; }
      toast.success('Campaign created');
    }
    setShowForm(false);
    setEditingCampaign(null);
    loadCampaigns();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('email_campaigns').delete().eq('id', id);
    loadCampaigns();
    toast.success('Campaign deleted');
  };

  const totalSent = campaigns.filter((c) => c.status === 'Sent').length;
  const totalRecipients = campaigns.reduce((sum, c) => sum + (c.recipients_count || 0), 0);
  const totalOpened = campaigns.reduce((sum, c) => sum + (c.opened_count || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Email Campaigns</h1>
          <p className="text-sm text-muted-foreground">{campaigns.length} campaigns</p>
        </div>
        <Button onClick={() => { setEditingCampaign(null); setShowForm(true); }} className="bg-[#1E40AF] hover:bg-[#1E3A8A] text-white">
          <Plus className="mr-1 h-4 w-4" /> New Campaign
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="flex items-center gap-4 p-5"><div className="rounded-xl bg-blue-50 p-3"><Send className="h-5 w-5 text-[#1E40AF]" /></div><div><p className="text-sm text-muted-foreground">Campaigns Sent</p><p className="text-xl font-bold">{totalSent}</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-4 p-5"><div className="rounded-xl bg-emerald-50 p-3"><Users className="h-5 w-5 text-emerald-600" /></div><div><p className="text-sm text-muted-foreground">Total Recipients</p><p className="text-xl font-bold">{totalRecipients}</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-4 p-5"><div className="rounded-xl bg-amber-50 p-3"><Eye className="h-5 w-5 text-amber-600" /></div><div><p className="text-sm text-muted-foreground">Total Opens</p><p className="text-xl font-bold">{totalOpened}</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-4 p-5"><div className="rounded-xl bg-cyan-50 p-3"><MousePointer className="h-5 w-5 text-cyan-600" /></div><div><p className="text-sm text-muted-foreground">Open Rate</p><p className="text-xl font-bold">{totalRecipients > 0 ? `${((totalOpened / totalRecipients) * 100).toFixed(1)}%` : '0%'}</p></div></CardContent></Card>
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-14 animate-pulse rounded bg-muted" />)}</div>
      ) : campaigns.length === 0 ? (
        <Card><CardContent className="py-16 text-center"><Mail className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" /><p className="text-lg font-medium">No campaigns yet</p><p className="text-sm text-muted-foreground mt-1">Create your first email campaign</p></CardContent></Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Recipients</TableHead>
                  <TableHead>Opened</TableHead>
                  <TableHead>Send Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((campaign) => (
                  <TableRow key={campaign.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{campaign.campaign_name}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">{campaign.subject_line}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{campaign.campaign_type}</TableCell>
                    <TableCell><Badge className={`${statusColors[campaign.status]} text-[10px]`}>{campaign.status}</Badge></TableCell>
                    <TableCell>{campaign.recipients_count}</TableCell>
                    <TableCell>{campaign.opened_count} {campaign.recipients_count > 0 && <span className="text-xs text-muted-foreground">({((campaign.opened_count / campaign.recipients_count) * 100).toFixed(0)}%)</span>}</TableCell>
                    <TableCell className="text-muted-foreground">{campaign.send_date ? formatDateTime(campaign.send_date) : '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingCampaign(campaign); setShowForm(true); }}><Edit className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600" onClick={() => handleDelete(campaign.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <CampaignFormDialog open={showForm} onOpenChange={(o) => { setShowForm(o); if (!o) setEditingCampaign(null); }} campaign={editingCampaign} onSave={handleSave} />
    </div>
  );
}

function CampaignFormDialog({ open, onOpenChange, campaign, onSave }: {
  open: boolean; onOpenChange: (o: boolean) => void; campaign: EmailCampaign | null; onSave: (data: Partial<EmailCampaign>) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    campaign_name: '', campaign_type: 'Renewal Reminder', subject_line: '', email_body: '', status: 'Draft' as EmailCampaign['status'],
  });

  useEffect(() => {
    if (campaign) {
      setForm({
        campaign_name: campaign.campaign_name,
        campaign_type: campaign.campaign_type,
        subject_line: campaign.subject_line,
        email_body: campaign.email_body,
        status: campaign.status,
      });
    } else {
      setForm({ campaign_name: '', campaign_type: 'Renewal Reminder', subject_line: '', email_body: '', status: 'Draft' });
    }
  }, [campaign, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{campaign ? 'Edit Campaign' : 'New Campaign'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5"><Label>Campaign Name</Label><Input value={form.campaign_name} onChange={(e) => setForm({ ...form, campaign_name: e.target.value })} required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={form.campaign_type || 'none'} onValueChange={(v) => setForm({ ...form, campaign_type: v === 'none' ? '' : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select type</SelectItem>
                  {campaignTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as EmailCampaign['status'] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['Draft', 'Scheduled', 'Sent'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5"><Label>Subject Line</Label><Input value={form.subject_line} onChange={(e) => setForm({ ...form, subject_line: e.target.value })} required /></div>
          <div className="space-y-1.5"><Label>Email Body</Label><Textarea value={form.email_body} onChange={(e) => setForm({ ...form, email_body: e.target.value })} rows={6} placeholder="Write your email content here..." /></div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="bg-[#1E40AF] hover:bg-[#1E3A8A] text-white" disabled={saving}>{saving ? 'Saving...' : campaign ? 'Update Campaign' : 'Create Campaign'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
