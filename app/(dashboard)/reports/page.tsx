'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChartBar as BarChart3, TrendingUp, Users, FileText, DollarSign, Download, RefreshCw } from 'lucide-react';

interface ReportData {
  totalClients: number;
  totalPolicies: number;
  activePolicies: number;
  totalPremium: number;
  totalCommissions: number;
  pendingCommissions: number;
  paidCommissions: number;
  totalDeals: number;
  openDeals: number;
  wonDeals: number;
  lostDeals: number;
  pipelineValue: number;
  totalActivities: number;
  totalClaims: number;
  policyBreakdown: Record<string, number>;
  carrierBreakdown: Record<string, number>;
  dealStageBreakdown: Record<string, number>;
  monthlyPolicies: Record<string, number>;
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeReport, setActiveReport] = useState('overview');

  useEffect(() => { loadReports(); }, []);

  async function loadReports() {
    setLoading(true);
    const [
      clientsRes, policiesRes, commissionsRes, dealsRes, activitiesRes, claimsRes,
    ] = await Promise.all([
      supabase.from('clients').select('id', { count: 'exact', head: true }),
      supabase.from('policies').select('*'),
      supabase.from('commissions').select('*'),
      supabase.from('deals').select('*'),
      supabase.from('activities').select('id', { count: 'exact', head: true }),
      supabase.from('claims').select('id', { count: 'exact', head: true }),
    ]);

    const policies = policiesRes.data || [];
    const commissions = commissionsRes.data || [];
    const deals = dealsRes.data || [];
    const activePolicies = policies.filter((p) => p.status === 'Active');

    const policyBreakdown: Record<string, number> = {};
    const carrierBreakdown: Record<string, number> = {};
    const monthlyPolicies: Record<string, number> = {};

    policies.forEach((p) => {
      policyBreakdown[p.policy_type] = (policyBreakdown[p.policy_type] || 0) + 1;
      if (p.carrier) carrierBreakdown[p.carrier] = (carrierBreakdown[p.carrier] || 0) + 1;
      const month = p.created_at?.slice(0, 7);
      if (month) monthlyPolicies[month] = (monthlyPolicies[month] || 0) + 1;
    });

    const dealStageBreakdown: Record<string, number> = {};
    deals.forEach((d) => {
      dealStageBreakdown[d.stage] = (dealStageBreakdown[d.stage] || 0) + 1;
    });

    const openDeals = deals.filter((d) => d.status === 'Open');
    const wonDeals = deals.filter((d) => d.status === 'Won');
    const lostDeals = deals.filter((d) => d.status === 'Lost');

    setData({
      totalClients: clientsRes.count || 0,
      totalPolicies: policies.length,
      activePolicies: activePolicies.length,
      totalPremium: activePolicies.reduce((sum, p) => sum + (p.annual_premium || 0), 0),
      totalCommissions: commissions.reduce((sum, c) => sum + (c.commission_amount || 0), 0),
      pendingCommissions: commissions.filter((c) => c.payment_status === 'Pending').reduce((sum, c) => sum + (c.commission_amount || 0), 0),
      paidCommissions: commissions.filter((c) => c.payment_status === 'Paid').reduce((sum, c) => sum + (c.commission_amount || 0), 0),
      totalDeals: deals.length,
      openDeals: openDeals.length,
      wonDeals: wonDeals.length,
      lostDeals: lostDeals.length,
      pipelineValue: openDeals.reduce((sum, d) => sum + (d.value || 0), 0),
      totalActivities: activitiesRes.count || 0,
      totalClaims: claimsRes.count || 0,
      policyBreakdown,
      carrierBreakdown,
      dealStageBreakdown,
      monthlyPolicies,
    });
    setLoading(false);
  }

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />)}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {[1, 2].map((i) => <div key={i} className="h-64 animate-pulse rounded-xl bg-muted" />)}
        </div>
      </div>
    );
  }

  const winRate = data.wonDeals + data.lostDeals > 0
    ? ((data.wonDeals / (data.wonDeals + data.lostDeals)) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-sm text-muted-foreground">Agency performance overview</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadReports}>
          <RefreshCw className="mr-1 h-4 w-4" /> Refresh
        </Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          { value: 'overview', label: 'Overview', icon: BarChart3 },
          { value: 'policies', label: 'Policies', icon: FileText },
          { value: 'pipeline', label: 'Pipeline', icon: TrendingUp },
          { value: 'commissions', label: 'Commissions', icon: DollarSign },
        ].map((tab) => (
          <Button key={tab.value} variant={activeReport === tab.value ? 'default' : 'outline'} size="sm"
            onClick={() => setActiveReport(tab.value)} className={activeReport === tab.value ? 'bg-[#1E40AF]' : ''}>
            <tab.icon className="mr-1 h-3.5 w-3.5" /> {tab.label}
          </Button>
        ))}
      </div>

      {activeReport === 'overview' && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Total Clients</p><p className="text-2xl font-bold">{data.totalClients}</p></CardContent></Card>
            <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Active Policies</p><p className="text-2xl font-bold text-emerald-600">{data.activePolicies}</p></CardContent></Card>
            <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Total Premium</p><p className="text-2xl font-bold">{formatCurrency(data.totalPremium)}</p></CardContent></Card>
            <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Win Rate</p><p className="text-2xl font-bold text-[#1E40AF]">{winRate}%</p></CardContent></Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">Key Metrics</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { label: 'Total Activities Logged', value: data.totalActivities },
                    { label: 'Total Claims Filed', value: data.totalClaims },
                    { label: 'Pipeline Value', value: formatCurrency(data.pipelineValue) },
                    { label: 'Open Deals', value: data.openDeals },
                    { label: 'Deals Won', value: data.wonDeals },
                    { label: 'Deals Lost', value: data.lostDeals },
                  ].map((metric) => (
                    <div key={metric.label} className="flex items-center justify-between border-b pb-2 last:border-0">
                      <span className="text-sm text-muted-foreground">{metric.label}</span>
                      <span className="font-semibold">{metric.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Commission Summary</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { label: 'Total Commissions Earned', value: formatCurrency(data.totalCommissions), color: '' },
                    { label: 'Paid Commissions', value: formatCurrency(data.paidCommissions), color: 'text-emerald-600' },
                    { label: 'Pending Commissions', value: formatCurrency(data.pendingCommissions), color: 'text-amber-600' },
                  ].map((metric) => (
                    <div key={metric.label} className="flex items-center justify-between border-b pb-2 last:border-0">
                      <span className="text-sm text-muted-foreground">{metric.label}</span>
                      <span className={`font-semibold ${metric.color}`}>{metric.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {activeReport === 'policies' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base">Policies by Type</CardTitle></CardHeader>
            <CardContent>
              {Object.keys(data.policyBreakdown).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No policy data</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(data.policyBreakdown).sort((a, b) => b[1] - a[1]).map(([type, count]) => {
                    const total = data.totalPolicies || 1;
                    const pct = ((count / total) * 100).toFixed(0);
                    return (
                      <div key={type}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm">{type}</span>
                          <span className="text-sm font-medium">{count} ({pct}%)</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted">
                          <div className="h-2 rounded-full bg-[#1E40AF]" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Policies by Carrier</CardTitle></CardHeader>
            <CardContent>
              {Object.keys(data.carrierBreakdown).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No carrier data</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(data.carrierBreakdown).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([carrier, count]) => {
                    const total = data.totalPolicies || 1;
                    const pct = ((count / total) * 100).toFixed(0);
                    return (
                      <div key={carrier}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm">{carrier}</span>
                          <span className="text-sm font-medium">{count} ({pct}%)</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted">
                          <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeReport === 'pipeline' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base">Pipeline Overview</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between border-b pb-2"><span className="text-sm text-muted-foreground">Total Deals</span><span className="font-semibold">{data.totalDeals}</span></div>
                <div className="flex justify-between border-b pb-2"><span className="text-sm text-muted-foreground">Open</span><span className="font-semibold text-[#1E40AF]">{data.openDeals}</span></div>
                <div className="flex justify-between border-b pb-2"><span className="text-sm text-muted-foreground">Won</span><span className="font-semibold text-emerald-600">{data.wonDeals}</span></div>
                <div className="flex justify-between border-b pb-2"><span className="text-sm text-muted-foreground">Lost</span><span className="font-semibold text-red-600">{data.lostDeals}</span></div>
                <div className="flex justify-between border-b pb-2"><span className="text-sm text-muted-foreground">Pipeline Value</span><span className="font-semibold">{formatCurrency(data.pipelineValue)}</span></div>
                <div className="flex justify-between"><span className="text-sm text-muted-foreground">Win Rate</span><span className="font-semibold">{winRate}%</span></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Deals by Stage</CardTitle></CardHeader>
            <CardContent>
              {Object.keys(data.dealStageBreakdown).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No deal data</p>
              ) : (
                <div className="space-y-3">
                  {['New Lead', 'Contacted', 'Quote Sent', 'Negotiating', 'Closed Won', 'Closed Lost'].map((stage) => {
                    const count = data.dealStageBreakdown[stage] || 0;
                    if (count === 0) return null;
                    const total = data.totalDeals || 1;
                    const pct = ((count / total) * 100).toFixed(0);
                    const colors: Record<string, string> = {
                      'New Lead': 'bg-blue-500', 'Contacted': 'bg-cyan-500', 'Quote Sent': 'bg-amber-500',
                      'Negotiating': 'bg-orange-500', 'Closed Won': 'bg-emerald-500', 'Closed Lost': 'bg-red-500',
                    };
                    return (
                      <div key={stage}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm">{stage}</span>
                          <span className="text-sm font-medium">{count}</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted">
                          <div className={`h-2 rounded-full ${colors[stage]}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeReport === 'commissions' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base">Commission Overview</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between border-b pb-2"><span className="text-sm text-muted-foreground">Total Earned</span><span className="font-semibold">{formatCurrency(data.totalCommissions)}</span></div>
                <div className="flex justify-between border-b pb-2"><span className="text-sm text-muted-foreground">Paid</span><span className="font-semibold text-emerald-600">{formatCurrency(data.paidCommissions)}</span></div>
                <div className="flex justify-between border-b pb-2"><span className="text-sm text-muted-foreground">Pending</span><span className="font-semibold text-amber-600">{formatCurrency(data.pendingCommissions)}</span></div>
                <div className="flex justify-between"><span className="text-sm text-muted-foreground">Total Premium Book</span><span className="font-semibold">{formatCurrency(data.totalPremium)}</span></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Quick Stats</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between border-b pb-2"><span className="text-sm text-muted-foreground">Avg Commission per Policy</span><span className="font-semibold">{data.totalPolicies > 0 ? formatCurrency(data.totalCommissions / data.totalPolicies) : '$0'}</span></div>
                <div className="flex justify-between border-b pb-2"><span className="text-sm text-muted-foreground">Avg Premium per Policy</span><span className="font-semibold">{data.activePolicies > 0 ? formatCurrency(data.totalPremium / data.activePolicies) : '$0'}</span></div>
                <div className="flex justify-between"><span className="text-sm text-muted-foreground">Policies per Client</span><span className="font-semibold">{data.totalClients > 0 ? (data.totalPolicies / data.totalClients).toFixed(1) : '0'}</span></div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
