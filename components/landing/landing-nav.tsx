'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const LINKS = [
  { href: '#features', label: 'Features' },
  { href: '#preview', label: 'Product' },
  { href: '#plans', label: 'Plans' },
  { href: '#faq', label: 'FAQ' },
];

export default function LandingNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-[#1B2A4A]/10 bg-white/85 backdrop-blur-md">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/Copy_of_Pinoy_General_Insurance_Logo_(800_×_800_px).png"
            alt="Pinoy General CRM"
            width={36}
            height={36}
            className="rounded-lg"
          />
          <span className="text-base font-bold text-[#1B2A4A]">
            Pinoy General <span className="text-[#B8962E]">CRM</span>
          </span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="text-sm font-medium text-[#1B2A4A]/70 transition-colors hover:text-[#1B2A4A]">
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <Link href="/login">
            <Button variant="ghost" className="text-[#1B2A4A] hover:bg-[#1B2A4A]/5">Log in</Button>
          </Link>
          <a href="#book-demo">
            <Button className="bg-gradient-to-r from-[#2C3E6B] to-[#1B2A4A] text-white border border-[#B8962E]/30 hover:from-[#1B2A4A] hover:to-[#2C3E6B]">
              Book a demo
            </Button>
          </a>
        </div>

        <button
          className="rounded-md p-2 text-[#1B2A4A] md:hidden"
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
              <Link href="/login" onClick={() => setOpen(false)}>
                <Button variant="outline" className="w-full">Log in</Button>
              </Link>
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
