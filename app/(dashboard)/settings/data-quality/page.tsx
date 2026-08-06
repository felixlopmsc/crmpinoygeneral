'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { isStaffUser } from '@/lib/is-staff';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Building2, UserCog, ArrowRight, ShieldAlert } from 'lucide-react';
import { DuplicatesTool } from '@/components/data-quality/duplicates-tool';
import { NamesTool } from '@/components/data-quality/names-tool';
import { CarriersTool } from '@/components/data-quality/carriers-tool';
import { AuditLogPanel } from '@/components/data-quality/audit-log-panel';

type Tool = 'duplicates' | 'names' | 'carriers';

export default function DataQualityPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const staff = isStaffUser(user);

  const [openTool, setOpenTool] = useState<Tool | null>(null);
  const [counts, setCounts] = useState<{ dupes: number | null; carriers: number | null; names: number | null }>({
    dupes: null, carriers: null, names: null,
  });
  const [auditKey, setAuditKey] = useState(0);

  // Route guard: redirect non-staff away.
  useEffect(() => {
    if (!authLoading && !staff) {
      router.replace('/dashboard');
    }
  }, [authLoading, staff, router]);

  const loadCounts = useCallback(async () => {
    // Server-side aggregation — the browser client is capped at 1000 rows,
    // so counting in-page would silently undercount.
    const { data } = await supabase.rpc('dq_counts');
    const c = (data as any) || {};
    setCounts({ dupes: c.dupes ?? null, carriers: c.carriers ?? null, names: c.names ?? null });
  }, []);

  useEffect(() => {
    if (staff) loadCounts();
  }, [staff, loadCounts]);

  const refreshAfterAction = useCallback(() => {
    setAuditKey((k) => k + 1);
    loadCounts();
  }, [loadCounts]);

  if (authLoading || !staff) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        {!authLoading && !staff ? (
          <>
            <ShieldAlert className="mb-3 h-10 w-10 text-[#8B2D3B]" />
            <p className="text-sm font-medium">Staff access only</p>
            <p className="text-xs text-muted-foreground">Redirecting…</p>
          </>
        ) : (
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#2C3E6B] border-t-transparent" />
        )}
      </div>
    );
  }

  const cards: { key: Tool; label: string; icon: typeof Users; count: number | null; hint: string; accent: string }[] = [
    { key: 'duplicates', label: 'Duplicate client groups', icon: Users, count: counts.dupes, hint: 'Same-name records to merge', accent: 'text-[#2C3E6B] bg-[#2C3E6B]/5' },
    { key: 'carriers', label: 'Carrier variants', icon: Building2, count: counts.carriers, hint: 'Distinct free-text carrier names', accent: 'text-[#B8962E] bg-[#B8962E]/5' },
    { key: 'names', label: 'Doubled-name rows', icon: UserCog, count: counts.names, hint: 'First name repeats the last name', accent: 'text-[#8B2D3B] bg-[#8B2D3B]/5' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Data Quality</h1>
        <p className="text-sm text-gray-500">Staff tools to clean the imported book — merge duplicates, normalize carriers, fix names. Every action is logged.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((c) => {
          const active = openTool === c.key;
          return (
            <Card key={c.key} className={`transition-[box-shadow] duration-150 ${active ? 'ring-2 ring-[#B8962E]' : ''}`}>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className={`rounded-xl p-3 ${c.accent}`}>
                    <c.icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-muted-foreground">{c.label}</p>
                    {c.count === null ? (
                      <div className="mt-1 h-7 w-14 animate-pulse rounded bg-muted" />
                    ) : (
                      <p className="text-2xl font-bold text-gray-900">{c.count.toLocaleString()}</p>
                    )}
                  </div>
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground/80">{c.hint}</p>
                <Button
                  size="sm"
                  variant={active ? 'secondary' : 'outline'}
                  className="mt-3 w-full"
                  onClick={() => setOpenTool(active ? null : c.key)}
                >
                  {active ? 'Close' : 'Open'} <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {openTool === 'duplicates' && <DuplicatesTool onApplied={refreshAfterAction} />}
      {openTool === 'carriers' && <CarriersTool onApplied={refreshAfterAction} />}
      {openTool === 'names' && <NamesTool onApplied={refreshAfterAction} />}

      <AuditLogPanel refreshKey={auditKey} />
    </div>
  );
}
