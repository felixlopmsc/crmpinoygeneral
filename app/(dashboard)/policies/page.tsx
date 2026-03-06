'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDate, daysUntil } from '@/lib/format';
import type { Policy, Client } from '@/lib/types';
import { POLICY_TYPES, CARRIERS } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Filter, Car, Chrome as Home, Briefcase, Heart, Umbrella, Building2 } from 'lucide-react';

const policyStatusColors: Record<string, string> = {
  Active: 'bg-emerald-100 text-emerald-700',
  Pending: 'bg-amber-100 text-amber-700',
  Cancelled: 'bg-red-100 text-red-700',
  Expired: 'bg-gray-100 text-gray-700',
};

const typeIcons: Record<string, any> = {
  Auto: Car,
  Home: Home,
  Renters: Building2,
  Business: Briefcase,
  Life: Heart,
  Umbrella: Umbrella,
};

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<(Policy & { client: Client })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const loadPolicies = useCallback(async () => {
    let query = supabase
      .from('policies')
      .select('*, client:clients(id, first_name, last_name, email)')
      .order('expiration_date', { ascending: true });

    if (typeFilter !== 'all') query = query.eq('policy_type', typeFilter);
    if (statusFilter !== 'all') query = query.eq('status', statusFilter);

    const { data } = await query.limit(100);
    let filtered = (data as any) || [];
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter((p: any) =>
        p.policy_number?.toLowerCase().includes(q) ||
        p.client?.first_name?.toLowerCase().includes(q) ||
        p.client?.last_name?.toLowerCase().includes(q) ||
        p.carrier?.toLowerCase().includes(q)
      );
    }
    setPolicies(filtered);
    setLoading(false);
  }, [search, typeFilter, statusFilter]);

  useEffect(() => { loadPolicies(); }, [loadPolicies]);

  const totalPremium = policies.reduce((sum, p) => sum + (p.annual_premium || 0), 0);
  const activePolicies = policies.filter((p) => p.status === 'Active').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Policies</h1>
        <p className="text-sm text-muted-foreground">
          {activePolicies} active policies - {formatCurrency(totalPremium)} total premium
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search policies..." className="pl-9" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {POLICY_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Cancelled">Cancelled</SelectItem>
            <SelectItem value="Expired">Expired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-14 animate-pulse rounded bg-muted" />)}</div>
      ) : policies.length === 0 ? (
        <Card><CardContent className="py-16 text-center"><p className="text-lg font-medium">No policies found</p><p className="text-sm text-muted-foreground mt-1">Adjust your filters or add policies from client profiles</p></CardContent></Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Carrier</TableHead>
                  <TableHead>Policy #</TableHead>
                  <TableHead>Expiration</TableHead>
                  <TableHead className="text-right">Premium</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {policies.map((policy) => {
                  const days = daysUntil(policy.expiration_date);
                  const Icon = typeIcons[policy.policy_type] || Briefcase;
                  return (
                    <TableRow key={policy.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell>
                        <Link href={`/clients/${policy.client_id}`} className="font-medium text-[#1E40AF] hover:underline">
                          {(policy.client as any)?.first_name} {(policy.client as any)?.last_name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                          {policy.policy_type}
                        </div>
                      </TableCell>
                      <TableCell>{policy.carrier}</TableCell>
                      <TableCell className="text-muted-foreground">{policy.policy_number || '-'}</TableCell>
                      <TableCell>
                        <span className={days <= 7 && policy.status === 'Active' ? 'text-red-600 font-medium' : days <= 30 && policy.status === 'Active' ? 'text-amber-600' : ''}>
                          {formatDate(policy.expiration_date)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(policy.annual_premium)}</TableCell>
                      <TableCell><Badge className={`${policyStatusColors[policy.status]} text-[10px]`}>{policy.status}</Badge></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}
