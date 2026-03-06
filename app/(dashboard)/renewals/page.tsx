'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDate, daysUntil, formatPhone } from '@/lib/format';
import type { Policy, Client } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getInitials } from '@/lib/format';
import { toast } from 'sonner';
import { Phone, Mail, CalendarDays, TriangleAlert as AlertTriangle, Clock, CircleCheck as CheckCircle2, Circle as XCircle } from 'lucide-react';

interface RenewalPolicy extends Policy {
  client: Client;
}

export default function RenewalsPage() {
  const [policies, setPolicies] = useState<RenewalPolicy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadRenewals(); }, []);

  async function loadRenewals() {
    const today = new Date().toISOString().split('T')[0];
    const future90 = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const { data } = await supabase
      .from('policies')
      .select('*, client:clients(id, first_name, last_name, email, phone)')
      .eq('status', 'Active')
      .gte('expiration_date', today)
      .lte('expiration_date', future90)
      .order('expiration_date', { ascending: true });

    setPolicies((data as any) || []);
    setLoading(false);
  }

  const groups = [
    { label: 'Urgent (Next 7 Days)', min: 0, max: 7, color: 'border-l-red-500', bg: 'bg-red-50', icon: AlertTriangle, iconColor: 'text-red-600' },
    { label: 'This Month (8-30 Days)', min: 8, max: 30, color: 'border-l-amber-500', bg: 'bg-amber-50', icon: Clock, iconColor: 'text-amber-600' },
    { label: 'Next Month (31-60 Days)', min: 31, max: 60, color: 'border-l-blue-500', bg: 'bg-blue-50', icon: CalendarDays, iconColor: 'text-blue-600' },
    { label: 'Future (61-90 Days)', min: 61, max: 90, color: 'border-l-emerald-500', bg: 'bg-emerald-50', icon: CheckCircle2, iconColor: 'text-emerald-600' },
  ];

  const totalPremiumAtRisk = policies.reduce((sum, p) => sum + (p.annual_premium || 0), 0);

  if (loading) {
    return <div className="space-y-6"><div className="h-8 w-48 animate-pulse rounded bg-muted" /><div className="h-96 animate-pulse rounded-xl bg-muted" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Renewals</h1>
        <p className="text-sm text-muted-foreground">{policies.length} policies expiring in next 90 days</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Renewals</p>
            <p className="text-2xl font-bold">{policies.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Premium at Risk</p>
            <p className="text-2xl font-bold text-amber-600">{formatCurrency(totalPremiumAtRisk)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Urgent (7 days)</p>
            <p className="text-2xl font-bold text-red-600">{policies.filter((p) => daysUntil(p.expiration_date) <= 7).length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">This Month</p>
            <p className="text-2xl font-bold">{policies.filter((p) => daysUntil(p.expiration_date) <= 30).length}</p>
          </CardContent>
        </Card>
      </div>

      {groups.map((group) => {
        const groupPolicies = policies.filter((p) => {
          const days = daysUntil(p.expiration_date);
          return days >= group.min && days <= group.max;
        });
        if (groupPolicies.length === 0) return null;
        return (
          <div key={group.label}>
            <div className={`flex items-center gap-2 mb-3 rounded-lg ${group.bg} p-3`}>
              <group.icon className={`h-5 w-5 ${group.iconColor}`} />
              <h2 className="font-semibold">{group.label}</h2>
              <Badge variant="secondary" className="ml-auto">{groupPolicies.length}</Badge>
            </div>
            <div className="space-y-2">
              {groupPolicies.map((policy) => {
                const days = daysUntil(policy.expiration_date);
                return (
                  <Card key={policy.id} className={`border-l-4 ${group.color}`}>
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row items-start gap-3">
                        <Avatar className="h-10 w-10 shrink-0">
                          <AvatarFallback className="bg-[#1E40AF] text-white text-xs">
                            {getInitials(`${(policy.client as any)?.first_name} ${(policy.client as any)?.last_name}`)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <Link href={`/clients/${policy.client_id}`} className="font-semibold text-[#1E40AF] hover:underline">
                            {(policy.client as any)?.first_name} {(policy.client as any)?.last_name}
                          </Link>
                          <p className="text-sm text-muted-foreground">
                            {policy.policy_type} - {policy.carrier} {policy.policy_number && `(#${policy.policy_number})`}
                          </p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-sm font-medium">{formatCurrency(policy.annual_premium)}/yr</span>
                            <span className={`text-sm font-medium ${days <= 7 ? 'text-red-600' : days <= 30 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                              Expires {formatDate(policy.expiration_date)} ({days} days)
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          {(policy.client as any)?.phone && (
                            <Button size="sm" variant="outline" asChild>
                              <a href={`tel:${(policy.client as any).phone}`}><Phone className="h-3.5 w-3.5" /></a>
                            </Button>
                          )}
                          <Button size="sm" variant="outline" asChild>
                            <a href={`mailto:${(policy.client as any)?.email}`}><Mail className="h-3.5 w-3.5" /></a>
                          </Button>
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/clients/${policy.client_id}`}>View</Link>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}

      {policies.length === 0 && (
        <Card><CardContent className="py-16 text-center"><CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-2" /><p className="text-lg font-medium">No upcoming renewals</p><p className="text-sm text-muted-foreground">All policies are up to date for the next 90 days</p></CardContent></Card>
      )}
    </div>
  );
}
