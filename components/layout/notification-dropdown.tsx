'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { formatDistanceToNow } from 'date-fns';
import { Bell, CircleCheck as CheckCircle2, Clock, TriangleAlert as AlertTriangle, Users, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';

interface NotificationItem {
  id: string;
  type: 'task' | 'renewal' | 'client';
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
}

export default function NotificationDropdown() {
  const { session } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!session) return;

    const items: NotificationItem[] = [];

    const [tasksRes, renewalsRes, clientsRes] = await Promise.all([
      supabase
        .from('tasks')
        .select('id, title, due_date, priority, status')
        .in('status', ['To Do', 'In Progress'])
        .order('due_date', { ascending: true })
        .limit(5),
      supabase
        .from('renewals')
        .select('id, renewal_date, status, policy_id, client_id, clients(first_name, last_name)')
        .in('status', ['Upcoming', 'Pending'])
        .order('renewal_date', { ascending: true })
        .limit(5),
      supabase
        .from('clients')
        .select('id, first_name, last_name, created_at, status')
        .eq('status', 'Lead')
        .order('created_at', { ascending: false })
        .limit(5),
    ]);

    if (tasksRes.data) {
      tasksRes.data.forEach((task: any) => {
        const isOverdue = task.due_date && new Date(task.due_date) < new Date();
        items.push({
          id: `task-${task.id}`,
          type: 'task',
          title: isOverdue ? 'Overdue Task' : 'Pending Task',
          description: task.title,
          timestamp: task.due_date || new Date().toISOString(),
          read: false,
        });
      });
    }

    if (renewalsRes.data) {
      renewalsRes.data.forEach((renewal: any) => {
        const client = renewal.clients;
        const name = client ? `${client.first_name} ${client.last_name}` : 'Unknown';
        items.push({
          id: `renewal-${renewal.id}`,
          type: 'renewal',
          title: 'Upcoming Renewal',
          description: `${name} - renews ${formatDistanceToNow(new Date(renewal.renewal_date), { addSuffix: true })}`,
          timestamp: renewal.renewal_date,
          read: false,
        });
      });
    }

    if (clientsRes.data) {
      clientsRes.data.forEach((client: any) => {
        items.push({
          id: `client-${client.id}`,
          type: 'client',
          title: 'New Lead',
          description: `${client.first_name} ${client.last_name} added ${formatDistanceToNow(new Date(client.created_at), { addSuffix: true })}`,
          timestamp: client.created_at,
          read: false,
        });
      });
    }

    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setNotifications(items);
  }, [session]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    if (open) {
      loadNotifications();
    }
  }, [open, loadNotifications]);

  const iconMap = {
    task: Clock,
    renewal: FileText,
    client: Users,
  };

  const colorMap = {
    task: 'text-amber-600 bg-amber-50',
    renewal: 'text-blue-600 bg-blue-50',
    client: 'text-emerald-600 bg-emerald-50',
  };

  const unreadCount = notifications.length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-[18px] w-[18px]" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="font-semibold text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <span className="text-xs text-muted-foreground">{unreadCount} items</span>
          )}
        </div>
        <ScrollArea className="max-h-[360px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 px-4">
              <CheckCircle2 className="h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">All caught up</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((item) => {
                const Icon = iconMap[item.type];
                const colors = colorMap[item.type];
                return (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className={`mt-0.5 rounded-full p-1.5 ${colors}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {item.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
