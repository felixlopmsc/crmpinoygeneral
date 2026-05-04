'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  FileText,
  RefreshCw,
  TrendingUp,
  DollarSign,
  Activity,
  SquareCheck as CheckSquare,
  Shield,
  FolderOpen,
  Mail,
  ChartBar as BarChart3,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
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
      { href: '/policies', label: 'Policies', icon: FileText },
      { href: '/renewals', label: 'Renewals', icon: RefreshCw },
    ],
  },
  {
    title: 'Sales & Pipeline',
    items: [
      { href: '/deals', label: 'Pipeline', icon: TrendingUp },
      { href: '/commissions', label: 'Commissions', icon: DollarSign },
    ],
  },
  {
    title: 'Operations',
    items: [
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
    ],
  },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-border bg-white transition-all duration-300',
          collapsed ? 'w-[68px]' : 'w-[240px]'
        )}
      >
        <Link
          href="/dashboard"
          className={cn(
            'flex items-center border-b border-border px-3 transition-colors hover:bg-muted/50',
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
              <p className="truncate text-sm font-bold text-[#1E40AF]">Pinoy General</p>
              <p className="truncate text-[11px] text-muted-foreground">Insurance CRM</p>
            </div>
          )}
        </Link>

        <nav className="flex-1 overflow-y-auto px-2 pt-2 pb-1 scrollbar-thin">
          {navGroups.map((group) => (
            <div key={group.title || 'top'} className={group.title ? 'mt-4 first:mt-0' : ''}>
              {group.title && !collapsed && (
                <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  {group.title}
                </p>
              )}
              {group.title && collapsed && (
                <div className="mx-auto my-2 h-px w-8 bg-border" />
              )}
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                  const linkContent = (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-[#1E40AF] text-white'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      <item.icon className="h-[18px] w-[18px] flex-shrink-0" />
                      {!collapsed && <span>{item.label}</span>}
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

        <div className="border-t border-border p-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className="w-full justify-center"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  );
}
