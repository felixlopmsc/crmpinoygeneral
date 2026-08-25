import { supabase } from '@/lib/supabase';
import { friendlyError } from '@/lib/errors';
import type { Lead } from '@/lib/types';

// clients.source is constrained to this exact set (clients_source_check).
// Anything else is rejected by the database, so conversion must map into it.
const CLIENT_SOURCES = ['', 'Referral', 'Web', 'Walk-in', 'Phone', 'Facebook', 'Google Ads', 'Other'] as const;

// Leads carry a free-text lead_source ("Web Quote", "Cold Call", "Chamber
// Event"…). Carrying the real acquisition channel across is more useful than
// stamping every converted client with the fact that it was once a lead —
// clients.source_lead_id already records that. Anything unrecognised lands on
// 'Other' rather than failing the insert.
export function mapLeadSourceToClientSource(leadSource: string | null | undefined): string {
  const s = (leadSource ?? '').trim().toLowerCase();
  if (!s) return '';

  if (CLIENT_SOURCES.some((c) => c.toLowerCase() === s)) {
    return CLIENT_SOURCES.find((c) => c.toLowerCase() === s)!;
  }
  if (s.includes('referral')) return 'Referral';
  if (s.includes('walk')) return 'Walk-in';
  if (s.includes('phone') || s.includes('call')) return 'Phone';
  if (s.includes('facebook') || s.includes('instagram') || s.includes('meta')) return 'Facebook';
  if (s.includes('google') || s.includes('adwords')) return 'Google Ads';
  if (s.includes('web') || s.includes('online') || s.includes('site') || s.includes('quote')) return 'Web';

  return 'Other';
}

export type ConvertResult =
  | { ok: true; clientId: string }
  | { ok: false; message: string };

// Single implementation shared by the leads list and the lead detail page.
// Previously each page had its own copy, and both wrote an invalid source, so
// conversion failed everywhere with a raw constraint error.
export async function convertLeadToClient(lead: Lead): Promise<ConvertResult> {
  const { data, error } = await supabase
    .from('clients')
    .insert({
      first_name: lead.first_name,
      last_name: lead.last_name,
      phone: lead.phone || '',
      email: lead.email || '',
      address_zip: lead.address_zip || '',
      source: mapLeadSourceToClientSource(lead.lead_source),
      source_lead_id: lead.id,
      status: 'Active',
    })
    .select('id')
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      message: friendlyError(error, {
        action: 'convert this lead',
        overrides: {
          '23505': 'A client with these contact details already exists. Open that client instead of converting again.',
        },
      }),
    };
  }

  // Insert reported success but returned nothing: RLS allowed the write and
  // then hid the row, or the row vanished between the two. Either way there is
  // no client to send anyone to.
  if (!data?.id) {
    return { ok: false, message: 'The client record could not be opened after converting. Please check the Clients list.' };
  }

  // Best-effort: the client exists, which is the part that matters. If this
  // fails the lead simply still reads as open, and converting again will be
  // caught by the duplicate check above.
  await supabase
    .from('leads')
    .update({ status: 'converted', updated_at: new Date().toISOString() })
    .eq('id', lead.id);

  return { ok: true, clientId: data.id };
}
