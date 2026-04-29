'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Users, TrendingUp, SquareCheck as CheckSquare, Menu } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { FileText, RefreshCw, DollarSign, Activity, Shield, FolderOpen, Mail, ChartBar as BarChart3 } from 'lucide-react';

const mainTabs = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/deals', label: 'Deals', icon: TrendingUp },
  { href: '/tasks', label: 'Tasks', icon: CheckSquare },
];

const moreItems = [
  { href: '/policies', label: 'Policies', icon: FileText },
  { href: '/renewals', label: 'Renewals', icon: RefreshCw },
  { href: '/commissions', label: 'Commissions', icon: DollarSign },
  { href: '/activities', label: 'Activities', icon: Activity },
  { href: '/claims', label: 'Claims', icon: Shield },
  { href: '/documents', label: 'Documents', icon: FolderOpen },
  { href: '/campaigns', label: 'Campaigns', icon: Mail },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-[#B8962E]/20 bg-gradient-to-r from-[#1B2A4A] to-[#2C3E6B] md:hidden">
      {mainTabs.map((tab) => {
        const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/');
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'flex flex-col items-center gap-0.5 px-3 py-1.5 text-[11px] font-medium',
              isActive ? 'text-[#D4AD3C]' : 'text-white/60'
            )}
          >
            <tab.icon className="h-5 w-5" />
            {tab.label}
          </Link>
        );
      })}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex flex-col items-center gap-0.5 px-3 py-1.5 h-auto text-[11px] font-medium text-white/60 hover:text-white">
            <Menu className="h-5 w-5" />
            More
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 mb-2">
          {moreItems.map((item) => (
            <DropdownMenuItem key={item.href} asChild>
              <Link href={item.href} className="gap-2">
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  );
}
