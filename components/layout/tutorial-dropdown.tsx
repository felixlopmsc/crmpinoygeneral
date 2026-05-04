'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CircleHelp as HelpCircle, Users, FileText, RefreshCw, TrendingUp, DollarSign, LayoutDashboard, Shield, ChevronRight, Lightbulb, BookOpen, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

const tutorialSections = [
  {
    category: 'Getting Started',
    icon: Lightbulb,
    color: 'text-amber-600 bg-amber-50',
    items: [
      {
        title: 'Dashboard Overview',
        description: 'See your key metrics, upcoming renewals, and recent activity at a glance.',
        link: '/dashboard',
        icon: LayoutDashboard,
      },
      {
        title: 'Adding Your First Client',
        description: 'Click "+ New Client" on the Clients page to add contact details, set their status, and assign them to an agent.',
        link: '/clients',
        icon: Users,
      },
    ],
  },
  {
    category: 'Core Features',
    icon: BookOpen,
    color: 'text-blue-600 bg-blue-50',
    items: [
      {
        title: 'Creating Policies',
        description: 'Attach policies to clients with carrier, premium, commission, and coverage details. Use Quick Fill for fast entry.',
        link: '/policies',
        icon: FileText,
      },
      {
        title: 'Renewal Tracking',
        description: 'Renewals are auto-generated from policy expiration dates. Track contacted status and outcomes.',
        link: '/renewals',
        icon: RefreshCw,
      },
      {
        title: 'Sales Pipeline',
        description: 'Manage your deals through stages from New Lead to Closed. Track probability and expected close dates.',
        link: '/deals',
        icon: TrendingUp,
      },
      {
        title: 'Commission Tracking',
        description: 'Track earned commissions by carrier and policy type. Monitor payment status and view reports.',
        link: '/commissions',
        icon: DollarSign,
      },
    ],
  },
  {
    category: 'Advanced',
    icon: Target,
    color: 'text-emerald-600 bg-emerald-50',
    items: [
      {
        title: 'Claims Management',
        description: 'File and track insurance claims with adjuster details, amounts, and resolution tracking.',
        link: '/claims',
        icon: Shield,
      },
      {
        title: 'Client 360 View',
        description: 'Click any client to see all their policies, activities, claims, and documents in one place.',
        link: '/clients',
        icon: Users,
      },
    ],
  },
];

export default function TutorialDropdown() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const handleNavigate = (link: string) => {
    setOpen(false);
    router.push(link);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <HelpCircle className="h-[18px] w-[18px]" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="font-semibold text-sm">Help & Tutorials</h3>
          <span className="text-xs text-muted-foreground">Quick guides</span>
        </div>
        <ScrollArea className="max-h-[420px]">
          <div className="p-2">
            {tutorialSections.map((section) => {
              const SectionIcon = section.icon;
              return (
                <div key={section.category} className="mb-3 last:mb-0">
                  <div className="flex items-center gap-2 px-2 py-1.5">
                    <div className={cn('rounded-md p-1', section.color)}>
                      <SectionIcon className="h-3 w-3" />
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {section.category}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {section.items.map((item) => {
                      const ItemIcon = item.icon;
                      return (
                        <button
                          key={item.title}
                          onClick={() => handleNavigate(item.link)}
                          className="w-full flex items-start gap-3 rounded-lg px-2 py-2 text-left hover:bg-muted/60 transition-colors group"
                        >
                          <ItemIcon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium group-hover:text-[#1E40AF] transition-colors">
                              {item.title}
                            </p>
                            <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
                              {item.description}
                            </p>
                          </div>
                          <ChevronRight className="h-3 w-3 text-muted-foreground/50 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
