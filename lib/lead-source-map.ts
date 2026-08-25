// Pure conversion logic, deliberately free of imports.
//
// Kept separate from convert-lead.ts so it can be unit-tested directly with
// `node --test` (no path-alias resolution, no Supabase client, no env vars).
// The rules here are the ones that must never silently drift, so they are the
// ones that carry tests.

// The exact set clients_source_check permits. '' is included: the constraint
// allows it and 1,977 existing clients use it, but lib/types.ts CLIENT_SOURCES
// omits it because it is not a pickable option in the UI.
export const ALLOWED_CLIENT_SOURCES = [
  '', 'Referral', 'Web', 'Walk-in', 'Phone', 'Facebook', 'Google Ads', 'Other',
] as const;

// Map, never pass through — and map conservatively.
//
// Leads carry free-text acquisition detail ("CA SOS", "FACC Cerritos",
// "Google Maps"), none of which the constraint accepts. The temptation is to
// pattern-match generously, but that invents attribution: an earlier version
// routed anything containing "google" to 'Google Ads', which would have
// stamped 33 production leads — Google Maps, Google Search, plain Google — as
// paid advertising. Every one is an organic listing or a directory scrape.
// Fabricated marketing attribution is worse than coarse attribution, so only
// two mappings are asserted and everything else lands on 'Other'.
//
// The granular value is not lost: it is written verbatim into the client's
// notes by buildConversionNote().
export function mapLeadSourceToClientSource(leadSource: string | null | undefined): string {
  const s = (leadSource ?? '').trim().toLowerCase();
  if (!s) return '';
  if (s === 'web quote') return 'Web';
  if (s.startsWith('referral')) return 'Referral';
  return 'Other';
}

// "Converted from lead. Original source: CA SOS." — appended, never replacing,
// so a lead that already carried notes keeps them.
export function buildConversionNote(lead: {
  lead_source?: string | null;
  notes?: string | null;
}): string {
  const original = (lead.lead_source ?? '').trim();
  const line = original
    ? `Converted from lead. Original source: ${original}.`
    : 'Converted from lead.';
  const existing = (lead.notes ?? '').trim();
  return existing ? `${existing}\n\n${line}` : line;
}
