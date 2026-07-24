import type { QuoteRequest } from '@/lib/types';
import { QUOTE_COVERAGE_MAP, QUOTE_FORM_DATA_COLUMNS, COMMERCIAL_FORM_DATA_COLUMNS } from '@/lib/types';

// Turns a snake_case / camelCase key into a human label, e.g.
// 'liability_limits' -> 'Liability Limits', 'yearBuilt' -> 'Year Built'.
export function humanizeKey(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

export function isEmptyObject(v: unknown): boolean {
  return !v || typeof v !== 'object' || Object.keys(v as object).length === 0;
}

// Formats a leaf value for display. Returns null when the value is empty and
// should be hidden entirely.
export function formatLeafValue(v: unknown): string | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'string') return v;
  return null;
}

// Picks the form_data_* column to render for a quote: the mapped column for the
// coverage_type if it has data, otherwise the first non-empty form_data_*
// column. Returns the column key and whether the coverage is commercial.
export function resolveCoverageColumn(
  quote: QuoteRequest
): { column: keyof QuoteRequest; commercial: boolean } | null {
  const mapped = quote.coverage_type ? QUOTE_COVERAGE_MAP[quote.coverage_type] : undefined;
  if (mapped && !isEmptyObject(quote[mapped.column])) {
    return mapped;
  }
  // Fallback: first populated form_data_* column.
  for (const col of QUOTE_FORM_DATA_COLUMNS) {
    if (!isEmptyObject(quote[col])) {
      return { column: col, commercial: COMMERCIAL_FORM_DATA_COLUMNS.includes(col) };
    }
  }
  return mapped ?? null;
}
