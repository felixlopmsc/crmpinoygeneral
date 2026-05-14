'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/format';
import type { CrossSellOpportunity } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, DollarSign, Chrome as Home, Car, Shield, Umbrella, Briefcase, Heart, Zap, RefreshCw, TrendingUp, Target, ChartBar as BarChart3, CircleCheck as CheckCircle2, Circle as XCircle, Phone, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface CrossSellOpp extends Omit<CrossSellOpportunity, 'client'> {
  client: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface KPIStats {
  totalOpen: number;
  totalPotential: number;
  soldThisMonth: number;
  soldPremium: number;
  declinedThisMonth: number;
  conversionRate: number;
  byType: Record<string, { count: number; value: number }>;
}

const typeIcons: Record<string, typeof Home> = {
  auto_home_bundle: Home,
  home_umbrella: Umbrella,
  auto_umbrella: Umbrella,
  flood: Shield,
  earthquake: Shield,
  business: Briefcase,
  renters: Home,
  life: Heart,
  cyber_liability: Zap,
  commercial_auto: Car,
};

const typeLabels: Record<string, string> = {
  auto_home_bundle: 'Auto + Home',
  home_umbrella: 'Home + Umbrella',
  auto_umbrella: 'Auto + Umbrella',
  flood: 'Flood',
  earthquake: 'Earthquake',
  business: 'Business',
  renters: 'Renters',
  life: 'Life',
  cyber_liability: 'Cyber Liability',
  commercial_auto: 'Commercial Auto',
};

const priorityStyles: Record<string, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-emerald-100 text-emerald-700',
};

const statusStyles: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700',
  contacted: 'bg-amber-100 text-amber-700',
  quoted: 'bg-cyan-100 text-cyan-700',
  sold: 'bg-emerald-100 text-emerald-700',
  declined: 'bg-red-100 text-red-700',
};

