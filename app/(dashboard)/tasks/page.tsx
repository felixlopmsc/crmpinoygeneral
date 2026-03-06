'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { formatRelativeDate, daysUntil } from '@/lib/format';
import type { Task, Client } from '@/lib/types';
import { TASK_PRIORITIES } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Plus, SquareCheck as CheckSquare, TriangleAlert as AlertTriangle, Clock, Calendar, Filter, Trash2 } from 'lucide-react';

const priorityColors: Record<string, string> = {
  Low: 'bg-gray-100 text-gray-700',
  Medium: 'bg-blue-100 text-blue-700',
  High: 'bg-amber-100 text-amber-700',
  Urgent: 'bg-red-100 text-red-700',
};

export default function TasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<(Task & { client?: Client })[]>([]);
  const [clients, setClients] = useState<Pick<Client, 'id' | 'first_name' | 'last_name'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [viewFilter, setViewFilter] = useState('active');

  const loadTasks = useCallback(async () => {
    let query = supabase
      .from('tasks')
      .select('*, client:clients(id, first_name, last_name)')
      .order('due_date', { ascending: true, nullsFirst: false });

    if (viewFilter === 'active') {
      query = query.in('status', ['To Do', 'In Progress']);
    } else if (viewFilter === 'completed') {
      query = query.eq('status', 'Completed');
    } else if (viewFilter === 'overdue') {
      query = query.in('status', ['To Do', 'In Progress']).lt('due_date', new Date().toISOString());
    }

    const { data } = await query.limit(100);
    setTasks((data as any) || []);
    setLoading(false);
  }, [viewFilter]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const handleOpenForm = async () => {
    const { data } = await supabase.from('clients').select('id, first_name, last_name').order('first_name').limit(100);
    setClients(data || []);
    setShowForm(true);
  };

  const toggleComplete = async (task: Task) => {
    const newStatus = task.status === 'Completed' ? 'To Do' : 'Completed';
    await supabase.from('tasks').update({
      status: newStatus,
      completed_at: newStatus === 'Completed' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }).eq('id', task.id);
    loadTasks();
  };

  const deleteTask = async (taskId: string) => {
    await supabase.from('tasks').update({ status: 'Cancelled', updated_at: new Date().toISOString() }).eq('id', taskId);
    loadTasks();
    toast.success('Task removed');
  };

  const handleSave = async (formData: any) => {
    const { error } = await supabase.from('tasks').insert({
      ...formData,
      assigned_to: user?.id,
      created_by: user?.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Task created');
    setShowForm(false);
    loadTasks();
  };

  const overdueTasks = tasks.filter((t) => t.due_date && daysUntil(t.due_date.split('T')[0]) < 0 && t.status !== 'Completed');
  const todayTasks = tasks.filter((t) => t.due_date && daysUntil(t.due_date.split('T')[0]) === 0 && t.status !== 'Completed');

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tasks</h1>
          <p className="text-sm text-muted-foreground">
            {overdueTasks.length > 0 && <span className="text-red-600 font-medium">{overdueTasks.length} overdue</span>}
            {overdueTasks.length > 0 && todayTasks.length > 0 && ' - '}
            {todayTasks.length > 0 && <span className="text-amber-600 font-medium">{todayTasks.length} due today</span>}
            {overdueTasks.length === 0 && todayTasks.length === 0 && `${tasks.length} tasks`}
          </p>
        </div>
        <Button onClick={handleOpenForm} className="bg-[#1E40AF] hover:bg-[#1E3A8A] text-white">
          <Plus className="mr-1 h-4 w-4" /> Add Task
        </Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          { value: 'active', label: 'Active', icon: CheckSquare },
          { value: 'overdue', label: 'Overdue', icon: AlertTriangle },
          { value: 'completed', label: 'Completed', icon: Clock },
          { value: 'all', label: 'All', icon: Filter },
        ].map((f) => (
          <Button key={f.value} variant={viewFilter === f.value ? 'default' : 'outline'} size="sm" onClick={() => setViewFilter(f.value)} className={viewFilter === f.value ? 'bg-[#1E40AF]' : ''}>
            <f.icon className="mr-1 h-3.5 w-3.5" /> {f.label}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3, 4].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />)}</div>
      ) : tasks.length === 0 ? (
        <Card><CardContent className="py-16 text-center"><CheckSquare className="h-10 w-10 text-emerald-500 mx-auto mb-2" /><p className="text-lg font-medium">{viewFilter === 'active' ? 'All caught up!' : 'No tasks found'}</p><p className="text-sm text-muted-foreground mt-1">{viewFilter === 'active' ? 'No pending tasks' : 'Adjust your filters'}</p></CardContent></Card>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => {
            const isOverdue = task.due_date && daysUntil(task.due_date.split('T')[0]) < 0 && task.status !== 'Completed';
            const isToday = task.due_date && daysUntil(task.due_date.split('T')[0]) === 0;
            return (
              <Card key={task.id} className={`transition-colors ${isOverdue ? 'border-l-4 border-l-red-500' : isToday ? 'border-l-4 border-l-amber-500' : ''}`}>
                <CardContent className="p-4 flex items-center gap-3">
                  <Checkbox
                    checked={task.status === 'Completed'}
                    onCheckedChange={() => toggleComplete(task)}
                    className="h-5 w-5"
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium ${task.status === 'Completed' ? 'line-through text-muted-foreground' : ''}`}>{task.title}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {task.due_date && (
                        <span className={`text-xs flex items-center gap-1 ${isOverdue ? 'text-red-600 font-medium' : isToday ? 'text-amber-600 font-medium' : 'text-muted-foreground'}`}>
                          <Calendar className="h-3 w-3" />
                          {formatRelativeDate(task.due_date.split('T')[0])}
                        </span>
                      )}
                      {task.client && (
                        <Link href={`/clients/${task.related_client_id}`} className="text-xs text-[#1E40AF] hover:underline">
                          {(task.client as any).first_name} {(task.client as any).last_name}
                        </Link>
                      )}
                      {task.description && <span className="text-xs text-muted-foreground truncate max-w-[200px]">{task.description}</span>}
                    </div>
                  </div>
                  <Badge className={`${priorityColors[task.priority]} text-[10px] shrink-0`}>{task.priority}</Badge>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-red-600" onClick={() => deleteTask(task.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Task</DialogTitle></DialogHeader>
          <TaskForm clients={clients} onSave={handleSave} onCancel={() => setShowForm(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TaskForm({ clients, onSave, onCancel }: { clients: Pick<Client, 'id' | 'first_name' | 'last_name'>[]; onSave: (data: any) => Promise<void>; onCancel: () => void }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', due_date: '', priority: 'Medium', related_client_id: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave({
      ...form,
      due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
      related_client_id: form.related_client_id || null,
    });
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5"><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
      <div className="space-y-1.5"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label>Due Date</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
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
        <Select value={form.related_client_id || 'none'} onValueChange={(v) => setForm({ ...form, related_client_id: v === 'none' ? '' : v })}>
          <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="bg-[#1E40AF] hover:bg-[#1E3A8A] text-white" disabled={saving}>{saving ? 'Saving...' : 'Create Task'}</Button>
      </div>
    </form>
  );
}
