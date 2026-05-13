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
import { Input } from '@/components/ui/input';
import {
  Target,
  DollarSign,
  TrendingUp,
  Zap,
  RefreshCw,
  Search,
  Chrome as Home,
  Car,
  Shield,
  Umbrella,
  Briefcase,
  Heart,
  CircleCheck as CheckCircle2,
  Filter,
} from 'lucide-react';
import { toast } from 'sonner';

interface CrossSellOpp extends Omit<CrossSellOpportunity, 'client'> {
  client: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
}

const typeIcons: Record<string, typeof Home> = {
  auto_home_bundle: Home,
  home_auto_bundle: Car,
  home_umbrella: Umbrella,
  auto_umbrella: Umbrella,
  personal_umbrella: Umbrella,
  flood: Shield,
  earthquake: Shield,
  business_earthquake: Shield,
  business: Briefcase,
  renters: Home,
  life: Heart,
  cyber_liability: Zap,
  commercial_auto: Car,
};

const typeLabels: Record<string, string> = {
  auto_home_bundle: 'Auto + Home Bundle',
  home_auto_bundle: 'Home + Auto Bundle',
  home_umbrella: 'Home + Umbrella',
  auto_umbrella: 'Auto + Umbrella',
  personal_umbrella: 'Personal Umbrella',
  flood: 'Flood Insurance',
  earthquake: 'Earthquake Insurance',
  business_earthquake: 'Business Earthquake',
  business: 'Business Insurance',
  renters: 'Renters Insurance',
  life: 'Life Insurance',
  cyber_liability: 'Cyber Liability',
  commercial_auto: 'Commercial Auto',
};

const priorityStyles: Record<string, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-[#B8962E]/10 text-[#B8962E]',
};

const statusStyles: Record<string, string> = {
  open: 'bg-[#2C3E6B]/10 text-[#2C3E6B]',
  contacted: 'bg-amber-100 text-amber-700',
  quoted: 'bg-cyan-100 text-cyan-700',
  sold: 'bg-[#B8962E]/10 text-[#B8962E]',
  declined: 'bg-[#8B2D3B]/10 text-[#8B2D3B]',
};

