'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  FileText,
  RefreshCw,
  TrendingUp,
  DollarSign,
  Activity,
  SquareCheck as CheckSquare,
  Shield,
  FolderOpen,
  Mail,
  MessageSquare,
  FileSpreadsheet,
  ChartBar as BarChart3,
  Database,
  ChevronLeft,
  ChevronRight,
  Target,
  Inbox,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useNewMessagesCount } from '@/hooks/use-new-messages-count';
import { useNewQuoteRequestsCount } from '@/hooks/use-new-quote-requests-count';
import { useNewDemoRequestsCount } from '@/hooks/use-new-demo-requests-count';
import { useAuth } from '@/lib/auth-context';
import { isStaffUser } from '@/lib/is-staff';

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  staffOnly?: boolean;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: '',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Client Management',
    items: [
      { href: '/clients', label: 'Clients', icon: Users },
      { href: '/leads', label: 'Leads', icon: UserPlus },
      { href: '/quote-requests', label: 'Quote Requests', icon: FileSpreadsheet },
      { href: '/policies', label: 'Policies', icon: FileText },
      { href: '/renewals', label: 'Renewals', icon: RefreshCw },
    ],
  },
  {
    title: 'Sales & Pipeline',
    items: [
      { href: '/deals', label: 'Pipeline', icon: TrendingUp },
      { href: '/cross-sell', label: 'Cross-Sell', icon: Target },
      { href: '/commissions', label: 'Commissions', icon: DollarSign },
    ],
  },
  {
    title: 'Operations',
    items: [
      { href: '/messages', label: 'Messages', icon: MessageSquare },
      { href: '/activities', label: 'Activities', icon: Activity },
      { href: '/tasks', label: 'Tasks', icon: CheckSquare },
      { href: '/claims', label: 'Claims', icon: Shield },
      { href: '/documents', label: 'Documents', icon: FolderOpen },
      { href: '/campaigns', label: 'Campaigns', icon: Mail },
    ],
  },
  {
    title: 'Reporting',
    items: [
      { href: '/reports', label: 'Reports', icon: BarChart3 },
      { href: '/demo-requests', label: 'Demo Requests', icon: Inbox, staffOnly: true },
      { href: '/settings/data-quality', label: 'Data Quality', icon: Database, staffOnly: true },
    ],
  },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const newMessagesCount = useNewMessagesCount();
  const newQuoteRequestsCount = useNewQuoteRequestsCount();
  const newDemoRequestsCount = useNewDemoRequestsCount();
  const { user } = useAuth();
  const staff = isStaffUser(user);

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-[#B8962E]/20 bg-gradient-to-b from-[#1B2A4A] to-[#2C3E6B] transition-all duration-300',
          collapsed ? 'w-[68px]' : 'w-[240px]'
        )}
      >
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#8B2D3B] via-[#B8962E] to-[#8B2D3B]" />
        <Link
          href="/dashboard"
          className={cn(
            'flex items-center border-b border-white/10 px-3 transition-colors hover:bg-white/5',
            collapsed ? 'justify-center h-[72px]' : 'gap-3 h-[72px]'
          )}
        >
          <Image
            src="/Copy_of_Pinoy_General_Insurance_Logo_(800_×_800_px).png"
            alt="Pinoy General Insurance"
            width={collapsed ? 44 : 64}
            height={collapsed ? 44 : 64}
            className="flex-shrink-0"
          />
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-[#D4AD3C]">Pinoy General</p>
              <p className="truncate text-[11px] text-white/50">Insurance CRM</p>
            </div>
          )}
        </Link>

        <nav className="flex-1 overflow-y-auto px-2 pt-2 pb-1 scrollbar-thin">
          {navGroups.map((group) => (
            <div key={group.title || 'top'} className={group.title ? 'mt-4 first:mt-0' : ''}>
              {group.title && !collapsed && (
                <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-[#B8962E]/70">
                  {group.title}
                </p>
              )}
              {group.title && collapsed && (
                <div className="mx-auto my-2 h-px w-8 bg-white/10" />
              )}
              <ul className="space-y-0.5">
                {group.items.filter((item) => !item.staffOnly || staff).map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                  const badgeCount =
                    item.href === '/messages' ? newMessagesCount
                    : item.href === '/quote-requests' ? newQuoteRequestsCount
                    : item.href === '/demo-requests' ? newDemoRequestsCount
                    : 0;
                  const linkContent = (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                        isActive
                          ? 'bg-white/10 text-white border-l-2 border-[#B8962E] shadow-sm shadow-[#B8962E]/10'
                          : 'text-white/70 hover:bg-white/5 hover:text-white border-l-2 border-transparent'
                      )}
                    >
                      <span className="relative flex-shrink-0">
                        <item.icon className="h-[18px] w-[18px]" />
                        {collapsed && badgeCount > 0 && (
                          <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-destructive" />
                        )}
                      </span>
                      {!collapsed && <span className="flex-1">{item.label}</span>}
                      {!collapsed && badgeCount > 0 && (
                        <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
                          {badgeCount > 9 ? '9+' : badgeCount}
                        </span>
                      )}
                    </Link>
                  );

                  if (collapsed) {
                    return (
                      <li key={item.href}>
                        <Tooltip>
                          <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                          <TooltipContent side="right">{item.label}</TooltipContent>
                        </Tooltip>
                      </li>
                    );
                  }

                  return <li key={item.href}>{linkContent}</li>;
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 p-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className="w-full justify-center text-white/50 hover:text-white hover:bg-white/10"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  );
}
