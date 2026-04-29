'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Client } from '@/lib/types';
import { TASK_TEMPLATES, type TaskTemplate, type TaskTemplateItem } from '@/lib/task-templates';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { UserPlus, RefreshCw, Send, Search, ChevronRight, ArrowLeft, Calendar, Zap, Loader as Loader2, SquareCheck as CheckSquare } from 'lucide-react';

const templateIcons: Record<string, any> = {
  UserPlus,
  RefreshCw,
  Send,
};

const priorityDots: Record<string, string> = {
  Low: 'bg-gray-400',
  Medium: 'bg-blue-500',
  High: 'bg-amber-500',
  Urgent: 'bg-red-500',
};

interface TaskTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId?: string;
  userId: string;
  onSaved: () => void;
}

function addBusinessDays(start: Date, days: number): Date {
  const result = new Date(start);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const dow = result.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return result;
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function TaskTemplateDialog({ open, onOpenChange, clientId, userId, onSaved }: TaskTemplateDialogProps) {
  const [step, setStep] = useState<'select' | 'customize'>('select');
  const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplate | null>(null);
  const [enabledTasks, setEnabledTasks] = useState<Set<number>>(new Set());
  const [startDate, setStartDate] = useState('');
  const [creating, setCreating] = useState(false);

  const [clients, setClients] = useState<Client[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const clientSearchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setStep('select');
      setSelectedTemplate(null);
      setStartDate(new Date().toISOString().split('T')[0]);
      setSelectedClient(null);
      setClientSearch('');

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
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const pickTemplate = (template: TaskTemplate) => {
    setSelectedTemplate(template);
    setEnabledTasks(new Set(template.tasks.map((_, i) => i)));
    setStep('customize');
  };

  const toggleTask = (index: number) => {
    setEnabledTasks((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const toggleAll = () => {
    if (!selectedTemplate) return;
    if (enabledTasks.size === selectedTemplate.tasks.length) {
      setEnabledTasks(new Set());
    } else {
      setEnabledTasks(new Set(selectedTemplate.tasks.map((_, i) => i)));
    }
  };

  const getDueDate = (task: TaskTemplateItem): Date => {
    const base = new Date(startDate + 'T00:00:00');
    if (task.dayOffset === 0) return base;
    return addBusinessDays(base, task.dayOffset);
  };

  const handleCreate = async () => {
    if (!selectedTemplate) return;
    const resolvedClientId = clientId || selectedClient?.id;

    setCreating(true);

    const tasksToInsert = selectedTemplate.tasks
      .filter((_, i) => enabledTasks.has(i))
      .map((task) => ({
        title: task.title,
        description: task.description,
        due_date: getDueDate(task).toISOString(),
        priority: task.priority,
        status: 'To Do',
        related_client_id: resolvedClientId || null,
        assigned_to: userId,
        created_by: userId,
      }));

    if (tasksToInsert.length === 0) {
      toast.error('Select at least one task');
      setCreating(false);
      return;
    }

    const { error } = await supabase.from('tasks').insert(tasksToInsert);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Created ${tasksToInsert.length} tasks from "${selectedTemplate.name}"`);
      onOpenChange(false);
      onSaved();
    }
    setCreating(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-0 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-[#2C3E6B]" />
            {step === 'select' ? 'Workflow Templates' : selectedTemplate?.name}
          </DialogTitle>
        </DialogHeader>

        {step === 'select' ? (
          <div className="px-6 pb-6 space-y-4 overflow-y-auto">
            {!clientId && (
              <div className="space-y-1.5" ref={clientSearchRef}>
                <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Client (optional)
                </Label>
                {selectedClient ? (
                  <div className="flex items-center gap-2 rounded-lg border p-2.5 bg-muted/30">
                    <div className="h-8 w-8 rounded-full bg-[#2C3E6B] flex items-center justify-center text-white text-xs font-medium">
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
                      onClick={() => setSelectedClient(null)}
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
                      placeholder="Search clients..."
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
                              setShowClientDropdown(false);
                              setClientSearch('');
                            }}
                          >
                            <div className="h-7 w-7 rounded-full bg-[#2C3E6B]/10 flex items-center justify-center text-[#2C3E6B] text-xs font-medium">
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

            <div className="space-y-2">
              {TASK_TEMPLATES.map((template) => {
                const Icon = templateIcons[template.icon] || CheckSquare;
                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => pickTemplate(template)}
                    className="group w-full flex items-start gap-3 rounded-xl border p-4 text-left transition-all hover:border-[#2C3E6B] hover:bg-[#2C3E6B]/5 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2C3E6B]/20"
                  >
                    <div className={`rounded-lg p-2.5 shrink-0 ${template.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{template.name}</span>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {template.tasks.length} tasks
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        {template.description}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        {template.tasks.length > 0 && (
                          <span className="text-[10px] text-muted-foreground">
                            Spans {template.tasks[template.tasks.length - 1].dayOffset} days
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1 shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        ) : selectedTemplate ? (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="px-6 pb-3 shrink-0 space-y-3">
              <button
                type="button"
                onClick={() => setStep('select')}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to templates
              </button>

              <p className="text-xs text-muted-foreground">{selectedTemplate.description}</p>

              <div className="flex items-end gap-3">
                <div className="space-y-1.5 flex-1">
                  <Label className="text-xs">Start Date</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-9"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 text-xs"
                  onClick={toggleAll}
                >
                  {enabledTasks.size === selectedTemplate.tasks.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1 px-6">
              <div className="space-y-1 pb-4">
                {selectedTemplate.tasks.map((task, index) => {
                  const enabled = enabledTasks.has(index);
                  const dueDate = getDueDate(task);
                  return (
                    <div
                      key={index}
                      className={`flex items-start gap-2.5 rounded-lg border p-3 transition-all cursor-pointer ${
                        enabled
                          ? 'bg-white border-border hover:border-[#2C3E6B]/30'
                          : 'bg-muted/30 border-transparent opacity-50'
                      }`}
                      onClick={() => toggleTask(index)}
                    >
                      <Checkbox
                        checked={enabled}
                        onCheckedChange={() => toggleTask(index)}
                        className="mt-0.5 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium leading-tight ${!enabled ? 'line-through' : ''}`}>
                          {task.title}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight line-clamp-2">
                          {task.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center gap-1">
                          <div className={`h-1.5 w-1.5 rounded-full ${priorityDots[task.priority]}`} />
                          <span className="text-[10px] text-muted-foreground">{task.priority}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5">
                          <Calendar className="h-2.5 w-2.5" />
                          {formatShortDate(dueDate)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            <div className="px-6 py-4 border-t shrink-0 flex items-center justify-between bg-white">
              <p className="text-xs text-muted-foreground">
                {enabledTasks.size} of {selectedTemplate.tasks.length} tasks selected
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-[#2C3E6B] to-[#1B2A4A] hover:from-[#1B2A4A] hover:to-[#2C3E6B] text-white border border-[#B8962E]/20 gap-1.5"
                  onClick={handleCreate}
                  disabled={creating || enabledTasks.size === 0}
                >
                  {creating ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Zap className="h-3.5 w-3.5" />
                      Create {enabledTasks.size} Tasks
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
