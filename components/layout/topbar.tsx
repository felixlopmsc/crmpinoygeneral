'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { getInitials } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { Search, LogOut, User, Settings, FileText, Users, Shield, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import NotificationDropdown from '@/components/layout/notification-dropdown';
import TutorialDropdown from '@/components/layout/tutorial-dropdown';

interface SearchResult {
  id: string;
  label: string;
  sublabel?: string;
  href: string;
  section: 'Clients' | 'Policies' | 'Leads' | 'Activities';
}

export default function Topbar() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const performSearch = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); setSearching(false); return; }
    setSearching(true);

    const pattern = `%${q}%`;
    const allResults: SearchResult[] = [];

    const [clientsRes, policiesRes, leadsRes, activitiesRes] = await Promise.all([
      supabase.from('clients').select('id, first_name, last_name, email').or(`first_name.ilike.${pattern},last_name.ilike.${pattern},email.ilike.${pattern}`).limit(5),
      supabase.from('policies').select('id, policy_number, carrier, policy_type, client_id').is('deleted_at', null).or(`policy_number.ilike.${pattern},carrier.ilike.${pattern}`).limit(5),
      supabase.from('leads').select('id, first_name, last_name, email').or(`first_name.ilike.${pattern},last_name.ilike.${pattern},email.ilike.${pattern}`).limit(5),
      supabase.from('activities').select('id, subject, description, activity_type, client_id').or(`subject.ilike.${pattern},description.ilike.${pattern}`).order('created_at', { ascending: false }).limit(5),
    ]);

    if (clientsRes.data) {
      clientsRes.data.forEach((c) => allResults.push({
        id: c.id,
        label: `${c.first_name} ${c.last_name}`,
        sublabel: c.email || undefined,
        href: `/clients/${c.id}`,
        section: 'Clients',
      }));
    }

    if (policiesRes.data) {
      policiesRes.data.forEach((p) => allResults.push({
        id: p.id,
        label: `${p.carrier} - ${p.policy_type}`,
        sublabel: p.policy_number || undefined,
        href: `/policies/${p.id}`,
        section: 'Policies',
      }));
    }

    if (leadsRes.data) {
      leadsRes.data.forEach((l) => allResults.push({
        id: l.id,
        label: `${l.first_name} ${l.last_name}`,
        sublabel: l.email || undefined,
        href: `/leads/${l.id}`,
        section: 'Leads',
      }));
    }

    if (activitiesRes.data) {
      activitiesRes.data.forEach((a) => allResults.push({
        id: a.id,
        label: `${a.activity_type}: ${a.subject || ''}`,
        sublabel: a.description?.slice(0, 60) || undefined,
        href: `/clients/${a.client_id}`,
        section: 'Activities',
      }));
    }

    setResults(allResults);
    setSearching(false);
    setSelectedIdx(-1);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (searchQuery.length < 2) { setResults([]); return; }
    debounceRef.current = setTimeout(() => performSearch(searchQuery), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery, performSearch]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showResults || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && selectedIdx >= 0) {
      e.preventDefault();
      router.push(results[selectedIdx].href);
      setShowResults(false);
      setSearchQuery('');
    } else if (e.key === 'Escape') {
      setShowResults(false);
    }
  };

  const sectionIcons: Record<string, any> = { Clients: Users, Policies: Shield, Leads: Radio, Activities: FileText };
  const sections: SearchResult['section'][] = ['Clients', 'Policies', 'Leads', 'Activities'];

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b-2 border-[#B8962E]/30 bg-gradient-to-r from-[#F5F0E8] to-white px-6 backdrop-blur-sm">
      <div ref={containerRef} className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setShowResults(true); }}
          onFocus={() => { if (results.length > 0) setShowResults(true); }}
          onKeyDown={handleKeyDown}
          placeholder="Search clients, policies, leads..."
          className="pl-9 bg-white border border-border shadow-sm focus-visible:ring-1 focus-visible:ring-[#B8962E]/30 focus-visible:border-[#B8962E]/40"
        />
        {showResults && searchQuery.length >= 2 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg border shadow-lg overflow-hidden z-50 max-h-[400px] overflow-y-auto">
            {searching && results.length === 0 ? (
              <div className="px-4 py-3 text-sm text-muted-foreground">Searching...</div>
            ) : results.length === 0 && !searching ? (
              <div className="px-4 py-3 text-sm text-muted-foreground">No results found</div>
            ) : (
              sections.map((section) => {
                const sectionResults = results.filter((r) => r.section === section);
                if (sectionResults.length === 0) return null;
                const SectionIcon = sectionIcons[section];
                return (
                  <div key={section}>
                    <div className="px-3 py-1.5 bg-muted/50 text-xs font-medium text-muted-foreground flex items-center gap-1.5 border-b">
                      <SectionIcon className="h-3 w-3" /> {section}
                    </div>
                    {sectionResults.map((result) => {
                      const globalIdx = results.indexOf(result);
                      return (
                        <button
                          key={result.id}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-muted/70 transition-colors flex flex-col ${globalIdx === selectedIdx ? 'bg-muted/70' : ''}`}
                          onMouseEnter={() => setSelectedIdx(globalIdx)}
                          onClick={() => {
                            router.push(result.href);
                            setShowResults(false);
                            setSearchQuery('');
                          }}
                        >
                          <span className="font-medium text-gray-900 truncate">{result.label}</span>
                          {result.sublabel && <span className="text-xs text-muted-foreground truncate">{result.sublabel}</span>}
                        </button>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1">
        <TutorialDropdown />
        <NotificationDropdown />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 px-2">
              <Avatar className="h-8 w-8">
                {user?.avatar_url && <AvatarImage src={user.avatar_url} alt={user.full_name || 'User'} />}
                <AvatarFallback className="bg-[#2C3E6B] text-xs text-white">
                  {user ? getInitials(user.full_name || user.email) : 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium md:inline-block">
                {user?.full_name || user?.email || 'User'}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem className="gap-2" onClick={() => router.push('/profile')}>
              <User className="h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2" onClick={() => router.push('/settings')}>
              <Settings className="h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 text-destructive" onClick={signOut}>
              <LogOut className="h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
