'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { formatPhone, formatDate, formatDateTime } from '@/lib/format';
import type { Lead } from '@/lib/types';
import { LEAD_STATUSES, LEAD_PRIORITIES, LEAD_SOURCES } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { ArrowLeft, Pencil, UserCheck, Phone, Mail, MapPin, Calendar, Target, Zap, StickyNote, CheckCircle } from 'lucide-react';
import { formatPhoneInput, formatZipInput } from '@/lib/form-autocomplete';
import { friendlyError } from '@/lib/errors';
import { convertLeadToClient } from '@/lib/convert-lead';

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

export default function LeadDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { session } = useAuth();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [notesValue, setNotesValue] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [converting, setConverting] = useState(false);

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

  useEffect(() => {
    if (session && id) loadLead();
  }, [session, id]);

  async function loadLead() {
    const { data } = await supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (data) {
      setLead(data);
      setNotesValue(data.notes || '');
    }
    setLoading(false);
  }

  function openEdit() {
    if (!lead) return;
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
    setShowEdit(true);
  }

  async function handleUpdate() {
    if (!lead || !formData.first_name || !formData.last_name) {
      toast.error('First name and last name are required');
      return;
    }
    setFormLoading(true);

    const { error } = await supabase.from('leads').update({
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
    }).eq('id', lead.id);

    if (error) { toast.error(friendlyError(error)); setFormLoading(false); return; }
    toast.success('Lead updated');
    setShowEdit(false);
    setFormLoading(false);
    loadLead();
  }

  async function handleConvert() {
    if (!lead) return;
    setConverting(true);

    const result = await convertLeadToClient(lead);
    setConverting(false);
    setShowConvertModal(false);

    if (!result.ok) { toast.error(friendlyError(result)); return; }

    toast.success(`${lead.first_name} ${lead.last_name} is now a client`);
    router.push(`/clients/${result.clientId}`);
  }

  async function saveNotes() {
    if (!lead) return;
    setSavingNotes(true);
    const { error } = await supabase.from('leads').update({
      notes: notesValue || null,
      updated_at: new Date().toISOString(),
    }).eq('id', lead.id);

    if (error) { toast.error(friendlyError(error)); setSavingNotes(false); return; }
    toast.success('Notes saved');
    setSavingNotes(false);
    setLead({ ...lead, notes: notesValue || null });
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-gray-400">Loading...</div>;
  }

  if (!lead) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-gray-500">Lead not found</p>
        <Link href="/leads" className="mt-4 text-sm text-[#1B2A4A] hover:underline">Back to Leads</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/leads" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Leads
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={openEdit}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
          </Button>
          {lead.status === 'converted' ? (
            <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 flex items-center gap-1 px-3 py-1">
              <CheckCircle className="h-3.5 w-3.5" /> Converted
            </Badge>
          ) : (
            <Button size="sm" onClick={() => setShowConvertModal(true)} className="bg-emerald-600 hover:bg-emerald-700">
              <UserCheck className="mr-1.5 h-3.5 w-3.5" /> Convert to Client
            </Button>
          )}
        </div>
      </div>

      {/* Lead Name and Status */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{lead.first_name} {lead.last_name}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className={statusColors[lead.status] || 'bg-gray-100 text-gray-700'}>
            {lead.status}
          </Badge>
          <Badge variant="secondary" className={priorityColors[lead.priority] || 'bg-gray-100 text-gray-700'}>
            {lead.priority} priority
          </Badge>
          <Badge variant="secondary" className={getScoreColor(lead.lead_score)}>
            Score: {lead.lead_score}/10
          </Badge>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-gray-400" />
              <span>{lead.phone ? formatPhone(lead.phone) : 'No phone'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-gray-400" />
              <span>{lead.email || 'No email'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-gray-400" />
              <span>{lead.address_zip || 'No ZIP'}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Source & Life Event</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Target className="h-4 w-4 text-gray-400" />
              <span>{lead.lead_source || 'Unknown source'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Zap className="h-4 w-4 text-gray-400" />
              <span>{lead.life_event_type || 'None specified'}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Dates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span>Created: {formatDateTime(lead.created_date)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span>Updated: {formatDateTime(lead.updated_at)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notes Section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-500">
            <StickyNote className="h-4 w-4" /> Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            rows={4}
            value={notesValue}
            onChange={(e) => setNotesValue(e.target.value)}
            placeholder="Add notes about this lead..."
            className="resize-none"
          />
          <Button size="sm" onClick={saveNotes} disabled={savingNotes} className="bg-[#1B2A4A] hover:bg-[#2C3E6B]">
            {savingNotes ? 'Saving...' : 'Save Notes'}
          </Button>
        </CardContent>
      </Card>

      {/* Convert Confirmation Dialog */}
      <AlertDialog open={showConvertModal} onOpenChange={setShowConvertModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Convert to Client</AlertDialogTitle>
            <AlertDialogDescription>
              Convert this lead to a client? This will create a new client record from the lead&apos;s information.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={converting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleConvert(); }}
              disabled={converting}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {converting ? 'Converting...' : 'Convert'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Lead</DialogTitle>
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
                <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: formatPhoneInput(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>ZIP Code</Label>
                <Input value={formData.address_zip} onChange={(e) => setFormData({ ...formData, address_zip: formatZipInput(e.target.value) })} />
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
                <Input value={formData.life_event_type} onChange={(e) => setFormData({ ...formData, life_event_type: e.target.value })} />
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
            <Button onClick={handleUpdate} disabled={formLoading} className="bg-[#1B2A4A] hover:bg-[#2C3E6B]">
              {formLoading ? 'Saving...' : 'Update Lead'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
