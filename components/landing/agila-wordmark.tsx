import Image from 'next/image';
import { cn } from '@/lib/utils';

// Agila Management Systems lockup: eagle mark + stacked wordmark.
// The wordmark mirrors the concept art — heavy geometric sans (Montserrat 800,
// already the app font) with "AGILA" on top and "MANAGEMENT SYSTEMS" tracked
// out beneath it.
export default function AgilaWordmark({
  size = 'md',
  onDark = false,
  className,
}: {
  size?: 'sm' | 'md' | 'lg';
  onDark?: boolean;
  className?: string;
}) {
  const mark = { sm: 30, md: 38, lg: 52 }[size];
  const primary = { sm: 'text-base', md: 'text-xl', lg: 'text-3xl' }[size];
  const secondary = { sm: 'text-[7px]', md: 'text-[8px]', lg: 'text-[11px]' }[size];

  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <Image
        src="/Copy_of_Pinoy_General_Insurance_Logo_(800_×_800_px).png"
        alt="Agila Management Systems"
        width={mark}
        height={mark}
        className="flex-shrink-0 rounded-lg"
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