export function CrossSellWidget() {
  const [opportunities, setOpportunities] = useState<CrossSellOpp[]>([]);
  const [kpi, setKpi] = useState<KPIStats>({
    totalOpen: 0, totalPotential: 0, soldThisMonth: 0,
    soldPremium: 0, declinedThisMonth: 0, conversionRate: 0, byType: {},
  });
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [showKPIs, setShowKPIs] = useState(false);

  const loadData = useCallback(async () => {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [topRes, allOpenRes, soldRes, declinedRes, allClosedRes] = await Promise.all([
      supabase
        .from('cross_sell_opportunities')
        .select('*, client:clients(id, first_name, last_name, email)')
        .in('status', ['open', 'contacted', 'quoted'])
        .order('estimated_value', { ascending: false })
        .limit(8),
      supabase
        .from('cross_sell_opportunities')
        .select('estimated_value, opportunity_type')
        .in('status', ['open', 'contacted', 'quoted']),
      supabase
        .from('cross_sell_opportunities')
        .select('estimated_value, opportunity_type')
        .eq('status', 'sold')
        .gte('closed_at', startOfMonth.toISOString()),
      supabase
        .from('cross_sell_opportunities')
        .select('id')
        .eq('status', 'declined')
        .gte('closed_at', startOfMonth.toISOString()),
      supabase
        .from('cross_sell_opportunities')
        .select('status')
        .in('status', ['sold', 'declined']),
    ]);

    setOpportunities((topRes.data as any) || []);

    const allOpen = allOpenRes.data || [];
    const sold = soldRes.data || [];
    const declined = declinedRes.data || [];
    const allClosed = allClosedRes.data || [];

    const byType: Record<string, { count: number; value: number }> = {};
    allOpen.forEach((o: any) => {
      if (!byType[o.opportunity_type]) byType[o.opportunity_type] = { count: 0, value: 0 };
      byType[o.opportunity_type].count++;
      byType[o.opportunity_type].value += o.estimated_value || 0;
    });

    const totalClosed = allClosed.length;
    const totalSold = allClosed.filter((o: any) => o.status === 'sold').length;

    setKpi({
      totalOpen: allOpen.length,
      totalPotential: allOpen.reduce((sum: number, o: any) => sum + (o.estimated_value || 0), 0),
      soldThisMonth: sold.length,
      soldPremium: sold.reduce((sum: number, o: any) => sum + (o.estimated_value || 0), 0),
      declinedThisMonth: declined.length,
      conversionRate: totalClosed > 0 ? Math.round((totalSold / totalClosed) * 100) : 0,
      byType,
    });

    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function runAnalysis() {
    setAnalyzing(true);
    try {
      const apiUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/analyze-cross-sell`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      });
      const result = await response.json();
      if (response.ok) {
        toast.success(`Analysis complete: ${result.clients_analyzed} clients analyzed, ${result.opportunities_created} new opportunities found`);
        loadData();
      } else {
        toast.error(result.error || 'Analysis failed');
      }
    } catch {
      toast.error('Failed to connect to analysis service');
    } finally {
      setAnalyzing(false);
    }
  }

  async function updateOppStatus(oppId: string, newStatus: string) {
    const updates: Record<string, any> = { status: newStatus };
    if (newStatus === 'contacted') updates.contacted_at = new Date().toISOString();
    if (newStatus === 'quoted') updates.quoted_at = new Date().toISOString();
    if (newStatus === 'sold' || newStatus === 'declined') updates.closed_at = new Date().toISOString();

    const { error } = await supabase
      .from('cross_sell_opportunities')
      .update(updates)
      .eq('id', oppId);

    if (error) {
      toast.error('Failed to update status');
      return;
    }
    toast.success(`Status updated to ${newStatus}`);
    loadData();
  }

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="h-5 w-48 animate-pulse rounded bg-muted" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const sortedTypes = Object.entries(kpi.byType).sort((a, b) => b[1].value - a[1].value);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[#B8962E]" />
              Cross-Sell Opportunities
            </CardTitle>
            {kpi.totalOpen > 0 && (
              <div className="flex items-center gap-3 mt-1">
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Target className="h-3 w-3" />
                  {kpi.totalOpen} open
                </span>
                <span className="flex items-center gap-1 text-xs font-medium text-[#B8962E]">
                  <DollarSign className="h-3 w-3" />
                  {formatCurrency(kpi.totalPotential)} potential
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={showKPIs ? 'default' : 'outline'}
              onClick={() => setShowKPIs(!showKPIs)}
              className={`text-xs ${showKPIs ? 'bg-gradient-to-r from-[#2C3E6B] to-[#1B2A4A] hover:from-[#1B2A4A] hover:to-[#2C3E6B] text-white border border-[#B8962E]/20' : ''}`}
            >
              <BarChart3 className="mr-1 h-3 w-3" />
              KPIs
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={runAnalysis}
              disabled={analyzing}
              className="text-xs"
            >
              {analyzing ? (
                <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Zap className="mr-1 h-3 w-3" />
              )}
              {analyzing ? 'Analyzing...' : 'Scan'}
            </Button>
            <Button asChild variant="ghost" size="sm" className="text-xs">
              <Link href="/clients?filter=crossSell">
                View All <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </div>
        </CardHeader>

        {showKPIs && (
          <CardContent className="pt-0 pb-4 border-b">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="rounded-lg border p-3 text-center">
                <p className="text-lg font-bold text-[#B8962E]">{formatCurrency(kpi.soldPremium)}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Sold This Month</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-lg font-bold text-[#2C3E6B]">{kpi.soldThisMonth}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Policies Sold</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-lg font-bold text-amber-600">{kpi.conversionRate}%</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Conversion Rate</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-lg font-bold text-red-500">{kpi.declinedThisMonth}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Declined This Month</p>
              </div>
            </div>
            {sortedTypes.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">By Coverage Type</p>
                {sortedTypes.slice(0, 5).map(([type, data]) => {
                  const Icon = typeIcons[type] || Shield;
                  const maxVal = sortedTypes[0][1].value;
                  const pct = maxVal > 0 ? (data.value / maxVal) * 100 : 0;
                  return (
                    <div key={type} className="flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-xs w-28 truncate">{typeLabels[type] || type}</span>
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#B8962E] transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium w-12 text-right">{data.count}</span>
                      <span className="text-xs text-muted-foreground w-16 text-right">{formatCurrency(data.value)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        )}

        <CardContent className={showKPIs ? 'pt-4' : ''}>
          {opportunities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <TrendingUp className="h-10 w-10 text-muted-foreground/40 mb-2" />
              <p className="text-sm font-medium">No opportunities found</p>
              <p className="text-xs text-muted-foreground">Run a scan to identify cross-sell opportunities</p>
              <Button
                size="sm"
                className="mt-3 bg-gradient-to-r from-[#2C3E6B] to-[#1B2A4A] hover:from-[#1B2A4A] hover:to-[#2C3E6B] text-white border border-[#B8962E]/20"
                onClick={runAnalysis}
                disabled={analyzing}
              >
                <Zap className="mr-1 h-3 w-3" /> {analyzing ? 'Scanning...' : 'Run Scan'}
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {opportunities.map((opp) => {
                const Icon = typeIcons[opp.opportunity_type] || Shield;
                const client = opp.client;
                if (!client) return null;

                return (
                  <div key={opp.id} className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/30">
                    <Link href={`/clients/${opp.client_id}`} className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="rounded-lg bg-[#B8962E]/10 p-2 shrink-0">
                        <Icon className="h-4 w-4 text-[#B8962E]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">
                            {client.first_name} {client.last_name}
                          </p>
                          <Badge className={`text-[10px] ${priorityStyles[opp.priority]}`}>
                            {opp.priority}
                          </Badge>
                          <Badge className={`text-[10px] ${statusStyles[opp.status]}`}>
                            {opp.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {opp.recommended_coverage}
                        </p>
                      </div>
                    </Link>
                    <div className="flex items-center gap-2 shrink-0">
                      <p className="text-xs font-medium text-[#B8962E]">
                        +{formatCurrency(opp.estimated_value)}/yr
                      </p>
                      <Select
                        value={opp.status}
                        onValueChange={(val) => updateOppStatus(opp.id, val)}
                      >
                        <SelectTrigger className="h-7 w-[100px] text-[10px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open" className="text-xs">Open</SelectItem>
                          <SelectItem value="contacted" className="text-xs">Contacted</SelectItem>
                          <SelectItem value="quoted" className="text-xs">Quoted</SelectItem>
                          <SelectItem value="sold" className="text-xs">Sold</SelectItem>
                          <SelectItem value="declined" className="text-xs">Declined</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
