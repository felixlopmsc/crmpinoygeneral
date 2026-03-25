'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatRelativeDate, getGreeting, daysUntil } from '@/lib/format';
import type { Task, Activity, Client } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, FileText, TrendingUp, DollarSign, Plus, ArrowRight, CircleCheck as CheckCircle2, Clock, TriangleAlert as AlertTriangle, Phone, Mail, CalendarDays, Upload } from 'lucide-react';
import { BulkClientImportDialog } from '@/components/forms/bulk-client-import';
import { UpcomingRenewalsWidget } from '@/components/dashboard/upcoming-renewals-widget';

interface DashboardStats {
  totalClients: number;
  activePolicies: number;
  pipelineValue: number;
  pendingCommissions: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    activePolicies: 0,
    pipelineValue: 0,
    pendingCommissions: 0,
  });
  const [tasks, setTasks] = useState<Task[]>([]);
  const [recentActivities, setRecentActivities] = useState<(Activity & { client: Client })[]>([]);
  const [dealsByStage, setDealsByStage] = useState<Record<string, { count: number; value: number }>>({});
  const [loading, setLoading] = useState(true);
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    const [clientsRes, policiesRes, dealsRes, commissionsRes, tasksRes, activitiesRes] =
      await Promise.all([
        supabase.from('clients').select('id', { count: 'exact', head: true }),
        supabase.from('policies').select('id', { count: 'exact', head: true }).eq('status', 'Active'),
        supabase.from('deals').select('*').eq('status', 'Open'),
        supabase.from('commissions').select('commission_amount').eq('payment_status', 'Pending'),
        supabase.from('tasks').select('*, client:clients(id, first_name, last_name)').in('status', ['To Do', 'In Progress']).order('due_date', { ascending: true }).limit(5),
        supabase.from('activities').select('*, client:clients(id, first_name, last_name)').order('activity_date', { ascending: false }).limit(10),
      ]);

    const deals = dealsRes.data || [];
    const commissions = commissionsRes.data || [];
    const pipelineValue = deals.reduce((sum, d) => sum + (d.value || 0), 0);
    const pendingCommissions = commissions.reduce((sum, c) => sum + (c.commission_amount || 0), 0);

    const stages: Record<string, { count: number; value: number }> = {};
    deals.forEach((d) => {
      if (!stages[d.stage]) stages[d.stage] = { count: 0, value: 0 };
      stages[d.stage].count += 1;
      stages[d.stage].value += d.value || 0;
    });

    setStats({
      totalClients: clientsRes.count || 0,
      activePolicies: policiesRes.count || 0,
      pipelineValue,
      pendingCommissions,
    });
    setTasks((tasksRes.data as any) || []);
    setRecentActivities((activitiesRes.data as any) || []);
    setDealsByStage(stages);
    setLoading(false);
  }

  const statCards = [
    { label: 'Total Clients', value: stats.totalClients, icon: Users, color: 'text-[#1E40AF]', bg: 'bg-blue-50', href: '/clients' },
    { label: 'Active Policies', value: stats.activePolicies, icon: FileText, color: 'text-[#10B981]', bg: 'bg-emerald-50', href: '/policies' },
    { label: 'Pipeline Value', value: formatCurrency(stats.pipelineValue), icon: TrendingUp, color: 'text-[#F59E0B]', bg: 'bg-amber-50', href: '/deals' },
    { label: 'Pending Commissions', value: formatCurrency(stats.pendingCommissions), icon: DollarSign, color: 'text-[#1E40AF]', bg: 'bg-blue-50', href: '/commissions' },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-80 animate-pulse rounded-xl bg-muted" />
          <div className="h-80 animate-pulse rounded-xl bg-muted" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {getGreeting()}, {user?.full_name?.split(' ')[0] || 'Agent'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowImport(true)}>
            <Upload className="mr-1 h-4 w-4" />
            Import
          </Button>
          <Button asChild size="sm" className="bg-[#1E40AF] hover:bg-[#1E3A8A] text-white">
            <Link href="/clients?new=true">
              <Plus className="mr-1 h-4 w-4" />
              New Client
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/deals?new=true">
              <Plus className="mr-1 h-4 w-4" />
              New Deal
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Link key={card.label} href={card.href}>
            <Card className="transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer">
              <CardContent className="flex items-center gap-4 p-5">
                <div className={`rounded-xl p-3 ${card.bg}`}>
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <p className="text-xl font-bold">{card.value}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold">Today&apos;s Tasks</CardTitle>
            <Button asChild variant="ghost" size="sm" className="text-xs">
              <Link href="/tasks">View All <ArrowRight className="ml-1 h-3 w-3" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle2 className="h-10 w-10 text-[#10B981] mb-2" />
                <p className="text-sm font-medium">All caught up!</p>
                <p className="text-xs text-muted-foreground">No pending tasks</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tasks.map((task) => (
                  <div key={task.id} className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50">
                    <div className={`mt-0.5 rounded-full p-1 ${
                      task.priority === 'Urgent' ? 'bg-red-100 text-red-600' :
                      task.priority === 'High' ? 'bg-amber-100 text-amber-600' :
                      'bg-blue-100 text-[#1E40AF]'
                    }`}>
                      {task.priority === 'Urgent' ? <AlertTriangle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{task.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {task.due_date && (
                          <span className={`text-xs ${daysUntil(task.due_date.split('T')[0]) < 0 ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                            {formatRelativeDate(task.due_date.split('T')[0])}
                          </span>
                        )}
                        {task.client && (
                          <span className="text-xs text-muted-foreground">
                            {(task.client as any).first_name} {(task.client as any).last_name}
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge variant={task.priority === 'Urgent' ? 'destructive' : 'secondary'} className="text-[10px] shrink-0">
                      {task.priority}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <UpcomingRenewalsWidget />

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold">Pipeline Summary</CardTitle>
            <Button asChild variant="ghost" size="sm" className="text-xs">
              <Link href="/deals">View All <ArrowRight className="ml-1 h-3 w-3" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            {Object.keys(dealsByStage).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <TrendingUp className="h-10 w-10 text-muted-foreground/40 mb-2" />
                <p className="text-sm font-medium">No active deals</p>
                <p className="text-xs text-muted-foreground">Create your first deal to get started</p>
                <Button asChild size="sm" className="mt-3 bg-[#1E40AF] hover:bg-[#1E3A8A] text-white">
                  <Link href="/deals?new=true"><Plus className="mr-1 h-3 w-3" /> New Deal</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {['New Lead', 'Contacted', 'Quote Sent', 'Negotiating', 'Closed Won', 'Closed Lost'].map((stage) => {
                  const data = dealsByStage[stage];
                  if (!data) return null;
                  const colors: Record<string, string> = {
                    'New Lead': 'bg-blue-500',
                    'Contacted': 'bg-cyan-500',
                    'Quote Sent': 'bg-amber-500',
                    'Negotiating': 'bg-orange-500',
                    'Closed Won': 'bg-emerald-500',
                    'Closed Lost': 'bg-red-500',
                  };
                  return (
                    <div key={stage} className="flex items-center gap-3">
                      <div className={`h-2 w-2 rounded-full ${colors[stage]}`} />
                      <span className="text-sm flex-1">{stage}</span>
                      <span className="text-sm font-medium">{data.count}</span>
                      <span className="text-sm text-muted-foreground w-24 text-right">{formatCurrency(data.value)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
            <Button asChild variant="ghost" size="sm" className="text-xs">
              <Link href="/activities">View All <ArrowRight className="ml-1 h-3 w-3" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentActivities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Clock className="h-10 w-10 text-muted-foreground/40 mb-2" />
                <p className="text-sm font-medium">No recent activity</p>
                <p className="text-xs text-muted-foreground">Activity will appear here as you work</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivities.map((activity) => {
                  const icons: Record<string, any> = {
                    Call: Phone,
                    Email: Mail,
                    Meeting: CalendarDays,
                    Note: FileText,
                    Task: CheckCircle2,
                    SMS: Phone,
                  };
                  const Icon = icons[activity.activity_type] || FileText;
                  return (
                    <div key={activity.id} className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-lg bg-muted p-1.5">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{activity.subject}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {activity.client && (
                            <Link href={`/clients/${activity.client_id}`} className="text-xs text-[#1E40AF] hover:underline">
                              {(activity.client as any).first_name} {(activity.client as any).last_name}
                            </Link>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {formatRelativeDate(activity.activity_date.split('T')[0])}
                          </span>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-[10px] shrink-0">{activity.activity_type}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <BulkClientImportDialog
        open={showImport}
        onOpenChange={setShowImport}
        onComplete={loadDashboard}
      />
    </div>
  );
}
