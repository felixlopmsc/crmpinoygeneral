'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AgilaWordmark from '@/components/landing/agila-wordmark';
import { cn } from '@/lib/utils';
import { loginHref } from '@/lib/supabase';
import DemoLink from '@/components/landing/demo-link';

const LINKS = [
  { href: '#problem', label: 'The problem' },
  { href: '#solution', label: 'Solution' },
  { href: '#results', label: 'Results' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#faq', label: 'FAQ' },
];

export default function LandingNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Lift the bar off the page once it stops sitting over the hero. Passive
  // listener so scrolling stays smooth, and a boolean (not a scroll-linked
  // value) so this never animates per frame.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        // bg-white/90, not /85: off-scale opacity modifiers compile to no CSS
        // at all, so /85 left this header fully transparent in production and
        // the page scrolled visibly through the nav. 90 rather than 80 because
        // the frosted look needs to actually obscure — and note that raising
        // backdrop-blur does not help. A wider radius spreads more of the dark
        // text under the bar, so the ghost gets *more* legible, not less.
        'sticky top-0 z-50 border-b bg-white/90 backdrop-blur-md transition-[border-color,box-shadow] duration-300 ease-out-strong',
        scrolled
          ? 'border-[#1B2A4A]/10 shadow-sm shadow-[#1B2A4A]/5'
          : 'border-transparent'
      )}
    >
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/">
          <AgilaWordmark size="sm" />
        </Link>

        <div className="hidden items-center gap-7 md:flex">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="text-sm font-medium text-[#1B2A4A]/70 transition-colors hover:text-[#1B2A4A]">
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <Link href={loginHref()}>
            <Button variant="ghost" className="text-[#1B2A4A] hover:bg-[#1B2A4A]/5">Log in</Button>
          </Link>
          <DemoLink>
            <Button variant="outline" className="border-[#1B2A4A]/20 text-[#1B2A4A] hover:bg-[#1B2A4A]/5">
              Try the demo
            </Button>
          </DemoLink>
          <a href="#book-demo">
            <Button className="bg-gradient-to-r from-[#2C3E6B] to-[#1B2A4A] text-white border border-[#B8962E]/30 hover:from-[#1B2A4A] hover:to-[#2C3E6B]">
              Book a demo
            </Button>
          </a>
        </div>

        <button
          // 44×44 is the Apple HIG minimum, and on a phone this button is the
          // only route to the navigation — p-2 around a 20px icon gave 36×36.
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-[#1B2A4A] md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-[#1B2A4A]/10 bg-white md:hidden">
          <div className="space-y-1 px-4 py-3">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="block rounded-md px-3 py-2 text-sm font-medium text-[#1B2A4A]/80 hover:bg-[#1B2A4A]/5"
              >
                {l.label}
              </a>
            ))}
            <div className="flex flex-col gap-2 pt-2">
              <Link href={loginHref()} onClick={() => setOpen(false)}>
                <Button variant="ghost" className="w-full">Log in</Button>
              </Link>
              <DemoLink onClick={() => setOpen(false)}>
                <Button variant="outline" className="w-full">Try the demo</Button>
              </DemoLink>
              <a href="#book-demo" onClick={() => setOpen(false)}>
                <Button className="w-full bg-gradient-to-r from-[#2C3E6B] to-[#1B2A4A] text-white">
                  Book a demo
                </Button>
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
