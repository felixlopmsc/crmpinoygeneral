import { supabase } from '@/lib/supabase';
import { friendlyError } from '@/lib/errors';
import type { Lead } from '@/lib/types';
import { buildConversionNote, mapLeadSourceToClientSource } from '@/lib/lead-source-map';

export {
  ALLOWED_CLIENT_SOURCES,
  buildConversionNote,
  mapLeadSourceToClientSource,
} from '@/lib/lead-source-map';

export type ConvertResult =
  | { ok: true; clientId: string }
  | { ok: false; message: string };

// Single implementation shared by the leads list and the lead detail page.
// Each page previously held its own copy, and both wrote an invalid source, so
// conversion failed for every one of the 160 production leads.
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
      notes: buildConversionNote(lead),
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
  // then hid the row, or it vanished in between. Either way there is no client
  // to navigate to, so say so rather than routing into a blank page.
  if (!data?.id) {
    return { ok: false, message: 'The client record could not be opened after converting. Please check the Clients list.' };
  }

  // Best-effort: the client exists, which is the part that matters. If this
  // fails the lead still reads as open, and converting again is caught by the
  // duplicate check above.
  await supabase
    .from('leads')
    .update({ status: 'converted', updated_at: new Date().toISOString() })
    .eq('id', lead.id);

  return { ok: true, clientId: data.id };
}
