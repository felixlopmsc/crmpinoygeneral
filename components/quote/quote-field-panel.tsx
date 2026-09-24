'use client';

import { useCallback, useState } from 'react';
import { Copy, Check, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import type { QuoteFieldGroup } from '@/lib/quote-fields';
import { quoteFieldsToText } from '@/lib/quote-fields';

/**
 * Renders a quote request as flat, individually copyable fields — the view
 * you work from with a carrier portal open in the next window.
 *
 * Copy is WYSIWYG: the text placed on the clipboard is exactly the text on
 * screen. That matters more than it sounds. If the phone read (909) 569-8115
 * but copied as 9095698115, nobody would trust any of the other fields, and
 * the point of this panel is that you can paste without re-reading.
 */

async function copyText(text: string, what: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${what} copied`);
  } catch {
    // Clipboard access needs a secure context and can be refused outright.
    // Say so rather than showing a success toast for something that did not
    // happen — a silent no-op here means pasting whatever was on the
    // clipboard before, into a carrier portal.
    toast.error('Could not copy — select the text and use Ctrl+C');
  }
}

function CopyButton({ text, what, className }: { text: string; what: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  const onClick = useCallback(async () => {
    await copyText(text, what);
    setCopied(true);
    // Long enough to register, short enough that the row is ready again by
    // the time you have pasted and come back for the next field.
    setTimeout(() => setCopied(false), 1200);
  }, [text, what]);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Copy ${what}`}
      className={`shrink-0 rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 ${className || ''}`}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

interface Props {
  groups: QuoteFieldGroup[];
  /** Wraps the panel in a collapsed header — used on lead and client records. */
  collapsible?: boolean;
  defaultOpen?: boolean;
  /** Header text when collapsible. */
  title?: string;
  subtitle?: string;
}

export function QuoteFieldPanel({ groups, collapsible = false, defaultOpen = false, title, subtitle }: Props) {
  const [open, setOpen] = useState(collapsible ? defaultOpen : true);

  if (groups.length === 0) {
    return <p className="text-sm text-muted-foreground">Nothing was captured for this quote.</p>;
  }

  const body = (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button
          size="sm"
          variant="outline"
          onClick={() => copyText(quoteFieldsToText(groups), 'All fields')}
        >
          <Copy className="mr-2 h-3.5 w-3.5" /> Copy all fields
        </Button>
      </div>

      {groups.map((group) => (
        <div key={group.title}>
          <div className="mb-1.5 flex items-center gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">{group.title}</h3>
            <CopyButton
              text={quoteFieldsToText([group])}
              what={group.title}
              className="opacity-60 hover:opacity-100"
            />
          </div>
          <dl className="divide-y rounded-lg border">
            {group.fields.map((field) => (
              <div
                key={`${group.title}-${field.label}`}
                className="group flex items-start gap-3 px-3 py-2 hover:bg-gray-50/70"
              >
                <dt className="w-[38%] shrink-0 text-sm text-gray-500">{field.label}</dt>
                {/* select-all makes one click grab the whole value for people
                    who would rather keyboard-copy than reach for the button. */}
                <dd
                  className={`flex-1 select-all break-words text-sm text-gray-900 ${
                    field.mono ? 'font-mono tracking-tight' : ''
                  }`}
                >
                  {field.value}
                </dd>
                <CopyButton text={field.value} what={field.label} />
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );

  if (!collapsible) return body;

  return (
    <div className="rounded-lg border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-50/70"
      >
        <span>
          <span className="text-sm font-medium text-gray-900">{title || 'Quote request details'}</span>
          {subtitle && <span className="ml-2 text-xs text-muted-foreground">{subtitle}</span>}
        </span>
        {open ? (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-400" />
        )}
      </button>
      {open && <div className="border-t px-4 py-4">{body}</div>}
    </div>
  );
}