export default function CrossSellPage() {
  const [opportunities, setOpportunities] = useState<CrossSellOpp[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [stats, setStats] = useState({
    totalOpen: 0,
    totalPotential: 0,
    closedThisMonth: 0,
    closedPremium: 0,
  });

  const loadData = useCallback(async () => {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [oppsRes, closedRes] = await Promise.all([
      supabase
        .from('cross_sell_opportunities')
        .select('*, client:clients(id, first_name, last_name, email)')
        .order('estimated_value', { ascending: false }),
      supabase
        .from('cross_sell_opportunities')
        .select('estimated_value')
        .eq('status', 'sold')
        .gte('closed_at', startOfMonth.toISOString()),
    ]);

    const allOpps = (oppsRes.data as any) || [];
    const closed = closedRes.data || [];

    const openOpps = allOpps.filter((o: any) => ['open', 'contacted', 'quoted'].includes(o.status));

    setStats({
      totalOpen: openOpps.length,
      totalPotential: openOpps.reduce((sum: number, o: any) => sum + (o.estimated_value || 0), 0),
      closedThisMonth: closed.length,
      closedPremium: closed.reduce((sum: number, o: any) => sum + (o.estimated_value || 0), 0),
    });

    setOpportunities(allOpps);
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

  async function updateStatus(oppId: string, newStatus: string) {
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

  const filtered = opportunities.filter((opp) => {
    if (filterType !== 'all' && opp.opportunity_type !== filterType) return false;
    if (filterStatus !== 'all' && opp.status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const name = `${opp.client?.first_name} ${opp.client?.last_name}`.toLowerCase();
      const coverage = (opp.recommended_coverage || '').toLowerCase();
      if (!name.includes(q) && !coverage.includes(q)) return false;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
        <div className="h-96 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cross-Sell Opportunities</h1>
          <p className="text-sm text-muted-foreground">
            Identify and track coverage gaps for existing clients
          </p>
        </div>
        <Button
          onClick={runAnalysis}
          disabled={analyzing}
          className="bg-gradient-to-r from-[#2C3E6B] to-[#1B2A4A] hover:from-[#1B2A4A] hover:to-[#2C3E6B] text-white border border-[#B8962E]/20"
        >
          {analyzing ? (
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Zap className="mr-2 h-4 w-4" />
          )}
          {analyzing ? 'Scanning Clients...' : 'Run Analysis'}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-t-2 border-t-[#B8962E]/40">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-[#2C3E6B]/5 p-3">
                <Target className="h-5 w-5 text-[#2C3E6B]" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Open</p>
                <p className="text-xl font-bold">{stats.totalOpen}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-t-2 border-t-[#8B2D3B]/40">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-[#B8962E]/5 p-3">
                <DollarSign className="h-5 w-5 text-[#B8962E]" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Potential</p>
                <p className="text-xl font-bold">{formatCurrency(stats.totalPotential)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-t-2 border-t-[#B8962E]/40">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-[#B8962E]/10 p-3">
                <CheckCircle2 className="h-5 w-5 text-[#B8962E]" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Closed This Month</p>
                <p className="text-xl font-bold">{stats.closedThisMonth}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-t-2 border-t-[#8B2D3B]/40">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-[#8B2D3B]/5 p-3">
                <TrendingUp className="h-5 w-5 text-[#8B2D3B]" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sold Premium</p>
                <p className="text-xl font-bold">{formatCurrency(stats.closedPremium)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              All Opportunities
              <Badge variant="secondary" className="ml-1 text-[10px]">{filtered.length}</Badge>
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search client or coverage..."
                  className="pl-8 h-8 w-[180px] text-xs"
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="h-8 w-[150px] text-xs">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Types</SelectItem>
                  {Object.entries(typeLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key} className="text-xs">{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-8 w-[120px] text-xs">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Statuses</SelectItem>
                  <SelectItem value="open" className="text-xs">Open</SelectItem>
                  <SelectItem value="contacted" className="text-xs">Contacted</SelectItem>
                  <SelectItem value="quoted" className="text-xs">Quoted</SelectItem>
                  <SelectItem value="sold" className="text-xs">Sold</SelectItem>
                  <SelectItem value="declined" className="text-xs">Declined</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <TrendingUp className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium">No opportunities found</p>
              <p className="text-xs text-muted-foreground mt-1">
                {opportunities.length === 0
                  ? 'Run an analysis to identify cross-sell opportunities'
                  : 'Try adjusting your filters'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((opp) => {
                const Icon = typeIcons[opp.opportunity_type] || Shield;
                const client = opp.client;
                if (!client) return null;

                return (
                  <div
                    key={opp.id}
                    className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/30"
                  >
                    <div className="rounded-lg bg-[#B8962E]/10 p-2.5 shrink-0">
                      <Icon className="h-4 w-4 text-[#B8962E]" />
                    </div>
                    <Link href={`/clients/${opp.client_id}`} className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium">
                          {client.first_name} {client.last_name}
                        </p>
                        <Badge className={`text-[10px] ${priorityStyles[opp.priority]}`}>
                          {opp.priority}
                        </Badge>
                        <Badge className={`text-[10px] ${statusStyles[opp.status]}`}>
                          {opp.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {opp.recommended_coverage} &mdash; {opp.pitch_message}
                      </p>
                    </Link>
                    <div className="flex items-center gap-3 shrink-0">
                      <p className="text-sm font-semibold text-[#B8962E] hidden sm:block">
                        +{formatCurrency(opp.estimated_value)}/yr
                      </p>
                      <div className="flex gap-1">
                        {opp.status === 'open' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[10px] px-2"
                            onClick={() => updateStatus(opp.id, 'contacted')}
                          >
                            Mark Contacted
                          </Button>
                        )}
                        {opp.status === 'contacted' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[10px] px-2"
                            onClick={() => updateStatus(opp.id, 'quoted')}
                          >
                            Mark Quoted
                          </Button>
                        )}
                        {(opp.status === 'open' || opp.status === 'contacted' || opp.status === 'quoted') && (
                          <>
                            <Button
                              size="sm"
                              className="h-7 text-[10px] px-2 bg-gradient-to-r from-[#2C3E6B] to-[#1B2A4A] hover:from-[#1B2A4A] hover:to-[#2C3E6B] text-white border border-[#B8962E]/20"
                              onClick={() => updateStatus(opp.id, 'sold')}
                            >
                              Sold
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-[10px] px-2 text-muted-foreground"
                              onClick={() => updateStatus(opp.id, 'declined')}
                            >
                              Dismiss
                            </Button>
                          </>
                        )}
                      </div>
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
