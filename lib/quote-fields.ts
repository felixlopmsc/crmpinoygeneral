import type { QuoteRequest } from '@/lib/types';
import { formatDate, formatPhone, formatCurrency } from '@/lib/format';
import { humanizeKey, formatLeafValue, isEmptyObject, resolveCoverageColumn } from '@/lib/quote-format';

/**
 * Flattens a quote request into ordered, labelled groups for transcription
 * into a carrier portal (Mercury, Progressive, ...).
 *
 * This is deliberately a different shape from what the drawer renders. The
 * drawer is for skimming: it nests, truncates and hides. Someone rekeying a
 * quote needs the opposite — every captured value, in full, in the order a
 * carrier asks for it, each one individually copyable.
 *
 * Pure and free of React so the same field list drives the detail page, the
 * panel embedded on a lead or client, and the plain-text "copy all" block.
 * One source means the text you paste cannot drift from the text you read.
 */

export interface QuoteField {
  label: string;
  /** Display text. Copy is WYSIWYG — what is shown is exactly what is copied. */
  value: string;
  /** Identifiers (VIN, licence, FEIN, ZIP) render monospace: they get read character by character. */
  mono?: boolean;
}

export interface QuoteFieldGroup {
  title: string;
  fields: QuoteField[];
}

/** Keys whose values are identifiers rather than prose. */
const MONO_KEY = /vin|licen[cs]e|policy_number|fein|zip|account|claim/i;

/**
 * Turns one jsonb value into groups.
 *
 * Arrays of objects become a group each — "Driver 1", "Vehicle 2" — because
 * that is how a carrier portal asks for them, one entity at a time. The
 * singularisation is naive (drop a trailing "s") and deliberately so: these
 * keys come from the wizard's own vocabulary (drivers, vehicles, locations),
 * not from arbitrary input.
 */
function groupsFromValue(title: string, value: unknown): QuoteFieldGroup[] {
  if (value === null || value === undefined) return [];

  if (Array.isArray(value)) {
    const singular = title.replace(/s$/, '');
    return value.flatMap((item, i) => {
      const label = `${singular} ${i + 1}`;
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        return groupsFromValue(label, item);
      }
      const leaf = formatLeafValue(item);
      return leaf ? [{ title, fields: [{ label, value: leaf }] }] : [];
    });
  }

  if (typeof value === 'object') {
    const own: QuoteField[] = [];
    const nested: QuoteFieldGroup[] = [];

    for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
      if (raw && typeof raw === 'object') {
        // A nested object or array becomes its own group, so the flat list
        // never shows a field whose value reads "[object Object]".
        nested.push(...groupsFromValue(humanizeKey(key), raw));
        continue;
      }
      const leaf = formatLeafValue(raw);
      if (leaf !== null) own.push({ label: humanizeKey(key), value: leaf, mono: MONO_KEY.test(key) });
    }

    return [...(own.length ? [{ title, fields: own }] : []), ...nested];
  }

  const leaf = formatLeafValue(value);
  return leaf ? [{ title, fields: [{ label: title, value: leaf }] }] : [];
}

/** Drops empty groups so a sparse quote does not render a wall of headings. */
function compact(groups: QuoteFieldGroup[]): QuoteFieldGroup[] {
  return groups.filter((g) => g.fields.length > 0);
}

export function buildQuoteFieldGroups(q: QuoteRequest): QuoteFieldGroup[] {
  const coverage = resolveCoverageColumn(q);

  const applicant: QuoteField[] = [];
  const push = (label: string, value: string | null | undefined, mono?: boolean) => {
    if (value) applicant.push({ label, value, mono });
  };

  push('Full Name', [q.first_name, q.last_name].filter(Boolean).join(' ') || null);
  push('Email', q.email);
  push('Phone', q.phone ? formatPhone(q.phone) : null);
  push('Date of Birth', q.date_of_birth ? formatDate(q.date_of_birth) : null);
  push('Street', q.address_street);
  push('City', q.address_city);
  push('State', q.address_state);
  push('ZIP', q.address_zip, true);

  const business: QuoteField[] = [];
  if (coverage?.commercial) {
    const b = (label: string, value: string | number | null | undefined, mono?: boolean) => {
      if (value !== null && value !== undefined && value !== '') {
        business.push({ label, value: String(value), mono });
      }
    };
    b('Legal Name', q.business_legal_name);
    b('DBA', q.business_dba);
    b('Entity Type', q.business_entity_type);
    b('FEIN', q.business_fein, true);
    b('Year Established', q.business_year_est);
    b('Business Phone', q.business_phone ? formatPhone(q.business_phone) : null);
    b('Website', q.business_website);
    b('Description', q.business_description);
  }

  const prior: QuoteField[] = [];
  if (q.prior_carrier) prior.push({ label: 'Prior Carrier', value: q.prior_carrier });
  if (q.prior_policy_expiration) {
    prior.push({ label: 'Policy Expiration', value: formatDate(q.prior_policy_expiration) });
  }
  if (q.years_continuously_insured != null) {
    prior.push({ label: 'Years Insured', value: String(q.years_continuously_insured) });
  }

  const loss: QuoteField[] = [];
  if (q.has_prior_losses != null) {
    loss.push({ label: 'Prior Losses', value: q.has_prior_losses ? 'Yes' : 'No' });
  }
  if (q.prior_cancellation != null) {
    loss.push({ label: 'Prior Cancellation', value: q.prior_cancellation ? 'Yes' : 'No' });
  }
  if (q.prior_cancellation_explanation) {
    loss.push({ label: 'Cancellation Explanation', value: q.prior_cancellation_explanation });
  }

  const estimate: QuoteField[] = [];
  if (q.estimate_low != null && q.estimate_high != null) {
    estimate.push({
      label: 'Estimate Range',
      value: `${formatCurrency(Number(q.estimate_low))}–${formatCurrency(Number(q.estimate_high))}/yr`,
    });
  }

  return compact([
    { title: 'Submission', fields: [
      { label: 'Coverage Type', value: q.coverage_type || '—' },
      { label: 'Reference', value: q.id.slice(0, 8).toUpperCase(), mono: true },
    ] },
    { title: 'Applicant', fields: applicant },
    { title: 'Business', fields: business },
    ...(coverage && !isEmptyObject(q[coverage.column])
      ? groupsFromValue('Coverage Details', q[coverage.column])
      : []),
    ...(Array.isArray(q.loss_history) && q.loss_history.length > 0
      ? groupsFromValue('Loss History', q.loss_history)
      : []),
    { title: 'Loss History Summary', fields: loss },
    { title: 'Prior Insurance', fields: prior },
    { title: 'Estimate', fields: estimate },
  ]);
}

/**
 * The plain-text rendering used by "Copy all". Tab between label and value so
 * it lands as two columns when pasted into a spreadsheet, and still reads as
 * a list when pasted into a text box or an email.
 */
export function quoteFieldsToText(groups: QuoteFieldGroup[]): string {
  return groups
    .map((g) => [g.title.toUpperCase(), ...g.fields.map((f) => `${f.label}\t${f.value}`)].join('\n'))
    .join('\n\n');
}
