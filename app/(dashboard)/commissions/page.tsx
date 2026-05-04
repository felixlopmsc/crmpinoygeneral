'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatCurrencyDecimal, formatDate } from '@/lib/format';
import type { Commission, Client, Policy } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, Clock, CircleCheck as CheckCircle2, TriangleAlert as AlertTriangle, Download } from 'lucide-react';

const statusColors: Record<string, string> = {
  Pending: 'bg-amber-100 text-amber-700',
  Paid: 'bg-emerald-100 text-emerald-700',
  Disputed: 'bg-red-100 text-red-700',
};

export default function CommissionsPage() {
  const [commissions, setCommissions] = useState<(Commission & { client: Client; policy: Policy })[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  const loadCommissions = useCallback(async () => {
    let query = supabase
      .from('commissions')
      .select('*, client:clients(id, first_name, last_name), policy:policies(id, policy_number, policy_type, carrier, annual_premium)')
      .order('commission_date', { ascending: false });

    if (statusFilter !== 'all') query = query.eq('payment_status', statusFilter);

    const { data } = await query.limit(100);
    setCommissions((data as any) || []);
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { loadCommissions(); }, [loadCommissions]);

  const pending = commissions.filter((c) => c.payment_status === 'Pending');
  const paid = commissions.filter((c) => c.payment_status === 'Paid');
  const now = new Date();
  const thisMonth = paid.filter((c) => {
    const d = new Date(c.commission_date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const thisYear = paid.filter((c) => new Date(c.commission_date).getFullYear() === now.getFullYear());

  const pendingTotal = pending.reduce((sum, c) => sum + (c.commission_amount || 0), 0);
  const paidMTD = thisMonth.reduce((sum, c) => sum + (c.commission_amount || 0), 0);
  const paidYTD = thisYear.reduce((sum, c) => sum + (c.commission_amount || 0), 0);

  const handleExport = () => {
    const rows = [['Client', 'Policy #', 'Carrier', 'Type', 'Premium', 'Rate %', 'Commission', 'Date', 'Status']];
    commissions.forEach((c) => {
      rows.push([
        `${(c.client as any)?.first_name} ${(c.client as any)?.last_name}`,
        (c.policy as any)?.policy_number || '',
        c.carrier,
        c.policy_type,
        String((c.policy as any)?.annual_premium || 0),
        '',
        String(c.commission_amount),
        c.commission_date,
        c.payment_status,
      ]);
    });
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `commissions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Commissions</h1>
          <p className="text-sm text-muted-foreground">{commissions.length} commission records</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="mr-1 h-4 w-4" /> Export CSV
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-xl bg-amber-50 p-3"><Clock className="h-5 w-5 text-amber-600" /></div>
            <div><p className="text-sm text-muted-foreground">Pending</p><p className="text-xl font-bold text-amber-600">{formatCurrency(pendingTotal)}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-xl bg-emerald-50 p-3"><CheckCircle2 className="h-5 w-5 text-emerald-600" /></div>
            <div><p className="text-sm text-muted-foreground">Paid MTD</p><p className="text-xl font-bold text-emerald-600">{formatCurrency(paidMTD)}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-xl bg-blue-50 p-3"><DollarSign className="h-5 w-5 text-[#1E40AF]" /></div>
            <div><p className="text-sm text-muted-foreground">Paid YTD</p><p className="text-xl font-bold text-[#1E40AF]">{formatCurrency(paidYTD)}</p></div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Paid">Paid</SelectItem>
            <SelectItem value="Disputed">Disputed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-14 animate-pulse rounded bg-muted" />)}</div>
      ) : commissions.length === 0 ? (
        <Card><CardContent className="py-16 text-center"><DollarSign className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" /><p className="text-lg font-medium">No commissions found</p><p className="text-sm text-muted-foreground">Commissions are created when policies are added</p></CardContent></Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Carrier</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Premium</TableHead>
                  <TableHead className="text-right">Commission</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commissions.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link href={`/clients/${c.client_id}`} className="font-medium text-[#1E40AF] hover:underline">
                        {(c.client as any)?.first_name} {(c.client as any)?.last_name}
                      </Link>
                    </TableCell>
                    <TableCell>{c.carrier}</TableCell>
                    <TableCell>{c.policy_type}</TableCell>
                    <TableCell className="text-right">{formatCurrency((c.policy as any)?.annual_premium || 0)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrencyDecimal(c.commission_amount)}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(c.commission_date)}</TableCell>
                    <TableCell><Badge className={`${statusColors[c.payment_status]} text-[10px]`}>{c.payment_status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}
