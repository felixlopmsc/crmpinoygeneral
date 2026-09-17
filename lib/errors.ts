// Deliberately structural rather than importing PostgrestError: the same
// helper has to accept AuthError and StorageError too, and those carry
// differently-typed (or absent) `code` fields.

// Turns a database error into something a person can act on.
//
// Raw Postgres errors leak schema internals into the UI — constraint names,
// table names, "row level security", policy names. That is noise to an agent
// mid-task and an information leak to anyone else, so nothing from the driver
// is ever shown verbatim. We map the codes we can actually explain and fall
// back to a plain apology for the rest.
//
// Codes: https://www.postgresql.org/docs/current/errcodes-appendix.html

type Errorish = { code?: string | null; message?: string | null } | null | undefined;

export interface FriendlyErrorOptions {
  /** What the user was doing, lowercase noun phrase: "save this client". */
  action?: string;
  /** Overrides keyed by Postgres SQLSTATE, for context-specific wording. */
  overrides?: Record<string, string>;
}

export function friendlyError(error: Errorish, options: FriendlyErrorOptions = {}): string {
  const { action, overrides } = options;
  const code = error?.code ?? '';

  if (overrides?.[code]) return overrides[code];

  switch (code) {
    case '23505': // unique_violation
      return 'A record with these details already exists.';

    case '23503': // foreign_key_violation
      return 'This record is still linked to other information, so it can\'t be removed yet.';

    case '23514': // check_violation
      return 'Some of this information isn\'t in a format we can accept. Please review the fields and try again.';

    case '23502': // not_null_violation
      return 'A required field is missing. Please fill everything in and try again.';

    case '22001': // string_data_right_truncation
      return 'One of the values is too long. Please shorten it and try again.';

    case '22P02': // invalid_text_representation
    case '22007': // invalid_datetime_format
      return 'One of the values isn\'t in the expected format. Please check and try again.';

    // Permission: RLS denial surfaces as 42501, and PostgREST also returns
    // these when a policy blocks the request outright.
    case '42501':
    case 'PGRST301':
      return 'You don\'t have permission to do that. Ask an administrator if you need access.';

    case 'PGRST116': // no rows where one was expected
      return 'That record could no longer be found. It may have been changed or removed.';

    // Offline / unreachable — supabase-js sets this when fetch itself fails.
    case '':
      if (!error) return 'Something went wrong. Please try again.';
      return action
        ? `We couldn't ${action}. Please check your connection and try again.`
        : 'We couldn\'t reach the server. Please check your connection and try again.';

    default:
      return action
        ? `We couldn't ${action}. Please try again.`
        : 'Something went wrong. Please try again.';
  }
}

// A write that RLS silently refused. Postgres does not error when a policy
// hides the target row — the statement simply matches nothing — so an
// UPDATE/DELETE with no error and no returned rows means "not permitted" (or
// "already gone"), never "success". Callers should `.select()` on the write so
// there is a row count to check.
export const NOT_PERMITTED =
  'You don\'t have permission to do that, so nothing was changed. Ask an administrator if you need access.';
