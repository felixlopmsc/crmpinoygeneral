import Image from 'next/image';
import { cn } from '@/lib/utils';

// Agila Management Systems lockup: eagle mark + stacked wordmark.
// The wordmark mirrors the concept art — heavy geometric sans (Montserrat 800,
// already the app font) with "AGILA" on top and "MANAGEMENT SYSTEMS" tracked
// out beneath it.
//
// Mark and wordmark are sized to the same optical height on purpose. Rendered
// side by side at mismatched heights this reads as an icon with text glued to
// it; matched, it reads as one lockup. The mark floor is 44px — below that the
// eagle inside the disc stops resolving and the whole thing reads as a gold
// smudge. That floor was measured, not assumed.
export default function AgilaWordmark({
  size = 'md',
  onDark = false,
  className,
}: {
  size?: 'sm' | 'md' | 'lg';
  onDark?: boolean;
  className?: string;
}) {
  const mark = { sm: 44, md: 56, lg: 72 }[size];
  const primary = { sm: 'text-lg', md: 'text-2xl', lg: 'text-3xl' }[size];
  const secondary = { sm: 'text-[8px]', md: 'text-[9px]', lg: 'text-[11px]' }[size];

  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      {/* Decorative: the wordmark beside it already names the product, so an
          alt here would announce "Agila Management Systems" twice. */}
      <Image
        src="/agila-glyph.svg"
        alt=""
        aria-hidden="true"
        width={mark}
        height={mark}
        className="flex-shrink-0"
        priority
      />
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            'font-extrabold tracking-tight',
            primary,
            onDark ? 'text-white' : 'text-[#1B2A4A]'
          )}
        >
          AGILA
        </span>
        <span
          className={cn(
            'mt-[3px] font-semibold uppercase',
            secondary,
            onDark ? 'text-[#D4AD3C]' : 'text-[#B8962E]'
          )}
          style={{ letterSpacing: '0.18em' }}
        >
          Management Systems
        </span>
      </span>
    </span>
  );
}
