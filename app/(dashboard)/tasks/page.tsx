'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { formatRelativeDate, daysUntil } from '@/lib/format';
import type { Task, Client } from '@/lib/types';
import { TASK_PRIORITIES } from '@/lib/types';
import { openTaskScope } from '@/lib/scopes';
import { TASKS_CHANGED_EVENT } from '@/hooks/use-open-tasks-count';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { TaskTemplateDialog } from '@/components/forms/task-template-dialog';
import { ClientCombobox } from '@/components/forms/client-combobox';
import {
  Plus, Zap, SquareCheck as CheckSquare, TriangleAlert as AlertTriangle, Clock, Calendar, Filter,
  Trash2, Sparkles, CircleDot, Circle, Sun, User, CornerDownLeft, RotateCcw,
} from 'lucide-react';
import { TASK_SUGGESTIONS, getTaskSuggestionsForClient, type TaskSuggestion } from '@/lib/form-autocomplete';
import { friendlyError } from '@/lib/errors';
import { cn } from '@/lib/utils';

type TaskRow = Task & { client?: Pick<Client, 'id' | 'first_name' | 'last_name'> | null };

type View = 'active' | 'today' | 'overdue' | 'completed' | 'all';

const priorityColors: Record<string, string> = {
  Low: 'bg-gray-100 text-gray-700',
  Medium: 'bg-blue-100 text-blue-700',
  High: 'bg-amber-100 text-amber-700',
  Urgent: 'bg-red-100 text-red-700',
};

// ClickUp's "Home" buckets. Overdue and Today are what the sidebar badge
// counts; the rest is what's coming. A task with no date is not forgotten —
// it just has no urgency yet, so it sits last.
const GROUPS = [
  { key: 'overdue', label: 'Overdue', tone: 'text-red-600', bar: 'border-l-red-500' },
  { key: 'today', label: 'Today', tone: 'text-amber-600', bar: 'border-l-amber-500' },
  { key: 'tomorrow', label: 'Tomorrow', tone: 'text-[#2C3E6B]', bar: '' },
  { key: 'week', label: 'Next 7 days', tone: 'text-[#2C3E6B]', bar: '' },
  { key: 'later', label: 'Later', tone: 'text-muted-foreground', bar: '' },
  { key: 'none', label: 'No due date', tone: 'text-muted-foreground', bar: '' },
] as const;
type GroupKey = (typeof GROUPS)[number]['key'];

function dueDay(task: Task): string | null {
  return task.due_date ? task.due_date.split('T')[0] : null;
}

function groupOf(task: Task): GroupKey {
  const day = dueDay(task);
  if (!day) return 'none';
  const d = daysUntil(day);
  if (d < 0) return 'overdue';
  if (d === 0) return 'today';
  if (d === 1) return 'tomorrow';
  if (d <= 7) return 'week';
  return 'later';
}

function isoDateOffset(daysFromNow: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split('T')[0];
}

function notifyTasksChanged() {
  window.dispatchEvent(new Event(TASKS_CHANGED_EVENT));
}

