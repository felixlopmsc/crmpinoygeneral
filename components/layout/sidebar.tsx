'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Users, FileText, RefreshCw, TrendingUp, DollarSign, Activity, SquareCheck as CheckSquare, Shield, FolderOpen, Mail, ChartBar as BarChart3, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/policies', label: 'Policies', icon: FileText },
  { href: '/renewals', label: 'Renewals', icon: RefreshCw },
  { href: '/deals', label: 'Pipeline', icon: TrendingUp },
  { href: '/commissions', label: 'Commissions', icon: DollarSign },
  { href: '/activities', label: 'Activities', icon: Activity },
  { href: '/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/claims', label: 'Claims', icon: Shield },
  { href: '/documents', label: 'Documents', icon: FolderOpen },
  { href: '/campaigns', label: 'Campaigns', icon: Mail },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
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
        <div className={cn('flex h-16 items-center border-b border-border px-3', collapsed ? 'justify-center' : 'gap-3')}>
          <Image
            src="/Copy_of_Pinoy_General_Insurance_Logo_(800_×_800_px).png"
            alt="Pinoy General Insurance"
            width={40}
            height={40}
            className="flex-shrink-0"
          />
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-[#1E40AF]">Pinoy General</p>
              <p className="truncate text-[11px] text-muted-foreground">Insurance CRM</p>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto p-2 scrollbar-thin">
          <ul className="space-y-0.5">
            {navItems.map((item) => {
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
