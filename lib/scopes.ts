// Shared query scopes.
//
// A count and the list it labels have to mean the same thing. They drift when
// the predicate is written twice: the Quote Requests badge read 9 while the
// inbox read 0, because the list excluded internal test submissions and the
// badge did not. The fix is not to copy the missing filter across — it is to
// have one definition that both call sites apply.
//
// Each scope takes a Supabase query builder and returns it with the filters
// applied, so it composes with whatever else a caller needs:
//
//   quoteRequestInboxScope(supabase.from('quote_requests').select('id', { count: 'exact', head: true }))
//   quoteRequestInboxScope(supabase.from('quote_requests').select('*')).order('created_at')
//
// If a scope changes, every surface using it changes together. That is the
// entire point — don't inline these conditions at a call site.

/**
 * Structural shape of the builder methods the scopes use. Deliberately not
 * PostgrestFilterBuilder: the concrete generics differ per table and per
 * select shape, and naming them here would force every caller to line up type
 * arguments for no benefit. Self-referential Q keeps the chain typed.
 */
interface Scopeable<Q> {
  is(column: string, value: null): Q;
  not(column: string, operator: string, value: unknown): Q;
  gte(column: string, value: string): Q;
  lt(column: string, value: string): Q;
  or(filters: string): Q;
  ilike(column: string, pattern: string): Q;
}

/**
 * Quote requests a staff member should see in the inbox.
 *
 * `is_test IS NOT TRUE` rather than `= false`: is_test is nullable, and an
 * equality test drops NULL rows silently. There are none today, but a column
 * added later defaults to NULL and would make genuine submissions vanish from
 * the inbox — the same class of bug this file exists to prevent.
 */
export function quoteRequestInboxScope<Q extends Scopeable<Q>>(query: Q): Q {
  return query.is('deleted_at', null).not('is_test', 'is', true);
}

/**
 * Policies that count as active.
 *
 * Mirrors public.get_active_policy_count() and get_active_premium_total()
 * exactly — lower(status) = 'active' AND expiration_date >= current_date AND
 * deleted_at IS NULL — so the dashboard card, its trend arrow and the RPCs
 * cannot disagree. They did: the card rendered the RPC's 169 while its trend
 * was computed from a raw count of 170 that ignored expiry and soft deletes.
 *
 * `today` is passed in rather than read from the clock here so callers that
 * compare two periods use one consistent date.
 */
export function activePolicyScope<Q extends Scopeable<Q>>(query: Q, today: string): Q {
  return query.ilike('status', 'Active').is('deleted_at', null).gte('expiration_date', today);
}

/** Policies not soft-deleted, without the active/expiry conditions. */
export function livePolicyScope<Q extends Scopeable<Q>>(query: Q): Q {
  return query.is('deleted_at', null);
}

/** Task statuses that still need doing. Cancelled is the soft delete. */
export const OPEN_TASK_STATUSES = ['To Do', 'In Progress'] as const;

/**
 * Tasks that are not done and not removed.
 *
 * Written as an or() of equalities rather than in(): PostgrestFilterBuilder's
 * `in` is generic over the row type and makes `Q extends Scopeable<Q>` blow
 * past TypeScript's instantiation depth for the head-count builders every
 * badge hook uses. or() takes a plain string and stays cheap.
 */
export function openTaskScope<Q extends Scopeable<Q>>(query: Q): Q {
  return query.or(OPEN_TASK_STATUSES.map((s) => `status.eq.${s}`).join(','));
}

/**
 * Open tasks that are overdue or due today — the number on the sidebar
 * badge, and the same number the Tasks page shows on its Overdue and Today
 * groups. `endOfToday` is the local-midnight boundary as an ISO timestamp,
 * passed in so the badge hook and the page compute it once and agree; a
 * due_date strictly before it is either earlier today or in the past.
 */
export function tasksNeedingAttentionScope<Q extends Scopeable<Q>>(query: Q, endOfToday: string): Q {
  return openTaskScope(query).lt('due_date', endOfToday);
}

/** Local midnight at the end of today as an ISO timestamp. */
export function isoEndOfToday(now: Date = new Date()): string {
  const d = new Date(now);
  d.setHours(24, 0, 0, 0);
  return d.toISOString();
}

/** Today as an ISO date (YYYY-MM-DD), matching Postgres current_date. */
export function isoToday(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}
