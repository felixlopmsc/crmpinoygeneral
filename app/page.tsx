import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import {
  Users,
  ShieldCheck,
  BellRing,
  TrendingUp,
  Inbox,
  BarChart3,
  ArrowRight,
  Check,
  LayoutDashboard,
  RefreshCw,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import LandingNav from '@/components/landing/landing-nav';
import BookDemoForm from '@/components/landing/book-demo-form';

export const metadata: Metadata = {
  title: 'Pinoy General CRM — The insurance agency platform',
  description:
    'A complete CRM built for independent insurance agencies: 360° client view, policy tracking, automated renewals, commissions, cross-sell, and a public quote inbox. Book a demo.',
};

const FEATURES = [
  {
    icon: Users,
    title: '360° client view',
    body: 'Every household, policy, document, claim, and touchpoint on one screen. No more digging through spreadsheets or shared drives.',
  },
  {
    icon: ShieldCheck,
    title: 'Policy management',
    body: 'Track auto, home, life, business and umbrella policies with carriers, premiums, effective dates and coverage in one place.',
  },
  {
    icon: BellRing,
    title: 'Automated renewals',
    body: 'Renewals surface before they lapse. The system flags what needs attention so nothing slips and clients stay covered.',
  },
  {
    icon: TrendingUp,
    title: 'Commissions tracking',
    body: 'See premium and commission by policy, carrier and agent. Know exactly what your book is worth at any moment.',
  },
  {
    icon: RefreshCw,
    title: 'Cross-sell engine',
    body: 'Spot households with coverage gaps and turn a single-policy client into a fully protected one — automatically.',
  },
  {
    icon: Inbox,
    title: 'Public quote inbox',
    body: 'A quote form on your website drops straight into the CRM as a triaged request — no copy-paste, no lost leads.',
  },
  {
    icon: BarChart3,
    title: 'Reports & pipeline',
    body: 'Deals, tasks, and reporting that show where revenue is coming from and what your team should work next.',
  },
  {
    icon: FileText,
    title: 'Documents & tasks',
    body: 'Attach policy docs to the client, assign follow-up tasks, and keep the whole team working from the same record.',
  },
];

const PLANS = [
  {
    name: 'Solo',
    tagline: 'For the independent agent',
    highlight: false,
    features: ['Single user', 'Clients, policies & renewals', 'Quote inbox', 'Documents & tasks'],
  },
  {
    name: 'Agency',
    tagline: 'For growing teams',
    highlight: true,
    features: [
      'Everything in Solo',
      'Multiple agents & roles',
      'Commissions & cross-sell',
      'Reports & pipeline',
      'Priority support',
    ],
  },
  {
    name: 'Enterprise',
    tagline: 'For multi-location books',
    highlight: false,
    features: ['Everything in Agency', 'Custom onboarding', 'Data migration help', 'Dedicated success contact'],
  },
];

const FAQS = [
  {
    q: 'Is this built specifically for insurance agencies?',
    a: 'Yes. It models households, policies by line of business, carriers, commissions and renewals the way an agency actually works — not a generic sales CRM bent into shape.',
  },
  {
    q: 'Can I try it before committing?',
    a: 'Absolutely. Book a demo and we will walk you through a live environment loaded with sample data so you can click around without touching any real client records.',
  },
  {
    q: 'How does the public quote form work?',
    a: 'You embed a quote form on your website. Submissions land directly in your CRM as triaged quote requests your team can pick up, quote and convert — no manual re-entry.',
  },
  {
    q: 'What does it cost?',
    a: 'Pricing depends on your team size and the plan that fits. Tell us a bit about your agency and we will put together the right numbers for you.',
  },
  {
    q: 'Is my data secure?',
    a: 'Every record is protected by row-level security so agents only see what they are allowed to. Your book stays yours.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <LandingNav />

      {/* Hero */}
      <section className="relative overflow-hidden bg-[#1B2A4A]">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1B2A4A] via-[#2C3E6B] to-[#1B2A4A]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#B8962E22_0%,_transparent_60%)]" />
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#B8962E] to-transparent" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#B8962E]/30 bg-white/5 px-4 py-1.5 text-xs font-medium text-[#D4AD3C]">
            The CRM built for independent insurance agencies
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold leading-tight text-white sm:text-5xl">
            Run your entire book of business from{' '}
            <span className="text-[#D4AD3C]">one platform</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-white/70">
            Clients, policies, renewals, commissions and quotes — organized, automated and always up to
            date. Spend less time chasing paperwork and more time writing business.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a href="#book-demo">
              <Button size="lg" className="gap-2 bg-[#B8962E] text-[#1B2A4A] font-semibold hover:bg-[#D4AD3C]">
                Book a demo <ArrowRight className="h-4 w-4" />
              </Button>
            </a>
            <Link href="/login">
              <Button size="lg" variant="outline" className="border-white/30 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                Log in
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-xs text-white/50">A guided sandbox you can click through — coming to this page soon.</p>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-[#1B2A4A]">Everything an agency needs, nothing it doesn&apos;t</h2>
          <p className="mt-3 text-[#1B2A4A]/60">
            Purpose-built for the way independent agents actually manage clients and policies.
          </p>
        </div>
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="group rounded-2xl border border-[#1B2A4A]/10 bg-[#F5F0E8]/40 p-6 transition-all hover:border-[#B8962E]/40 hover:bg-white hover:shadow-lg hover:shadow-[#1B2A4A]/5"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1B2A4A] text-[#D4AD3C]">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold text-[#1B2A4A]">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#1B2A4A]/60">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Product preview */}
      <section id="preview" className="scroll-mt-20 bg-[#F5F0E8]/50 py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-[#1B2A4A]/5 px-3 py-1 text-xs font-medium text-[#1B2A4A]">
              <LayoutDashboard className="h-3.5 w-3.5" /> One dashboard, full picture
            </span>
            <h2 className="mt-4 text-3xl font-bold text-[#1B2A4A]">See your whole agency at a glance</h2>
            <p className="mt-4 text-[#1B2A4A]/60">
              Active policies, premium under management, renewals due, and open opportunities — the numbers
              that matter, surfaced the moment you log in. Drill into any client for their complete history.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                'Live metrics for clients, policies and premium',
                'Renewal and cross-sell alerts before they cost you',
                'Role-based access so agents see only their book',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-[#1B2A4A]/80">
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#B8962E]" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-[#B8962E]/20 to-[#8B2D3B]/10 blur-2xl" />
            <div className="relative overflow-hidden rounded-2xl border border-[#1B2A4A]/10 bg-white shadow-2xl shadow-[#1B2A4A]/10">
              <div className="flex items-center gap-1.5 border-b border-[#1B2A4A]/10 bg-[#F5F0E8]/60 px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-[#8B2D3B]/50" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#B8962E]/50" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#1B2A4A]/30" />
              </div>
              <div className="space-y-4 p-5">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { k: 'Active clients', v: '312' },
                    { k: 'Policies', v: '548' },
                    { k: 'Premium', v: '$1.2M' },
                  ].map((s) => (
                    <div key={s.k} className="rounded-xl border border-[#1B2A4A]/10 bg-[#F5F0E8]/40 p-3">
                      <p className="text-lg font-bold text-[#1B2A4A]">{s.v}</p>
                      <p className="text-[10px] uppercase tracking-wide text-[#1B2A4A]/50">{s.k}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-xl border border-[#1B2A4A]/10 p-3">
                  <p className="mb-2 text-xs font-semibold text-[#1B2A4A]/70">Renewals this month</p>
                  {[
                    { n: 'Santos Household · Auto', d: 'Due in 6 days' },
                    { n: 'Reyes LLC · Business', d: 'Due in 12 days' },
                    { n: 'Cruz Household · Home', d: 'Due in 18 days' },
                  ].map((r) => (
                    <div key={r.n} className="flex items-center justify-between border-t border-[#1B2A4A]/5 py-2 text-xs first:border-t-0">
                      <span className="text-[#1B2A4A]/80">{r.n}</span>
                      <span className="font-medium text-[#8B2D3B]">{r.d}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Plans */}
      <section id="plans" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-[#1B2A4A]">Plans that scale with your agency</h2>
          <p className="mt-3 text-[#1B2A4A]/60">
            Pick the tier that fits today. We&apos;ll tailor pricing to your team — no surprises.
          </p>
        </div>
        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className={`relative flex flex-col rounded-2xl border p-8 ${
                p.highlight
                  ? 'border-[#B8962E] bg-[#1B2A4A] text-white shadow-2xl shadow-[#1B2A4A]/20'
                  : 'border-[#1B2A4A]/10 bg-white'
              }`}
            >
              {p.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#B8962E] px-3 py-1 text-xs font-semibold text-[#1B2A4A]">
                  Most popular
                </span>
              )}
              <h3 className={`text-xl font-bold ${p.highlight ? 'text-white' : 'text-[#1B2A4A]'}`}>{p.name}</h3>
              <p className={`mt-1 text-sm ${p.highlight ? 'text-white/70' : 'text-[#1B2A4A]/60'}`}>{p.tagline}</p>
              <p className={`mt-5 text-2xl font-bold ${p.highlight ? 'text-[#D4AD3C]' : 'text-[#1B2A4A]'}`}>
                Custom pricing
              </p>
              <ul className="mt-6 flex-1 space-y-3">
                {p.features.map((f) => (
                  <li key={f} className={`flex items-start gap-2.5 text-sm ${p.highlight ? 'text-white/85' : 'text-[#1B2A4A]/75'}`}>
                    <Check className={`mt-0.5 h-4 w-4 flex-shrink-0 ${p.highlight ? 'text-[#D4AD3C]' : 'text-[#B8962E]'}`} />
                    {f}
                  </li>
                ))}
              </ul>
              <a href="#book-demo" className="mt-8">
                <Button
                  className={`w-full ${
                    p.highlight
                      ? 'bg-[#B8962E] text-[#1B2A4A] font-semibold hover:bg-[#D4AD3C]'
                      : 'bg-[#1B2A4A] text-white hover:bg-[#2C3E6B]'
                  }`}
                >
                  Request pricing
                </Button>
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* Book a demo */}
      <section id="book-demo" className="scroll-mt-20 bg-[#F5F0E8]/50 py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold text-[#1B2A4A]">See it on your own book</h2>
            <p className="mt-4 text-[#1B2A4A]/60">
              Tell us a little about your agency and we&apos;ll set up a live walkthrough — loaded with
              sample data so you can explore every screen without touching real client records.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                'A real, guided tour — not a slideshow',
                'Answers on pricing tailored to your team',
                'No obligation, no pressure',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-[#1B2A4A]/80">
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#B8962E]" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <BookDemoForm />
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-20 sm:px-6">
        <h2 className="text-center text-3xl font-bold text-[#1B2A4A]">Frequently asked questions</h2>
        <Accordion type="single" collapsible className="mt-10">
          {FAQS.map((f, i) => (
            <AccordionItem key={i} value={`item-${i}`}>
              <AccordionTrigger className="text-left text-[#1B2A4A]">{f.q}</AccordionTrigger>
              <AccordionContent className="text-[#1B2A4A]/70">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1B2A4A]/10 bg-[#1B2A4A]">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-2.5">
              <Image
                src="/Copy_of_Pinoy_General_Insurance_Logo_(800_×_800_px).png"
                alt="Pinoy General CRM"
                width={36}
                height={36}
                className="rounded-lg bg-white/95 p-0.5"
              />
              <span className="font-bold text-white">
                Pinoy General <span className="text-[#D4AD3C]">CRM</span>
              </span>
            </div>
            <div className="flex items-center gap-6 text-sm text-white/60">
              <a href="#features" className="hover:text-white">Features</a>
              <a href="#plans" className="hover:text-white">Plans</a>
              <a href="#book-demo" className="hover:text-white">Book a demo</a>
              <Link href="/login" className="hover:text-white">Log in</Link>
            </div>
          </div>
          <div className="mt-8 border-t border-white/10 pt-6 text-center text-xs text-white/40">
            © {new Date().getFullYear()} Pinoy General Insurance Services. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
