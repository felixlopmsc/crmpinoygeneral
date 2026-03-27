'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, DollarSign, Chrome as Home, Car, Shield, Umbrella, Briefcase, Heart, Zap, RefreshCw, TrendingUp, Target } from 'lucide-react';
import { toast } from 'sonner';

interface CrossSellOpp {
  id: string;
  client_id: string;
  opportunity_type: string;
  recommended_coverage: string;
  estimated_value: number;
  priority: string;
  pitch_message: string;
  status: string;
  client: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
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

const priorityStyles: Record<string, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-emerald-100 text-emerald-700',
};

export function CrossSellWidget() {
  const [opportunities, setOpportunities] = useState<CrossSellOpp[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    loadOpportunities();
  }, []);

  async function loadOpportunities() {
    const [topRes, countRes] = await Promise.all([
      supabase
        .from('cross_sell_opportunities')
        .select('*, client:clients(id, first_name, last_name, email)')
        .eq('status', 'open')
        .order('estimated_value', { ascending: false })
        .limit(5),
      supabase
        .from('cross_sell_opportunities')
        .select('estimated_value')
        .eq('status', 'open'),
    ]);

    setOpportunities((topRes.data as any) || []);
    const allOpen = countRes.data || [];
    setTotalCount(allOpen.length);
    setTotalValue(allOpen.reduce((sum: number, o: any) => sum + (o.estimated_value || 0), 0));
    setLoading(false);
  }

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
        loadOpportunities();
      } else {
        toast.error(result.error || 'Analysis failed');
      }
    } catch {
      toast.error('Failed to connect to analysis service');
    } finally {
      setAnalyzing(false);
    }
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[#10B981]" />
            Cross-Sell Opportunities
          </CardTitle>
          {totalCount > 0 && (
            <div className="flex items-center gap-3 mt-1">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Target className="h-3 w-3" />
                {totalCount} open
              </span>
              <span className="flex items-center gap-1 text-xs font-medium text-[#10B981]">
                <DollarSign className="h-3 w-3" />
                {formatCurrency(totalValue)} potential
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
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
            <Link href="/clients">
              View All <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {opportunities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <TrendingUp className="h-10 w-10 text-muted-foreground/40 mb-2" />
            <p className="text-sm font-medium">No opportunities found</p>
            <p className="text-xs text-muted-foreground">Run a scan to identify cross-sell opportunities</p>
            <Button
              size="sm"
              className="mt-3 bg-[#1E40AF] hover:bg-[#1E3A8A] text-white"
              onClick={runAnalysis}
              disabled={analyzing}
            >
              <Zap className="mr-1 h-3 w-3" /> {analyzing ? 'Scanning...' : 'Run Scan'}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {opportunities.map((opp) => {
              const Icon = typeIcons[opp.opportunity_type] || Shield;
              const client = opp.client;
              if (!client) return null;

              return (
                <Link key={opp.id} href={`/clients/${opp.client_id}`}>
                  <div className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50">
                    <div className="rounded-lg bg-[#10B981]/10 p-2 shrink-0">
                      <Icon className="h-4 w-4 text-[#10B981]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">
                          {client.first_name} {client.last_name}
                        </p>
                        <Badge className={`text-[10px] ${priorityStyles[opp.priority]}`}>
                          {opp.priority}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {opp.recommended_coverage}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-medium text-[#10B981]">
                        +{formatCurrency(opp.estimated_value)}/yr
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
