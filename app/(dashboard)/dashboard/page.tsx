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
import {
  Users,
  FileText,
  TrendingUp,
  DollarSign,
  Plus,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  CircleCheck as CheckCircle2,
  Clock,
  TriangleAlert as AlertTriangle,
  Phone,
  Mail,
  CalendarDays,
  Upload,
  ListTodo,
  Zap,
  Activity as ActivityIcon,
} from 'lucide-react';
import { BulkClientImportDialog } from '@/components/forms/bulk-client-import';
import { UpcomingRenewalsWidget } from '@/components/dashboard/upcoming-renewals-widget';
import { CrossSellWidget } from '@/components/dashboard/cross-sell-widget';

interface DashboardStats {
  totalClients: number;
  activePolicies: number;
  pipelineValue: number;
  pendingCommissions: number;
}

interface TrendData {
  totalClientsTrend: number;
  activePoliciesTrend: number;
  pipelineValueTrend: number;
  pendingCommissionsTrend: number;
}

function TrendIndicator({ value }: { value: number }) {
  if (value === 0) return null;
  const isUp = value > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${isUp ? 'text-[#B8962E]' : 'text-[#8B2D3B]'}`}>
      {isUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {Math.abs(value)}% vs last month
    </span>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    activePolicies: 0,
    pipelineValue: 0,
    pendingCommissions: 0,
  });
  const [trends, setTrends] = useState<TrendData>({
    totalClientsTrend: 0,
    activePoliciesTrend: 0,
    pipelineValueTrend: 0,
    pendingCommissionsTrend: 0,
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
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();

    const [
      clientsRes,
      policiesRes,
      dealsRes,
      commissionsRes,
      tasksRes,
      activitiesRes,
      clientsLastMonthRes,
      policiesLastMonthRes,
      dealsLastMonthRes,
      commissionsLastMonthRes,
    ] = await Promise.all([
      supabase.from('clients').select('id', { count: 'exact', head: true }),
      supabase.from('policies').select('id', { count: 'exact', head: true }).eq('status', 'Active'),
      supabase.from('deals').select('*').eq('status', 'Open'),
      supabase.from('commissions').select('commission_amount').eq('payment_status', 'Pending'),
      supabase
        .from('tasks')
        .select('*, client:clients(id, first_name, last_name)')
        .in('status', ['To Do', 'In Progress'])
        .order('due_date', { ascending: true })
        .limit(5),
      supabase
        .from('activities')
        .select('*, client:clients(id, first_name, last_name)')
        .order('activity_date', { ascending: false })
        .limit(10),
      supabase.from('clients').select('id', { count: 'exact', head: true }).lte('created_at', endOfLastMonth),
      supabase.from('policies').select('id', { count: 'exact', head: true }).eq('status', 'Active').lte('created_at', endOfLastMonth),
      supabase.from('deals').select('value').eq('status', 'Open').lte('created_at', endOfLastMonth),
      supabase.from('commissions').select('commission_amount').eq('payment_status', 'Pending').lte('created_at', endOfLastMonth),
    ]);

    const deals = dealsRes.data || [];
    const commissions = commissionsRes.data || [];
    const pipelineValue = deals.reduce((sum, d) => sum + (d.value || 0), 0);
    const pendingCommissions = commissions.reduce((sum, c) => sum + (c.commission_amount || 0), 0);

    const dealsLast = dealsLastMonthRes.data || [];
    const commissionsLast = commissionsLastMonthRes.data || [];
    const pipelineValueLast = dealsLast.reduce((sum: number, d: any) => sum + (d.value || 0), 0);
    const pendingCommissionsLast = commissionsLast.reduce((sum: number, c: any) => sum + (c.commission_amount || 0), 0);

    const calcTrend = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

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
    setTrends({
      totalClientsTrend: calcTrend(clientsRes.count || 0, clientsLastMonthRes.count || 0),
      activePoliciesTrend: calcTrend(policiesRes.count || 0, policiesLastMonthRes.count || 0),
      pipelineValueTrend: calcTrend(pipelineValue, pipelineValueLast),
      pendingCommissionsTrend: calcTrend(pendingCommissions, pendingCommissionsLast),
    });
    setTasks((tasksRes.data as any) || []);
    setRecentActivities((activitiesRes.data as any) || []);
    setDealsByStage(stages);
    setLoading(false);
  }

  const firstName = user?.full_name?.split(' ')[0] || 'there';

  const statCards = [
    {
      label: 'Total Clients',
      value: stats.totalClients,
      icon: Users,
      color: 'text-[#2C3E6B]',
      bg: 'bg-[#2C3E6B]/5',
      href: '/clients',
      trend: trends.totalClientsTrend,
      emptyMessage: 'Add your first client to get started',
      emptyAction: '/clients?new=true',
      emptyLabel: 'Add Client',
    },
    {
      label: 'Active Policies',
      value: stats.activePolicies,
      icon: FileText,
      color: 'text-[#B8962E]',
      bg: 'bg-[#B8962E]/5',
      href: '/policies',
      trend: trends.activePoliciesTrend,
      emptyMessage: 'Create your first policy to track coverage',
      emptyAction: '/policies?new=true',
      emptyLabel: 'Add Policy',
    },
    {
      label: 'Pipeline Value',
      value: stats.pipelineValue,
      displayValue: formatCurrency(stats.pipelineValue),
      icon: TrendingUp,
      color: 'text-[#8B2D3B]',
      bg: 'bg-[#8B2D3B]/5',
      href: '/deals',
      trend: trends.pipelineValueTrend,
      emptyMessage: 'Start a deal to track your sales pipeline',
      emptyAction: '/deals?new=true',
      emptyLabel: 'New Deal',
    },
    {
      label: 'Pending Commissions',
      value: stats.pendingCommissions,
      displayValue: formatCurrency(stats.pendingCommissions),
      icon: DollarSign,
      color: 'text-[#B8962E]',
      bg: 'bg-[#D4AD3C]/10',
      href: '/commissions',
      trend: trends.pendingCommissionsTrend,
      emptyMessage: 'Commissions appear when policies are sold',
      emptyAction: '/commissions',
      emptyLabel: 'View Commissions',
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-80 animate-pulse rounded-xl bg-muted" />
          <div className="h-80 animate-pulse rounded-xl bg-muted" />
        </div>
      </div>
    );
  }

  const isAllZero = stats.totalClients === 0 && stats.activePolicies === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {getGreeting()}, {firstName}
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
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowImport(true)}
            className="h-9 w-9 p-0"
            title="Import CSV"
          >
            <Upload className="h-4 w-4" />
          </Button>
          <Button asChild size="sm" className="bg-gradient-to-r from-[#2C3E6B] to-[#1B2A4A] hover:from-[#1B2A4A] hover:to-[#2C3E6B] text-white border border-[#B8962E]/20">
            <Link href="/clients?new=true">
              <Plus className="mr-1 h-4 w-4" />
              New Client
            </Link>
          </Button>
          <Button asChild size="sm" className="bg-gradient-to-r from-[#2C3E6B] to-[#1B2A4A] hover:from-[#1B2A4A] hover:to-[#2C3E6B] text-white border border-[#B8962E]/20">
            <Link href="/deals?new=true">
              <Plus className="mr-1 h-4 w-4" />
              New Deal
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => {
          const isEmpty =
            (typeof card.value === 'number' && card.value === 0);
          return (
            <Link key={card.label} href={card.href}>
              <Card className={`transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer border-t-2 ${statCards.indexOf(card) % 2 === 0 ? 'border-t-[#B8962E]/40' : 'border-t-[#8B2D3B]/40'}`}>
                <CardContent className="p-5">
                  <div className="flex items-center gap-4">
                    <div className={`rounded-xl p-3 ${card.bg}`}>
                      <card.icon className={`h-5 w-5 ${card.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-muted-foreground">{card.label}</p>
                      <p className="text-xl font-bold">
                        {card.displayValue ?? card.value}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 min-h-[18px]">
                    {isEmpty ? (
                      <p className="text-[11px] text-muted-foreground/80">{card.emptyMessage}</p>
                    ) : (
                      <TrendIndicator value={card.trend} />
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold">Today&apos;s Tasks</CardTitle>
            <Button asChild variant="ghost" size="sm" className="text-xs">
              <Link href="/tasks">
                View All <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="rounded-xl bg-[#B8962E]/10 p-3 mb-3">
                  <ListTodo className="h-7 w-7 text-[#B8962E]" />
                </div>
                <p className="text-sm font-medium text-foreground">No pending tasks</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-[220px]">
                  Create a task to track follow-ups, calls, or renewals for your clients
                </p>
                <Button asChild size="sm" className="mt-4 bg-gradient-to-r from-[#2C3E6B] to-[#1B2A4A] hover:from-[#1B2A4A] hover:to-[#2C3E6B] text-white border border-[#B8962E]/20">
                  <Link href="/tasks?new=true">
                    <Plus className="mr-1 h-3 w-3" /> Create Task
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div
                      className={`mt-0.5 rounded-full p-1 ${
                        task.priority === 'Urgent'
                          ? 'bg-red-100 text-red-600'
                          : task.priority === 'High'
                          ? 'bg-amber-100 text-amber-600'
                          : 'bg-blue-100 text-[#2C3E6B]'
                      }`}
                    >
                      {task.priority === 'Urgent' ? (
                        <AlertTriangle className="h-3 w-3" />
                      ) : (
                        <Clock className="h-3 w-3" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{task.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {task.due_date && (
                          <span
                            className={`text-xs ${
                              daysUntil(task.due_date.split('T')[0]) < 0
                                ? 'text-red-600 font-medium'
                                : 'text-muted-foreground'
                            }`}
                          >
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
                    <Badge
                      variant={task.priority === 'Urgent' ? 'destructive' : 'secondary'}
                      className="text-[10px] shrink-0"
                    >
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
              <Link href="/deals">
                View All <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {Object.keys(dealsByStage).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="rounded-xl bg-[#8B2D3B]/10 p-3 mb-3">
                  <Zap className="h-7 w-7 text-[#8B2D3B]" />
                </div>
                <p className="text-sm font-medium text-foreground">No active deals yet</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-[220px]">
                  Add your first deal to start tracking your sales pipeline and forecasting revenue
                </p>
                <Button asChild size="sm" className="mt-4 bg-gradient-to-r from-[#2C3E6B] to-[#1B2A4A] hover:from-[#1B2A4A] hover:to-[#2C3E6B] text-white border border-[#B8962E]/20">
                  <Link href="/deals?new=true">
                    <Plus className="mr-1 h-3 w-3" /> New Deal
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {['New Lead', 'Contacted', 'Quote Sent', 'Negotiating', 'Closed Won', 'Closed Lost'].map(
                  (stage) => {
                    const data = dealsByStage[stage];
                    if (!data) return null;
                    const colors: Record<string, string> = {
                      'New Lead': 'bg-[#2C3E6B]',
                      'Contacted': 'bg-[#3D5A8C]',
                      'Quote Sent': 'bg-[#B8962E]',
                      'Negotiating': 'bg-[#D4AD3C]',
                      'Closed Won': 'bg-[#B8962E]',
                      'Closed Lost': 'bg-[#8B2D3B]',
                    };
                    return (
                      <div key={stage} className="flex items-center gap-3">
                        <div className={`h-2 w-2 rounded-full ${colors[stage]}`} />
                        <span className="text-sm flex-1">{stage}</span>
                        <span className="text-sm font-medium">{data.count}</span>
                        <span className="text-sm text-muted-foreground w-24 text-right">
                          {formatCurrency(data.value)}
                        </span>
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
            <Button asChild variant="ghost" size="sm" className="text-xs">
              <Link href="/activities">
                View All <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentActivities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="rounded-xl bg-[#2C3E6B]/10 p-3 mb-3">
                  <ActivityIcon className="h-7 w-7 text-[#2C3E6B]" />
                </div>
                <p className="text-sm font-medium text-foreground">No activity recorded yet</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-[220px]">
                  Log a call, email, or meeting to keep a record of client interactions
                </p>
                <Button asChild size="sm" className="mt-4 bg-gradient-to-r from-[#2C3E6B] to-[#1B2A4A] hover:from-[#1B2A4A] hover:to-[#2C3E6B] text-white border border-[#B8962E]/20">
                  <Link href="/activities?new=true">
                    <Plus className="mr-1 h-3 w-3" /> Log Activity
                  </Link>
                </Button>
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
                            <Link
                              href={`/clients/${activity.client_id}`}
                              className="text-xs text-[#2C3E6B] hover:underline"
                            >
                              {(activity.client as any).first_name} {(activity.client as any).last_name}
                            </Link>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {formatRelativeDate(activity.activity_date.split('T')[0])}
                          </span>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-[10px] shrink-0">
                        {activity.activity_type}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <CrossSellWidget />

      <BulkClientImportDialog open={showImport} onOpenChange={setShowImport} onComplete={loadDashboard} />
    </div>
  );
}
