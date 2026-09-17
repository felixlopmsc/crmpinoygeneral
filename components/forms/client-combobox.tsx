'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Check, ChevronsUpDown, Loader2, UserX } from 'lucide-react';

export interface ClientOption {
  id: string;
  first_name: string;
  last_name: string;
  email?: string | null;
  address_city?: string | null;
}

export function clientLabel(c: Pick<ClientOption, 'first_name' | 'last_name'>): string {
  return `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() || 'Unnamed client';
}

// Names resolved so far, shared across every picker on the page. A file row
// that inherits the dialog's default client can show the name without a
// second round trip, and reopening a picker does not refetch what it showed.
const labelCache = new Map<string, ClientOption>();

const RESULT_LIMIT = 25;

// PostgREST filter grammar reserves these inside an or() value. Stripping
// them is safer than trying to quote: a name search never needs them.
function sanitize(q: string): string {
  return q.replace(/[,()"\\%]/g, ' ').replace(/\s+/g, ' ').trim();
}

async function searchClients(raw: string): Promise<ClientOption[]> {
  const q = sanitize(raw);
  let query = supabase
    .from('clients')
    .select('id, first_name, last_name, email, address_city')
    .order('first_name')
    .order('last_name')
    .limit(RESULT_LIMIT);

  if (q) {
    const words = q.split(' ');
    const clauses = [`first_name.ilike.%${q}%`, `last_name.ilike.%${q}%`, `email.ilike.%${q}%`];
    if (words.length >= 2) {
      // "jamshed dellawar" or "dellawar jamshed": first token against one
      // column and the rest against the other, in either order.
      const [a, ...rest] = words;
      const b = rest.join(' ');
      clauses.push(`and(first_name.ilike.%${a}%,last_name.ilike.%${b}%)`);
      clauses.push(`and(first_name.ilike.%${b}%,last_name.ilike.%${a}%)`);
    }
    query = query.or(clauses.join(','));
  }

  const { data } = await query;
  const rows = (data as ClientOption[]) || [];
  rows.forEach((c) => labelCache.set(c.id, c));
  return rows;
}

/**
 * Type-to-search client picker. Searches the database as you type instead
 * of listing every client, so it works the same with 100 households or
 * 10,000, and the old hard cap of the first 100 names is gone.
 */
export function ClientCombobox({
  value,
  onChange,
  placeholder = 'Search clients…',
  noneLabel = 'No client',
  allowNone = true,
  disabled,
  size = 'default',
  className,
}: {
  value: string;
  onChange: (id: string, client: ClientOption | null) => void;
  placeholder?: string;
  /** Label of the clear option. Pass allowNone={false} to hide it. */
  noneLabel?: string;
  allowNone?: boolean;
  disabled?: boolean;
  size?: 'default' | 'sm';
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<ClientOption | null>(value ? labelCache.get(value) ?? null : null);
  const requestSeq = useRef(0);

  // Resolve a label for a value chosen elsewhere (e.g. the dialog default
  // pushed down to each file row) that this picker has never seen.
  useEffect(() => {
    if (!value) { setSelected(null); return; }
    const cached = labelCache.get(value);
    if (cached) { setSelected(cached); return; }
    let cancelled = false;
    supabase
      .from('clients')
      .select('id, first_name, last_name, email, address_city')
      .eq('id', value)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data) return;
        labelCache.set(data.id, data as ClientOption);
        setSelected(data as ClientOption);
      });
    return () => { cancelled = true; };
  }, [value]);

  const runSearch = useCallback(async (q: string) => {
    const seq = ++requestSeq.current;
    setLoading(true);
    const rows = await searchClients(q);
    // A slow early response must not overwrite a faster later one.
    if (seq !== requestSeq.current) return;
    setResults(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handle = setTimeout(() => runSearch(query), query ? 180 : 0);
    return () => clearTimeout(handle);
  }, [open, query, runSearch]);

  const choose = (c: ClientOption | null) => {
    setSelected(c);
    onChange(c?.id ?? '', c);
    setOpen(false);
    setQuery('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-full justify-between font-normal',
            size === 'sm' ? 'h-7 px-2 text-[11px]' : 'h-10 px-3 text-sm',
            !selected && 'text-muted-foreground',
            className,
          )}
        >
          <span className="truncate">{selected ? clientLabel(selected) : placeholder}</span>
          <ChevronsUpDown className={cn('shrink-0 opacity-50', size === 'sm' ? 'ml-1 h-3 w-3' : 'ml-2 h-4 w-4')} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[280px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder="Type a name or email…"
            autoFocus
          />
          <CommandList className="max-h-[260px]">
            {loading && results.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching…
              </div>
            ) : (
              <CommandEmpty className="py-6 text-center text-xs text-muted-foreground">
                No clients match &ldquo;{query}&rdquo;
              </CommandEmpty>
            )}
            {allowNone && !query && (
              <CommandGroup>
                <CommandItem value="__none" onSelect={() => choose(null)} className="text-muted-foreground">
                  <UserX className="mr-2 h-3.5 w-3.5" />
                  {noneLabel}
                  {!value && <Check className="ml-auto h-3.5 w-3.5" />}
                </CommandItem>
              </CommandGroup>
            )}
            {results.length > 0 && (
              <CommandGroup heading={query ? 'Matches' : 'Clients A–Z'}>
                {results.map((c) => (
                  <CommandItem key={c.id} value={c.id} onSelect={() => choose(c)}>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{clientLabel(c)}</p>
                      {(c.email || c.address_city) && (
                        <p className="truncate text-[11px] text-muted-foreground">
                          {[c.email, c.address_city].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>
                    {value === c.id && <Check className="ml-2 h-3.5 w-3.5 shrink-0 text-[#2C3E6B]" />}
                  </CommandItem>
                ))}
                {results.length === RESULT_LIMIT && (
                  <p className="px-2 py-1.5 text-[10px] text-muted-foreground">
                    Showing the first {RESULT_LIMIT}. Keep typing to narrow it down.
                  </p>
                )}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
