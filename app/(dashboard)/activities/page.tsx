'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { formatDate } from '@/lib/format';
import { getActivitiesSeenAt, markActivitiesSeen } from '@/lib/activity-seen';
import type { Activity, Client } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ClientCombobox } from '@/components/forms/client-combobox';
import { toast } from 'sonner';
import { Plus, Phone, Mail, Calendar, FileText, SquareCheck as CheckSquare, MessageSquare, Sparkles } from 'lucide-react';
import { friendlyError } from '@/lib/errors';
import { cn } from '@/lib/utils';

type ActivityRow = Activity & { client?: Pick<Client, 'id' | 'first_name' | 'last_name'> | null };

const ACTIVITY_TYPES = ['Call', 'Email', 'Meeting', 'Note', 'SMS', 'Task'] as const;
const LOGGABLE_TYPES = ['Call', 'Email', 'Meeting', 'Note', 'SMS'] as const;

const typeIcons: Record<string, typeof Phone> = {
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

interface Counters {
  today: number;
  week: number;
  byType: Record<string, number>;
}

function startOfLocalDay(daysAgo = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

// Slack groups a channel by day; so does this feed. Today and Yesterday by
// name, everything older by date.
function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const that = new Date(d); that.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - that.getTime()) / 86_400_000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return d.toLocaleDateString('en-US', { weekday: 'long' });
  return formatDate(iso);
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export default function ActivitiesPage() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [counters, setCounters] = useState<Counters | null>(null);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  // The high-water mark as it stood when the page opened. Items newer than
  // this get the "new" treatment for the rest of the visit; the mark itself
  // moves forward as soon as the feed has loaded, which clears the badge.
  const seenAtOnOpen = useRef<string | null>(null);

  const loadActivities = useCallback(async () => {
    let query = supabase
      .from('activities')
      .select('*, client:clients(id, first_name, last_name)')
      .order('activity_date', { ascending: false })
      .limit(100);
    if (typeFilter !== 'all') query = query.eq('activity_type', typeFilter);
    const { data } = await query;
    setActivities((data as ActivityRow[]) || []);
    setLoading(false);
  }, [typeFilter]);

  const loadCounters = useCallback(async () => {
    const head = () => supabase.from('activities').select('id', { count: 'exact', head: true });
    const [todayRes, weekRes, ...typeRes] = await Promise.all([
      head().gte('activity_date', startOfLocalDay(0)),
      head().gte('activity_date', startOfLocalDay(6)),
      ...ACTIVITY_TYPES.map((t) => head().eq('activity_type', t)),
    ]);
    const byType: Record<string, number> = {};
    ACTIVITY_TYPES.forEach((t, i) => { byType[t] = typeRes[i].count || 0; });
    setCounters({ today: todayRes.count || 0, week: weekRes.count || 0, byType });
  }, []);

  useEffect(() => { loadActivities(); }, [loadActivities]);
  useEffect(() => { loadCounters(); }, [loadCounters]);

  useEffect(() => {
    if (!user?.id || seenAtOnOpen.current) return;
    seenAtOnOpen.current = getActivitiesSeenAt(user.id);
    markActivitiesSeen(user.id);
  }, [user?.id]);

  const isNew = useCallback((a: ActivityRow) => {
    const since = seenAtOnOpen.current;
    return !!since && a.created_at > since && a.created_by !== user?.id;
  }, [user?.id]);

  const days = useMemo(() => {
    const groups: { label: string; items: ActivityRow[] }[] = [];
    activities.forEach((a) => {
      const label = dayLabel(a.activity_date);
      const last = groups[groups.length - 1];
      if (last && last.label === label) last.items.push(a);
      else groups.push({ label, items: [a] });
    });
    return groups;
  }, [activities]);

  const newCount = useMemo(() => activities.filter(isNew).length, [activities, isNew]);
  const total = counters ? Object.values(counters.byType).reduce((s, n) => s + n, 0) : 0;

  const handleSave = async (formData: { client_id: string; activity_type: string; subject: string; description: string }) => {
    const { error } = await supabase.from('activities').insert({
      ...formData,
      activity_date: new Date().toISOString(),
      created_by: user?.id,
    });
    if (error) { toast.error(friendlyError(error)); return; }
    toast.success('Activity logged');
    setShowForm(false);
    loadActivities();
    loadCounters();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Activities</h1>
          <p className="text-sm text-muted-foreground">
            {newCount > 0
              ? <span className="font-medium text-[#8B2D3B]">{newCount} new since you last looked</span>
              : 'Every call, email, meeting and note across all clients'}
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-gradient-to-r from-[#2C3E6B] to-[#1B2A4A] hover:from-[#1B2A4A] hover:to-[#2C3E6B] text-white border border-[#B8962E]/20">
          <Plus className="mr-1 h-4 w-4" /> Log Activity
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Today', value: counters?.today },
          { label: 'Last 7 days', value: counters?.week },
          { label: 'All time', value: counters ? total : undefined },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</p>
              <p className="mt-1 text-2xl font-bold text-[#1B2A4A]">
                {s.value === undefined ? <span className="inline-block h-7 w-10 animate-pulse rounded bg-muted" /> : s.value.toLocaleString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant={typeFilter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setTypeFilter('all')} className={cn('gap-1.5', typeFilter === 'all' && 'bg-[#2C3E6B]')}>
          All
          <CountPill n={counters ? total : undefined} active={typeFilter === 'all'} />
        </Button>
        {ACTIVITY_TYPES.map((type) => {
          const Icon = typeIcons[type];
          const active = typeFilter === type;
          return (
            <Button key={type} variant={active ? 'default' : 'outline'} size="sm" onClick={() => setTypeFilter(type)} className={cn('gap-1.5', active && 'bg-[#2C3E6B]')}>
              <Icon className="h-3.5 w-3.5" /> {type}
              <CountPill n={counters?.byType[type]} active={active} />
            </Button>
          );
        })}
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />)}</div>
      ) : activities.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FileText className="mx-auto mb-2 h-10 w-10 text-muted-foreground/40" />
            <p className="text-lg font-medium">No activities yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Log a call, email or note and it shows up here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {days.map((day) => (
            <section key={day.label}>
              <div className="sticky top-0 z-10 -mx-1 mb-3 flex items-center gap-3 bg-background/95 px-1 py-1.5 backdrop-blur">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[#2C3E6B]">{day.label}</h2>
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">{day.items.length}</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="relative space-y-3 pl-8 before:absolute before:bottom-2 before:left-3 before:top-2 before:w-px before:bg-border">
                {day.items.map((activity, i) => {
                  const Icon = typeIcons[activity.activity_type] || FileText;
                  const fresh = isNew(activity);
                  // Slack's red "new" rule: drawn once, under the last unseen item.
                  const next = day.items[i + 1];
                  const drawRule = fresh && (!next || !isNew(next));
                  return (
                    <div key={activity.id}>
                      <div className="relative">
                        <div className={cn('absolute -left-8 top-3 rounded-full p-1.5', typeColors[activity.activity_type] || 'bg-gray-100')}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <Card className={cn('transition-shadow hover:shadow-sm', fresh && 'border-[#B8962E]/40 bg-[#B8962E]/[0.04]')}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <p className="font-medium">
                                  {activity.subject}
                                  {fresh && <span className="ml-2 align-middle rounded-full bg-[#B8962E] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">New</span>}
                                </p>
                                {activity.description && (
                                  <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{activity.description}</p>
                                )}
                                <div className="mt-1.5 flex items-center gap-3">
                                  {activity.client && (
                                    <Link href={`/clients/${activity.client_id}`} className="text-xs font-medium text-[#2C3E6B] hover:underline">
                                      {activity.client.first_name} {activity.client.last_name}
                                    </Link>
                                  )}
                                  <span className="text-xs text-muted-foreground">{timeLabel(activity.activity_date)}</span>
                                </div>
                              </div>
                              <Badge className={cn(typeColors[activity.activity_type], 'shrink-0 text-[10px]')}>{activity.activity_type}</Badge>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                      {drawRule && (
                        <div className="mt-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-[#8B2D3B]">
                          <div className="h-px flex-1 bg-[#8B2D3B]/40" />
                          Seen before this
                          <div className="h-px flex-1 bg-[#8B2D3B]/40" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
          {activities.length === 100 && (
            <p className="text-center text-xs text-muted-foreground">Showing the latest 100. Filter by type or open a client for their full history.</p>
          )}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>Log Activity</DialogTitle></DialogHeader>
          <ActivityForm onSave={handleSave} onCancel={() => setShowForm(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CountPill({ n, active }: { n: number | undefined; active: boolean }) {
  if (n === undefined) return null;
  return (
    <span className={cn(
      'ml-0.5 inline-flex h-4 min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold',
      active ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground',
    )}>
      {n > 999 ? '999+' : n}
    </span>
  );
}

function ActivityForm({ onSave, onCancel }: {
  onSave: (data: { client_id: string; activity_type: string; subject: string; description: string }) => Promise<void>;
  onCancel: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ client_id: '', activity_type: 'Call', subject: '', description: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.client_id) { toast.error('Pick the client this activity is for'); return; }
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Client</Label>
        <ClientCombobox
          value={form.client_id}
          placeholder="Type a client name…"
          allowNone={false}
          onChange={(id) => setForm({ ...form, client_id: id })}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Type</Label>
        <div className="flex flex-wrap gap-1.5">
          {LOGGABLE_TYPES.map((t) => {
            const Icon = typeIcons[t];
            const active = form.activity_type === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setForm({ ...form, activity_type: t })}
                className={cn(
                  'inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors duration-150',
                  active ? 'border-[#2C3E6B] bg-[#2C3E6B]/5 text-[#2C3E6B]' : 'hover:border-[#2C3E6B] hover:bg-[#2C3E6B]/5',
                )}
              >
                <Icon className="h-3.5 w-3.5" /> {t}
              </button>
            );
          })}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Subject</Label>
        <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Called about renewal" required autoFocus />
      </div>
      <div className="space-y-1.5">
        <Label>Details</Label>
        <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="What was said, what happens next…" />
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1 text-[10px] text-muted-foreground"><Sparkles className="h-3 w-3" /> Logged with the current time</p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="submit" className="bg-gradient-to-r from-[#2C3E6B] to-[#1B2A4A] hover:from-[#1B2A4A] hover:to-[#2C3E6B] text-white border border-[#B8962E]/20" disabled={saving}>{saving ? 'Saving...' : 'Log Activity'}</Button>
        </div>
      </div>
    </form>
  );
}
