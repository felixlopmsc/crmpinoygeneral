import Link from 'next/link';
import AgilaWordmark from '@/components/landing/agila-wordmark';

/**
 * Shared shell for the Terms and Privacy pages.
 *
 * Deliberately plain: these are read under time pressure by someone deciding
 * whether to hand us their agency's client list, and by their lawyer. Long
 * measure, real headings, no marketing furniture.
 */
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-[#1B2A4A]/10 bg-[#1B2A4A]">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-5 sm:px-6">
          <Link href="/" aria-label="Agila Management Systems home">
            <AgilaWordmark size="sm" onDark />
          </Link>
          <Link href="/" className="text-sm text-white/60 hover:text-white">
            ← Back to site
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <h1 className="text-3xl font-bold text-[#1B2A4A] sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-[#1B2A4A]/50">Last updated {updated}</p>
        <div className="legal-prose mt-10 space-y-8 text-[15px] leading-relaxed text-[#1B2A4A]/80">
          {children}
        </div>
      </main>

      <footer className="border-t border-[#1B2A4A]/10">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-6 px-4 py-8 text-sm text-[#1B2A4A]/50 sm:px-6">
          <Link href="/terms" className="hover:text-[#1B2A4A]">Terms of Service</Link>
          <Link href="/privacy" className="hover:text-[#1B2A4A]">Privacy Policy</Link>
          <a href="mailto:info@pinoygeneralinsurance.com" className="hover:text-[#1B2A4A]">
            info@pinoygeneralinsurance.com
          </a>
        </div>
      </footer>
    </div>
  );
}

/** Section heading, so both documents stay structurally identical. */
export function Section({ id, heading, children }: { id: string; heading: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-lg font-bold text-[#1B2A4A]">{heading}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}