export default function TasksPage() {
  const { user } = useAuth();
  const [openTasks, setOpenTasks] = useState<TaskRow[]>([]);
  const [doneTasks, setDoneTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [view, setView] = useState<View>('active');
  const [mineOnly, setMineOnly] = useState(false);
  const [quickTitle, setQuickTitle] = useState('');
  const [quickSaving, setQuickSaving] = useState(false);

  const loadTasks = useCallback(async () => {
    const select = '*, client:clients(id, first_name, last_name)';
    const [openRes, doneRes] = await Promise.all([
      openTaskScope(supabase.from('tasks').select(select))
        .order('due_date', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(500),
      supabase.from('tasks').select(select)
        .eq('status', 'Completed')
        .order('completed_at', { ascending: false, nullsFirst: false })
        .limit(100),
    ]);
    setOpenTasks((openRes.data as TaskRow[]) || []);
    setDoneTasks((doneRes.data as TaskRow[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  // The dashboard's "Create Task" button links here with ?new=true. Read it
  // off the location rather than useSearchParams so the page still prerenders.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('new') === 'true') setShowForm(true);
  }, []);

  const mine = useCallback((t: TaskRow) => !mineOnly || !user?.id || t.assigned_to === user.id || t.created_by === user.id, [mineOnly, user?.id]);

  const open = useMemo(() => openTasks.filter(mine), [openTasks, mine]);
  const done = useMemo(() => doneTasks.filter(mine), [doneTasks, mine]);

  const grouped = useMemo(() => {
    const buckets: Record<GroupKey, TaskRow[]> = { overdue: [], today: [], tomorrow: [], week: [], later: [], none: [] };
    open.forEach((t) => buckets[groupOf(t)].push(t));
    return buckets;
  }, [open]);

  const counts = {
    active: open.length,
    today: grouped.today.length,
    overdue: grouped.overdue.length,
    completed: done.length,
    all: open.length + done.length,
  };

  const visibleGroups: { key: GroupKey; tasks: TaskRow[] }[] =
    view === 'active' || view === 'all' ? GROUPS.map((g) => ({ key: g.key, tasks: grouped[g.key] }))
    : view === 'today' ? [{ key: 'today', tasks: grouped.today }]
    : view === 'overdue' ? [{ key: 'overdue', tasks: grouped.overdue }]
    : [];
  const showCompleted = view === 'completed' || view === 'all';
  const nothingToShow = visibleGroups.every((g) => g.tasks.length === 0) && (!showCompleted || done.length === 0);

  const stamp = () => new Date().toISOString();

  const setStatus = async (task: Task, status: Task['status']) => {
    const { error } = await supabase.from('tasks').update({
      status,
      completed_at: status === 'Completed' ? stamp() : null,
      updated_at: stamp(),
    }).eq('id', task.id);
    if (error) { toast.error(friendlyError(error)); return; }
    if (status === 'Completed') toast.success('Task completed');
    await loadTasks();
    notifyTasksChanged();
  };

  const toggleComplete = (task: Task) => setStatus(task, task.status === 'Completed' ? 'To Do' : 'Completed');
  const toggleInProgress = (task: Task) => setStatus(task, task.status === 'In Progress' ? 'To Do' : 'In Progress');

  const deleteTask = async (taskId: string) => {
    const { error } = await supabase.from('tasks').update({ status: 'Cancelled', updated_at: stamp() }).eq('id', taskId);
    if (error) { toast.error(friendlyError(error)); return; }
    toast.success('Task removed');
    await loadTasks();
    notifyTasksChanged();
  };

  const createTask = async (formData: Record<string, unknown>) => {
    const { error } = await supabase.from('tasks').insert({
      ...formData,
      assigned_to: user?.id,
      created_by: user?.id,
    });
    if (error) { toast.error(friendlyError(error)); return false; }
    await loadTasks();
    notifyTasksChanged();
    return true;
  };

  const handleSave = async (formData: Record<string, unknown>) => {
    if (await createTask(formData)) {
      toast.success('Task created');
      setShowForm(false);
    }
  };

  // ClickUp-style quick add: a title and Enter. Due today, so it lands in the
  // Today group and on the badge immediately; open the full form for anything
  // that needs a date, a client or a priority.
  const quickAdd = async () => {
    const title = quickTitle.trim();
    if (!title || quickSaving) return;
    setQuickSaving(true);
    const ok = await createTask({
      title,
      description: '',
      priority: 'Medium',
      due_date: new Date(`${isoDateOffset(0)}T12:00:00`).toISOString(),
      related_client_id: null,
    });
    setQuickSaving(false);
    if (ok) { setQuickTitle(''); toast.success('Added for today'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tasks</h1>
          <p className="text-sm text-muted-foreground">
            {counts.overdue > 0 && <span className="font-medium text-red-600">{counts.overdue} overdue</span>}
            {counts.overdue > 0 && (counts.today > 0 || counts.active > 0) && <span className="mx-1.5">·</span>}
            {counts.today > 0 && <span className="font-medium text-amber-600">{counts.today} due today</span>}
            {counts.today > 0 && counts.active > 0 && <span className="mx-1.5">·</span>}
            {counts.active > 0 ? `${counts.active} open` : counts.overdue === 0 && counts.today === 0 ? 'Nothing open' : null}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowTemplates(true)} className="gap-1.5">
            <Zap className="h-4 w-4 text-[#2C3E6B]" /> Templates
          </Button>
          <Button onClick={() => setShowForm(true)} className="bg-gradient-to-r from-[#2C3E6B] to-[#1B2A4A] hover:from-[#1B2A4A] hover:to-[#2C3E6B] text-white border border-[#B8962E]/20">
            <Plus className="mr-1 h-4 w-4" /> Add Task
          </Button>
        </div>
      </div>

      <div className="relative">
        <Plus className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={quickTitle}
          onChange={(e) => setQuickTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); quickAdd(); } }}
          placeholder="Add a task for today and press Enter…"
          disabled={quickSaving}
          className="h-11 bg-white pl-9 pr-28"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 items-center gap-1 text-[10px] font-medium text-muted-foreground sm:flex">
          <CornerDownLeft className="h-3 w-3" /> Enter to add
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {([
          { value: 'active', label: 'Active', icon: CheckSquare },
          { value: 'today', label: 'Today', icon: Sun },
          { value: 'overdue', label: 'Overdue', icon: AlertTriangle },
          { value: 'completed', label: 'Completed', icon: Clock },
          { value: 'all', label: 'All', icon: Filter },
        ] as { value: View; label: string; icon: typeof CheckSquare }[]).map((f) => {
          const n = counts[f.value];
          const active = view === f.value;
          return (
            <Button key={f.value} variant={active ? 'default' : 'outline'} size="sm" onClick={() => setView(f.value)} className={cn('gap-1.5', active && 'bg-[#2C3E6B]')}>
              <f.icon className="h-3.5 w-3.5" /> {f.label}
              <span className={cn(
                'ml-0.5 inline-flex h-4 min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold',
                active ? 'bg-white/20 text-white'
                : f.value === 'overdue' && n > 0 ? 'bg-red-100 text-red-700'
                : f.value === 'today' && n > 0 ? 'bg-amber-100 text-amber-700'
                : 'bg-muted text-muted-foreground',
              )}>
                {n}
              </span>
            </Button>
          );
        })}
        <div className="ml-auto">
          <Button variant={mineOnly ? 'default' : 'outline'} size="sm" onClick={() => setMineOnly((v) => !v)} className={cn('gap-1.5', mineOnly && 'bg-[#2C3E6B]')}>
            <User className="h-3.5 w-3.5" /> Mine
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3, 4].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />)}</div>
      ) : nothingToShow ? (
        <Card>
          <CardContent className="py-16 text-center">
            <CheckSquare className="mx-auto mb-2 h-10 w-10 text-emerald-500" />
            <p className="text-lg font-medium">{view === 'completed' ? 'Nothing completed yet' : 'All caught up!'}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {view === 'overdue' ? 'No overdue tasks' : view === 'today' ? 'Nothing due today' : view === 'completed' ? 'Completed tasks show up here' : 'Type above to add one for today'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {visibleGroups.filter((g) => g.tasks.length > 0).map((g) => {
            const meta = GROUPS.find((x) => x.key === g.key)!;
            return (
              <section key={g.key} className="space-y-2">
                <h2 className={cn('flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wider', meta.tone)}>
                  {meta.label}
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">{g.tasks.length}</span>
                </h2>
                {g.tasks.map((task) => (
                  <TaskItem key={task.id} task={task} bar={meta.bar} onComplete={toggleComplete} onProgress={toggleInProgress} onDelete={deleteTask} />
                ))}
              </section>
            );
          })}

          {showCompleted && done.length > 0 && (
            <section className="space-y-2">
              <h2 className="flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wider text-emerald-700">
                Completed
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">{done.length}{done.length === 100 ? '+' : ''}</span>
              </h2>
              {done.map((task) => (
                <TaskItem key={task.id} task={task} bar="" onComplete={toggleComplete} onProgress={toggleInProgress} onDelete={deleteTask} />
              ))}
            </section>
          )}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Task</DialogTitle></DialogHeader>
          <TaskForm onSave={handleSave} onCancel={() => setShowForm(false)} />
        </DialogContent>
      </Dialog>

      <TaskTemplateDialog
        open={showTemplates}
        onOpenChange={setShowTemplates}
        userId={user?.id || ''}
        onSaved={() => { loadTasks(); notifyTasksChanged(); }}
      />
    </div>
  );
}

function TaskItem({ task, bar, onComplete, onProgress, onDelete }: {
  task: TaskRow;
  bar: string;
  onComplete: (t: Task) => void;
  onProgress: (t: Task) => void;
  onDelete: (id: string) => void;
}) {
  const completed = task.status === 'Completed';
  const inProgress = task.status === 'In Progress';
  const day = dueDay(task);
  const group = completed ? null : groupOf(task);

  return (
    <Card className={cn('transition-colors', bar && `border-l-2 ${bar}`, completed && 'bg-muted/30')}>
      <CardContent className="flex items-center gap-3 p-3 sm:p-4">
        <Checkbox checked={completed} onCheckedChange={() => onComplete(task)} className="h-5 w-5" aria-label={completed ? 'Reopen task' : 'Complete task'} />
        <div className="min-w-0 flex-1">
          <p className={cn('font-medium', completed && 'text-muted-foreground line-through')}>{task.title}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            {day && !completed && (
              <span className={cn('flex items-center gap-1 text-xs', group === 'overdue' ? 'font-medium text-red-600' : group === 'today' ? 'font-medium text-amber-600' : 'text-muted-foreground')}>
                <Calendar className="h-3 w-3" /> {formatRelativeDate(day)}
              </span>
            )}
            {completed && task.completed_at && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <CheckSquare className="h-3 w-3" /> Done {formatRelativeDate(task.completed_at.split('T')[0]).toLowerCase()}
              </span>
            )}
            {task.client && (
              <Link href={`/clients/${task.client.id}`} className="text-xs text-[#2C3E6B] hover:underline">
                {task.client.first_name} {task.client.last_name}
              </Link>
            )}
            {task.description && <span className="max-w-[240px] truncate text-xs text-muted-foreground">{task.description}</span>}
          </div>
        </div>

        {!completed && (
          <button
            type="button"
            onClick={() => onProgress(task)}
            title={inProgress ? 'Mark as To Do' : 'Mark In Progress'}
            className={cn(
              'hidden shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-colors sm:inline-flex',
              inProgress ? 'border-[#2C3E6B]/30 bg-[#2C3E6B]/10 text-[#2C3E6B]' : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
            )}
          >
            {inProgress ? <CircleDot className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
            {inProgress ? 'In progress' : 'To do'}
          </button>
        )}
        <Badge className={cn(priorityColors[task.priority], 'shrink-0 text-[10px]')}>{task.priority}</Badge>
        {completed ? (
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground" title="Reopen" onClick={() => onComplete(task)}>
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-red-600" title="Remove" onClick={() => onDelete(task.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function TaskForm({ onSave, onCancel }: { onSave: (data: Record<string, unknown>) => Promise<void>; onCancel: () => void }) {
  const [saving, setSaving] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [clientName, setClientName] = useState('');
  const [form, setForm] = useState({ title: '', description: '', due_date: '', priority: 'Medium', related_client_id: '' });

  const suggestions: TaskSuggestion[] = selectedCategory ? (TASK_SUGGESTIONS[selectedCategory] || []) : [];
  const clientSuggestions = clientName ? getTaskSuggestionsForClient(clientName) : [];

  const applySuggestion = (s: TaskSuggestion) => {
    setForm({
      ...form,
      title: s.title,
      description: s.description,
      priority: s.priority,
      due_date: isoDateOffset(s.dueDaysFromNow),
    });
    setShowSuggestions(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave({
      ...form,
      due_date: form.due_date ? new Date(`${form.due_date}T12:00:00`).toISOString() : null,
      related_client_id: form.related_client_id || null,
    });
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {showSuggestions && !form.title && (
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <Sparkles className="h-3 w-3 text-[#2C3E6B]" /> Quick Add
          </Label>
          <div className="flex flex-wrap gap-1.5">
            {Object.keys(TASK_SUGGESTIONS).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors duration-150 ${
                  selectedCategory === cat
                    ? 'border-[#2C3E6B] bg-[#2C3E6B]/5 text-[#2C3E6B]'
                    : 'hover:border-[#2C3E6B] hover:bg-[#2C3E6B]/5'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          {suggestions.length > 0 && (
            <div className="mt-2 space-y-1">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => applySuggestion(s)}
                  className="group flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors duration-150 hover:border-[#2C3E6B] hover:bg-[#2C3E6B]/5"
                >
                  <Zap className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-[#2C3E6B]" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium">{s.title}</p>
                    <p className="text-[10px] text-muted-foreground">{s.description}</p>
                  </div>
                  <Badge className={`${priorityColors[s.priority]} shrink-0 text-[10px]`}>{s.priority}</Badge>
                </button>
              ))}
            </div>
          )}
          {clientSuggestions.length > 0 && !selectedCategory && (
            <div className="mt-2 space-y-1">
              <p className="px-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">For {clientName}</p>
              {clientSuggestions.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => applySuggestion(s)}
                  className="group flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors duration-150 hover:border-[#2C3E6B] hover:bg-[#2C3E6B]/5"
                >
                  <Zap className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-[#2C3E6B]" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium">{s.title}</p>
                    <p className="text-[10px] text-muted-foreground">{s.description}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="space-y-1.5">
        <Label>Title</Label>
        <Input
          value={form.title}
          onChange={(e) => { setForm({ ...form, title: e.target.value }); setShowSuggestions(!e.target.value); }}
          placeholder="What needs to be done?"
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label>Description</Label>
        <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Additional details..." />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Due Date</Label>
          <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
          <div className="mt-1 flex gap-1">
            {[
              { label: 'Today', days: 0 },
              { label: 'Tomorrow', days: 1 },
              { label: '3 days', days: 3 },
              { label: '1 week', days: 7 },
            ].map((q) => (
              <button
                key={q.label}
                type="button"
                onClick={() => setForm({ ...form, due_date: isoDateOffset(q.days) })}
                className="rounded-md bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Priority</Label>
          <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{TASK_PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Related Client</Label>
        <ClientCombobox
          value={form.related_client_id}
          placeholder="Type a client name…"
          noneLabel="None"
          onChange={(id, client) => {
            setForm({ ...form, related_client_id: id });
            setClientName(client ? `${client.first_name} ${client.last_name}`.trim() : '');
            if (id && !form.title) setShowSuggestions(true);
          }}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="bg-gradient-to-r from-[#2C3E6B] to-[#1B2A4A] hover:from-[#1B2A4A] hover:to-[#2C3E6B] text-white border border-[#B8962E]/20" disabled={saving}>{saving ? 'Saving...' : 'Create Task'}</Button>
      </div>
    </form>
  );
}
