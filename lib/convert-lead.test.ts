import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ALLOWED_CLIENT_SOURCES,
  buildConversionNote,
  mapLeadSourceToClientSource,
} from './lead-source-map.ts';

// Every distinct lead_source in production, captured 2026-08-21 with:
//   select distinct lead_source, count(*) from public.leads group by 1;
// 160 leads, 20 distinct values, none of which clients_source_check accepts —
// which is why conversion failed for every lead before this mapper existed.
// If a new source appears in production, add it here: this list is the whole
// point of the test.
const PRODUCTION_LEAD_SOURCES: ReadonlyArray<readonly [string, number]> = [
  ['CA SOS', 75],
  ['Google Maps', 25],
  ['FACC Cerritos', 15],
  ['La Habra Business License', 10],
  ['Yelp', 8],
  ['Google Search', 5],
  ['Norwalk Chamber of Commerce Directory', 4],
  ['City of Cypress New Business List', 3],
  ['Google', 2],
  ['Cypress Business License Listing', 2],
  ['Zillow', 2],
  ['FACC Cerritos Member Directory / BBB', 1],
  ['Google Search / VoyageLA', 1],
  ['CA SOS / Downey Patriot FBN', 1],
  ['FACC Cerritos Member Directory / VoyageLA', 1],
  ['Web Quote', 1],
  ['WhatNow Orange County', 1],
  ['VoyageLA Rising Stars feature / Google', 1],
  ['FACC Cerritos Member Directory / Homes.com', 1],
  ['City of Cerritos Business Spotlight / Asian Journal', 1],
];

const allowed = new Set<string>(ALLOWED_CLIENT_SOURCES);

test('every production lead_source maps to a value clients_source_check accepts', () => {
  for (const [source] of PRODUCTION_LEAD_SOURCES) {
    const mapped = mapLeadSourceToClientSource(source);
    assert.ok(
      allowed.has(mapped),
      `"${source}" mapped to "${mapped}", which clients_source_check would reject`,
    );
  }
});

test('all 160 production leads are covered', () => {
  const total = PRODUCTION_LEAD_SOURCES.reduce((n, [, count]) => n + count, 0);
  assert.equal(total, 160);
});

test('absent and blank sources map to the permitted empty string', () => {
  for (const input of [null, undefined, '', '   ']) {
    assert.equal(mapLeadSourceToClientSource(input), '');
  }
});

test('the two asserted mappings hold, case- and space-insensitively', () => {
  for (const input of ['Web Quote', 'web quote', '  WEB QUOTE  ']) {
    assert.equal(mapLeadSourceToClientSource(input), 'Web');
  }
  for (const input of ['Referral', 'referral', 'Referral - existing client', 'REFERRALS']) {
    assert.equal(mapLeadSourceToClientSource(input), 'Referral');
  }
});

// The regression this file exists to prevent. An earlier mapper matched any
// substring "google" to 'Google Ads', inventing paid-advertising attribution
// for 33 production leads that came from organic listings and scrapes.
test('organic Google sources are never attributed to Google Ads', () => {
  const organic = ['Google Maps', 'Google Search', 'Google', 'Google Search / VoyageLA', 'VoyageLA Rising Stars feature / Google'];
  for (const input of organic) {
    assert.equal(
      mapLeadSourceToClientSource(input),
      'Other',
      `"${input}" must not be recorded as paid advertising`,
    );
  }
});

test('unrecognised sources fall back to Other rather than passing through', () => {
  for (const input of ['CA SOS', 'FACC Cerritos', 'Yelp', 'Zillow', 'something new']) {
    assert.equal(mapLeadSourceToClientSource(input), 'Other');
  }
});

test('the granular source survives verbatim in the conversion note', () => {
  assert.equal(
    buildConversionNote({ lead_source: 'CA SOS', notes: null }),
    'Converted from lead. Original source: CA SOS.',
  );
  assert.equal(
    buildConversionNote({ lead_source: 'FACC Cerritos Member Directory / BBB', notes: '' }),
    'Converted from lead. Original source: FACC Cerritos Member Directory / BBB.',
  );
});

test('existing lead notes are preserved, not overwritten', () => {
  const note = buildConversionNote({ lead_source: 'Yelp', notes: 'Called twice, left voicemail.' });
  assert.match(note, /^Called twice, left voicemail\./);
  assert.match(note, /Original source: Yelp\.$/);
});

test('a lead with no source still gets a conversion note', () => {
  assert.equal(buildConversionNote({ lead_source: null, notes: null }), 'Converted from lead.');
});
