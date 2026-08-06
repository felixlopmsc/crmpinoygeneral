import type { Metadata } from 'next';
import {
  Users,
  BellRing,
  TrendingUp,
  Inbox,
  BarChart3,
  ArrowRight,
  Check,
  RefreshCw,
  FileText,
  ShieldCheck,
  CircleAlert as AlertCircle,
  Clock,
  FileWarning,
  SearchX,
  Wallet,
  Sparkles,
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
import AgilaWordmark from '@/components/landing/agila-wordmark';
import Reveal from '@/components/landing/reveal';
import { staggerDelay } from '@/components/landing/stagger';
import LoginLink from '@/components/landing/login-link';
import DemoLink from '@/components/landing/demo-link';

export const metadata: Metadata = {
  title: 'Agila Management Systems — The agency system for independent insurance agents',
  description:
    'Agila Management Systems is the all-in-one management platform for independent insurance agencies: 360° client view, policy tracking, automated renewals, commissions, cross-sell, and a quote inbox. Try the live demo.',
};

/* ---------------------------------------------------------------------------
   Page narrative follows MSC's STAGE framework:
     Spark   — hero: the uncomfortable truth about a leaking book
     Tension — the five pains an independent agency lives with daily
     Action  — how Agila answers each pain, plus the live sandbox
     Growth  — what changes in the first 90 days, and pricing to act on
     Emotion — why this exists: built by an agency, for agencies
--------------------------------------------------------------------------- */

// TENSION — the pains, each paired with the way Agila resolves it.
const PAINS = [
  {
    icon: SearchX,
    pain: 'Your book lives in six places at once',
    detail:
      'A spreadsheet for renewals, carrier portals for policies, your inbox for documents, sticky notes for follow-ups. Nobody — including you — can see the whole picture.',
    fix: 'One record per household: every policy, document, claim, note and touchpoint on a single screen.',
  },
  {
    icon: Clock,
    pain: 'Renewals slip through and you find out from the client',
    detail:
      'Nothing tells you a policy lapses in nine days. You catch it when the customer calls angry — or when they have already been written by someone else.',
    fix: 'Automated 90/60/30/7-day renewal alerts, surfaced the moment you log in, so retention stops depending on memory.',
  },
  {
    icon: Wallet,
    pain: 'You do not actually know what your book is worth',
    detail:
      'Premium under management, commission by carrier, what each agent produced this quarter — answering that means a night of spreadsheet math.',
    fix: 'Live premium and commission totals by policy, carrier and agent. Your book value, always current.',
  },
  {
    icon: FileWarning,
    pain: 'Single-policy clients stay single-policy clients',
    detail:
      'The auto-only client who owns a home is your easiest sale — and the one you never get around to spotting.',
    fix: 'The cross-sell engine flags coverage gaps household by household and hands you the pitch.',
  },
  {
    icon: AlertCircle,
    pain: 'Website leads die in an inbox',
    detail:
      'A quote request arrives as an email, gets buried under forty others, and by the time anyone answers the prospect has already bought.',
    fix: 'Quote requests land straight in the CRM as triaged records with an estimate range — no re-keying, no lost leads.',
  },
];

// ACTION — the capability set, framed as outcomes.
const CAPABILITIES = [
  { icon: Users, title: '360° client view', body: 'Households, policies, documents, claims and history in one record.' },
  { icon: ShieldCheck, title: 'Policy management', body: 'Auto, home, renters, life, business and umbrella with carriers and coverage.' },
  { icon: BellRing, title: 'Automated renewals', body: 'Tiered reminders so nothing lapses without you knowing first.' },
  { icon: TrendingUp, title: 'Commission tracking', body: 'Premium and commission by policy, carrier and producing agent.' },
  { icon: RefreshCw, title: 'Cross-sell engine', body: 'Coverage-gap detection with a ready-to-send pitch per household.' },
  { icon: Inbox, title: 'Quote request inbox', body: 'Website submissions arrive triaged, estimated and assignable.' },
  { icon: BarChart3, title: 'Pipeline & reports', body: 'Deals, tasks and reporting that show where revenue comes from.' },
  { icon: FileText, title: 'Documents & tasks', body: 'Policy docs attached to the client, follow-ups assigned to the team.' },
];

// GROWTH — outcomes in the first 90 days.
const OUTCOMES = [
  { stat: 'Day 1', label: 'Your whole book, visible', body: 'Import clients and policies and see premium under management for the first time.' },
  { stat: 'Week 2', label: 'Renewals stop leaking', body: 'Every expiring policy is queued with a reminder before it becomes a save-or-lose call.' },
  { stat: 'Day 90', label: 'Coverage gaps become revenue', body: 'Cross-sell opportunities worked systematically instead of whenever someone remembers.' },
];

const PLANS = [
  {
    name: 'Solo',
    price: '$79',
    cadence: '/month',
    annual: 'or $790/year — 2 months free',
    tagline: 'The independent agent running their own book',
    highlight: false,
    features: [
      '1 user',
      'Up to 500 client households',
      'Clients, policies & renewals',
      'Quote request inbox',
      'Documents & tasks',
      'Email support',
    ],
  },
  {
    name: 'Agency',
    price: '$199',
    cadence: '/month',
    annual: 'or $1,990/year — 2 months free',
    tagline: 'Growing teams with producers to manage',
    highlight: true,
    features: [
      'Up to 5 users',
      'Unlimited households',
      'Everything in Solo',
      'Commission tracking by agent',
      'Cross-sell engine',
      'Pipeline & reporting',
      'Priority support',
    ],
  },
  {
    name: 'Multi-Office',
    price: '$399',
    cadence: '/month',
    annual: 'or $3,990/year — 2 months free',
    tagline: 'Multiple locations and larger books',
    highlight: false,
    features: [
      'Unlimited users',
      'Everything in Agency',
      'Role-based access by office',
      'Guided onboarding',
      'Data migration included',
      'Dedicated success contact',
    ],
  },
];

const FAQS = [
  {
    q: 'Is this built specifically for insurance agencies?',
    a: 'Yes. Agila models households, lines of business, carriers, commissions and renewals the way an agency actually works. It is not a generic sales CRM bent into shape — the renewal engine and cross-sell logic only make sense in insurance.',
  },
  {
    q: 'Can I try it before paying?',
    a: 'Click "Try the live demo" anywhere on this page. You will land inside a real, fully populated instance loaded with sample data — no form, no signup, no card. Add clients, move deals, work a renewal: the sandbox resets itself every hour, and it is a completely separate database from any live agency data.',
  },
  {
    q: 'What happens to the data I already have?',
    a: 'Bring it. Clients and policies import from spreadsheet or CSV, and data migration is included on the Multi-Office plan (available as a one-time service on the others).',
  },
  {
    q: 'How does the quote request inbox work?',
    a: 'You embed a quote form on your agency website. Submissions land directly in Agila as triaged quote requests with an estimate range, ready for a producer to pick up, quote and convert — no manual re-entry.',
  },
  {
    q: 'Is my client data secure?',
    a: 'Every record is protected by row-level security enforced in the database, not just the interface, so agents only reach the households they are permitted to see. Your book stays yours.',
  },
  {
    q: 'What does the founding-agency rate include?',
    a: 'Founding agencies lock their rate permanently, get direct input on the roadmap, and work with us on onboarding personally. In exchange we ask for honest feedback and, once you are happy, a reference.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Reveal renders its initial state hidden, so without JS the few
          elements that still use it would never appear. This forces them
          visible in that case. */}
      <noscript>
        <style>{`[data-reveal]{opacity:1 !important;transform:none !important}`}</style>
      </noscript>
      <LandingNav />

      {/* ============ SPARK ============ */}
      <section className="relative overflow-hidden bg-[#1B2A4A]">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1B2A4A] via-[#2C3E6B] to-[#1B2A4A]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#B8962E22_0%,_transparent_60%)]" />
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#B8962E] to-transparent" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28 text-center">
          <Reveal as="span" className="inline-flex items-center gap-2 rounded-full border border-[#B8962E]/30 bg-white/5 px-4 py-1.5 text-xs font-medium text-[#D4AD3C]">
            <Sparkles className="h-3.5 w-3.5" />
            Built by an insurance agency, for insurance agencies
          </Reveal>
          <Reveal as="h1" delay={80} className="mx-auto mt-6 max-w-3xl text-4xl font-bold leading-tight text-white sm:text-5xl">
            Your book is worth more than your{' '}
            <span className="text-[#D4AD3C]">spreadsheet</span> is letting you keep
          </Reveal>
          <Reveal as="p" delay={160} className="mx-auto mt-5 max-w-2xl text-lg text-white/70">
            Every lapsed renewal, every un-worked coverage gap, every quote request that died in an
            inbox — that is commission you already earned and quietly lost. Agila Management Systems
            closes those gaps.
          </Reveal>
          <Reveal delay={240} className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <DemoLink>
              <Button size="lg" className="gap-2 bg-[#B8962E] font-semibold text-[#1B2A4A] hover:bg-[#D4AD3C]">
                Try the live demo <ArrowRight className="h-4 w-4" />
              </Button>
            </DemoLink>
            <a href="#book-demo">
              <Button
                size="lg"
                variant="outline"
                className="border-white/30 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              >
                Book a walkthrough
              </Button>
            </a>
          </Reveal>
          <Reveal as="p" delay={320} className="mt-4 text-xs text-white/50">
            No signup, no card — the demo opens instantly with sample data.
          </Reveal>
        </div>
      </section>

      {/* ============ TENSION ============ */}
      <section id="problem" className="scroll-mt-20 bg-[#F5F0E8]/40 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8B2D3B]">
              The daily reality
            </span>
            <h2 className="mt-3 text-3xl font-bold text-[#1B2A4A]">
              Nothing is broken. That is the problem.
            </h2>
            <p className="mt-3 text-[#1B2A4A]/60">
              An independent agency does not fail loudly — it leaks quietly. Here is where, and what
              Agila does about each one.
            </p>
          </div>

          <div className="mt-14 space-y-4">
            {PAINS.map((p) => (
              <div
                key={p.pain}
                className="grid gap-6 rounded-2xl border border-[#1B2A4A]/10 bg-white p-6 sm:p-8 lg:grid-cols-[1.15fr_1fr]"
              >
                <div>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[#8B2D3B]/10 text-[#8B2D3B]">
                      <p.icon className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#1B2A4A]">{p.pain}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-[#1B2A4A]/60">{p.detail}</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-[#B8962E]/25 bg-[#B8962E]/5 p-5">
                  <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#B8962E]">
                    <Check className="h-3 w-3" /> With Agila
                  </p>
                  <p className="mt-2 text-sm font-medium leading-relaxed text-[#1B2A4A]/85">{p.fix}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ ACTION ============ */}
      <section id="solution" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#B8962E]">
            The system
          </span>
          <h2 className="mt-3 text-3xl font-bold text-[#1B2A4A]">
            One platform that runs the whole agency
          </h2>
          <p className="mt-3 text-[#1B2A4A]/60">
            Not eight tools stitched together. Everything below shares the same client record.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {CAPABILITIES.map((f) => (
            <div
              key={f.title}
              className="group rounded-2xl border border-[#1B2A4A]/10 bg-[#F5F0E8]/40 p-6 transition-[border-color,background-color,box-shadow] duration-200 ease-out-strong hover:border-[#B8962E]/40 hover:bg-white hover:shadow-lg hover:shadow-[#1B2A4A]/5"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1B2A4A] text-[#D4AD3C] transition-transform duration-200 ease-out-strong motion-safe:group-hover:-translate-y-0.5">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold text-[#1B2A4A]">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#1B2A4A]/60">{f.body}</p>
            </div>
          ))}
        </div>

        {/* Live sandbox invitation */}
        <Reveal className="relative mt-16 overflow-hidden rounded-3xl bg-[#1B2A4A] p-8 sm:p-12">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_right,_#B8962E22_0%,_transparent_65%)]" />
          <div className="relative flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
            <div className="max-w-xl">
              <h3 className="text-2xl font-bold text-white">Do not take our word for it</h3>
              <p className="mt-3 text-white/70">
                Open a real instance of Agila loaded with a sample agency — 140 households, 198
                policies, live renewal alerts and commission totals. Click every screen, change
                anything: it resets hourly. Nothing to install, nothing to fill in.
              </p>
            </div>
            <DemoLink className="flex-shrink-0">
              <Button size="lg" className="gap-2 bg-[#B8962E] font-semibold text-[#1B2A4A] hover:bg-[#D4AD3C]">
                Open the live demo <ArrowRight className="h-4 w-4" />
              </Button>
            </DemoLink>
          </div>
        </Reveal>
      </section>

      {/* ============ GROWTH ============ */}
      <section id="results" className="scroll-mt-20 bg-[#F5F0E8]/50 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#B8962E]">
              What changes
            </span>
            <h2 className="mt-3 text-3xl font-bold text-[#1B2A4A]">Your first 90 days</h2>
            <p className="mt-3 text-[#1B2A4A]/60">
              Retention and cross-sell are not growth hacks — they are the compounding parts of a book.
            </p>
          </div>
          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {OUTCOMES.map((o) => (
              <div key={o.stat} className="rounded-2xl border border-[#1B2A4A]/10 bg-white p-7">
                <p className="text-sm font-bold uppercase tracking-wide text-[#B8962E]">{o.stat}</p>
                <h3 className="mt-2 text-lg font-semibold text-[#1B2A4A]">{o.label}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#1B2A4A]/60">{o.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ PRICING ============ */}
      <section id="pricing" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#B8962E]">
            Pricing
          </span>
          <h2 className="mt-3 text-3xl font-bold text-[#1B2A4A]">
            A fraction of what one lost account costs you
          </h2>
          <p className="mt-3 text-[#1B2A4A]/60">
            Comparable agency systems start north of $300/month. Agila does the core work for less,
            because it was built to run one agency well before it was sold to others.
          </p>
        </div>

        {/* Founding-agency offer */}
        <Reveal className="mt-12 overflow-hidden rounded-2xl border-2 border-[#B8962E] bg-gradient-to-br from-[#B8962E]/10 to-transparent p-6 sm:p-8">
          <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#8B2D3B] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                <Sparkles className="h-3 w-3" /> Founding agencies · first 20 only
              </span>
              <h3 className="mt-3 text-2xl font-bold text-[#1B2A4A]">
                $49<span className="text-base font-semibold text-[#1B2A4A]/60">/month, locked for life</span>
              </h3>
              <p className="mt-2 max-w-xl text-sm text-[#1B2A4A]/70">
                Full Agency-tier access at the founding rate — permanently, even as the price rises.
                You get direct roadmap input and hands-on onboarding; we get your honest feedback.
              </p>
            </div>
            <a href="#book-demo" className="flex-shrink-0">
              <Button size="lg" className="gap-2 bg-[#1B2A4A] font-semibold text-white hover:bg-[#2C3E6B]">
                Claim a founding seat <ArrowRight className="h-4 w-4" />
              </Button>
            </a>
          </div>
        </Reveal>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          {PLANS.map((p, i) => (
            <Reveal
              key={p.name}
              delay={staggerDelay(i, 80)}
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
              <h3 className={`text-xl font-bold ${p.highlight ? 'text-white' : 'text-[#1B2A4A]'}`}>
                {p.name}
              </h3>
              <p className={`mt-1 text-sm ${p.highlight ? 'text-white/70' : 'text-[#1B2A4A]/60'}`}>
                {p.tagline}
              </p>
              <p className="mt-5 flex items-baseline gap-1">
                <span className={`text-4xl font-bold ${p.highlight ? 'text-[#D4AD3C]' : 'text-[#1B2A4A]'}`}>
                  {p.price}
                </span>
                <span className={`text-sm ${p.highlight ? 'text-white/60' : 'text-[#1B2A4A]/55'}`}>
                  {p.cadence}
                </span>
              </p>
              <p className={`mt-1 text-xs ${p.highlight ? 'text-white/50' : 'text-[#1B2A4A]/45'}`}>
                {p.annual}
              </p>
              <ul className="mt-6 flex-1 space-y-3">
                {p.features.map((f) => (
                  <li
                    key={f}
                    className={`flex items-start gap-2.5 text-sm ${
                      p.highlight ? 'text-white/85' : 'text-[#1B2A4A]/75'
                    }`}
                  >
                    <Check
                      className={`mt-0.5 h-4 w-4 flex-shrink-0 ${
                        p.highlight ? 'text-[#D4AD3C]' : 'text-[#B8962E]'
                      }`}
                    />
                    {f}
                  </li>
                ))}
              </ul>
              <a href="#book-demo" className="mt-8">
                <Button
                  className={`w-full ${
                    p.highlight
                      ? 'bg-[#B8962E] font-semibold text-[#1B2A4A] hover:bg-[#D4AD3C]'
                      : 'bg-[#1B2A4A] text-white hover:bg-[#2C3E6B]'
                  }`}
                >
                  Get started
                </Button>
              </a>
            </Reveal>
          ))}
        </div>
        <p className="mt-6 text-center text-xs text-[#1B2A4A]/50">
          All plans include the quote request inbox and automated renewals. Data migration available
          as a one-time service on Solo and Agency.
        </p>
      </section>

      {/* ============ EMOTION ============ */}
      <section className="bg-[#1B2A4A] py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <div className="mx-auto mb-8 h-px w-16 bg-gradient-to-r from-transparent via-[#B8962E] to-transparent" />
          <h2 className="text-3xl font-bold text-white">Why we built this</h2>
          <p className="mt-5 text-lg leading-relaxed text-white/70">
            Agila started as the system we needed to run our own agency. We were the ones losing
            renewals to a spreadsheet, re-typing quote requests at 9pm, guessing what the book was
            worth. Nothing on the market fit an independent shop — the good systems were priced for
            carriers, and the affordable ones were not built for insurance at all.
          </p>
          <p className="mt-5 text-lg leading-relaxed text-white/70">
            So we built it. Every screen exists because a real agency needed it on a real Tuesday.
            Now it is yours too.
          </p>
          <p className="mt-8 text-sm font-medium text-[#D4AD3C]">
            An independent agency should not lose business to bad software.
          </p>
        </div>
      </section>

      {/* ============ BOOK A DEMO ============ */}
      <section id="book-demo" className="scroll-mt-20 bg-[#F5F0E8]/50 py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold text-[#1B2A4A]">Let&apos;s look at your book together</h2>
            <p className="mt-4 text-[#1B2A4A]/60">
              Tell us a little about your agency and we&apos;ll walk you through Agila on a live call —
              or get you set up with a founding seat if you already know what you want.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                'A real guided tour, not a slide deck',
                'Straight answers on pricing and migration',
                'No obligation, no pressure',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-[#1B2A4A]/80">
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#B8962E]" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-8 rounded-xl border border-[#1B2A4A]/10 bg-white p-5">
              <p className="text-sm font-medium text-[#1B2A4A]">Prefer to poke around first?</p>
              <p className="mt-1 text-sm text-[#1B2A4A]/60">
                The live demo opens instantly — no form required.
              </p>
              <DemoLink>
                <Button variant="outline" className="mt-3 gap-2 border-[#1B2A4A]/20 text-[#1B2A4A]">
                  Open the demo <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </DemoLink>
            </div>
          </div>
          <BookDemoForm />
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-20 sm:px-6">
        <h2 className="text-center text-3xl font-bold text-[#1B2A4A]">Questions, answered</h2>
        <Accordion type="single" collapsible className="mt-10">
          {FAQS.map((f, i) => (
            <AccordionItem key={i} value={`item-${i}`}>
              <AccordionTrigger className="text-left text-[#1B2A4A]">{f.q}</AccordionTrigger>
              <AccordionContent className="text-[#1B2A4A]/70">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="border-t border-[#1B2A4A]/10 bg-[#1B2A4A]">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <AgilaWordmark size="sm" onDark />
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-white/60">
              <a href="#problem" className="hover:text-white">The problem</a>
              <a href="#solution" className="hover:text-white">Solution</a>
              <a href="#pricing" className="hover:text-white">Pricing</a>
              <DemoLink className="hover:text-white">Live demo</DemoLink>
              <LoginLink className="hover:text-white">Log in</LoginLink>
            </div>
          </div>
          <div className="mt-8 border-t border-white/10 pt-6 text-center text-xs text-white/40">
            © {new Date().getFullYear()} Agila Management Systems. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
