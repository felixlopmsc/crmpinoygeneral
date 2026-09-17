import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  activePolicyScope,
  isoEndOfToday,
  isoToday,
  livePolicyScope,
  openTaskScope,
  quoteRequestInboxScope,
  tasksNeedingAttentionScope,
} from './scopes.ts';

// A stand-in for a Supabase query builder that records the filters applied to
// it. The scopes only ever chain filter methods, so recording the calls is
// enough to assert what they produce — and lets these run with no network,
// no client and no env vars.
class FakeQuery {
  calls: string[] = [];
  is(column: string, value: null) { this.calls.push(`is(${column},${String(value)})`); return this; }
  not(column: string, op: string, value: unknown) { this.calls.push(`not(${column},${op},${String(value)})`); return this; }
  gte(column: string, value: string) { this.calls.push(`gte(${column},${value})`); return this; }
  lt(column: string, value: string) { this.calls.push(`lt(${column},${value})`); return this; }
  or(filters: string) { this.calls.push(`or(${filters})`); return this; }
  ilike(column: string, pattern: string) { this.calls.push(`ilike(${column},${pattern})`); return this; }
}

test('quote request inbox scope excludes soft-deleted and internal test rows', () => {
  const q = quoteRequestInboxScope(new FakeQuery());
  assert.deepEqual(q.calls, ['is(deleted_at,null)', 'not(is_test,is,true)']);
});

// The regression this file exists to prevent. The badge and the list were
// written separately and drifted: the badge showed 9 while the inbox showed 0.
test('the badge and the list receive byte-identical filters', () => {
  const badge = quoteRequestInboxScope(new FakeQuery());
  const list = quoteRequestInboxScope(new FakeQuery());
  assert.deepEqual(badge.calls, list.calls);
});

// eq('is_test', false) drops rows where is_test IS NULL. Nullable column, so
// the null-safe form is the correct one even though production has no NULLs
// today.
test('is_test is tested null-safely, never with equality', () => {
  const q = quoteRequestInboxScope(new FakeQuery());
  assert.ok(
    q.calls.some((c) => c === 'not(is_test,is,true)'),
    'expected IS NOT TRUE',
  );
  assert.ok(
    !q.calls.some((c) => c.startsWith('eq(is_test')),
    'equality on a nullable flag silently hides NULL rows',
  );
});

test('active policy scope matches get_active_policy_count(): status, expiry and soft delete', () => {
  const q = activePolicyScope(new FakeQuery(), '2026-08-21');
  assert.deepEqual(q.calls, [
    'ilike(status,Active)',
    'is(deleted_at,null)',
    'gte(expiration_date,2026-08-21)',
  ]);
});

// The card rendered the RPC's count while its trend arrow came from a raw
// count that ignored expiry and soft deletes — 169 decorated by a trend
// computed over 170.
test('a current and a prior-period query get the same active definition', () => {
  const today = isoToday(new Date('2026-08-21T12:00:00Z'));
  const current = activePolicyScope(new FakeQuery(), today);
  const prior = activePolicyScope(new FakeQuery(), today);
  assert.deepEqual(current.calls, prior.calls);
});

test('live policy scope only excludes soft deletes', () => {
  const q = livePolicyScope(new FakeQuery());
  assert.deepEqual(q.calls, ['is(deleted_at,null)']);
});

test('isoToday yields a Postgres-comparable date', () => {
  assert.equal(isoToday(new Date('2026-08-21T23:59:59Z')), '2026-08-21');
  assert.match(isoToday(), /^\d{4}-\d{2}-\d{2}$/);
});

test('open task scope keeps To Do and In Progress only', () => {
  const q = openTaskScope(new FakeQuery());
  assert.deepEqual(q.calls, ['or(status.eq.To Do,status.eq.In Progress)']);
});

// The sidebar badge and the page's Overdue + Today groups must be the same
// number, so both go through this one scope with one boundary.
test('needs-attention scope is open tasks due before the end of today', () => {
  const boundary = '2026-09-18T07:00:00.000Z';
  const badge = tasksNeedingAttentionScope(new FakeQuery(), boundary);
  const page = tasksNeedingAttentionScope(new FakeQuery(), boundary);
  assert.deepEqual(badge.calls, ['or(status.eq.To Do,status.eq.In Progress)', `lt(due_date,${boundary})`]);
  assert.deepEqual(badge.calls, page.calls);
});

test('isoEndOfToday is the next local midnight', () => {
  const now = new Date(2026, 8, 17, 15, 30); // 3:30pm local, 17 Sep 2026
  const end = new Date(isoEndOfToday(now));
  assert.equal(end.getFullYear(), 2026);
  assert.equal(end.getMonth(), 8);
  assert.equal(end.getDate(), 18);
  assert.equal(end.getHours(), 0);
  assert.equal(end.getMinutes(), 0);
});
