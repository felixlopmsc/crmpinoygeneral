#!/usr/bin/env node
/* global process */
// PreToolUse hook for the Supabase MCP `execute_sql` tool.
//
// Lets read-only SQL through and blocks everything else, in every permission
// mode including bypassPermissions. A deny rule on execute_sql would also
// block SELECT, and this codebase depends on re-measuring counts against
// production; a hook is the only mechanism that can tell the two apart.
//
// Contract (Claude Code hooks): JSON on stdin with tool_name and tool_input.
// Exit 2 with a message on stderr blocks the call. Exit 0 lets it proceed.
// Any other exit code is treated as a non-blocking error and the call goes
// ahead, so every failure path here exits 2 on purpose: fail closed.
//
// Two layers, because each alone has a hole:
//   1. The statement must START with a read-only keyword. Catches DELETE,
//      UPDATE, DROP, DO $$...$$, CREATE, and the rest.
//   2. No writing keyword and no VOLATILE function ANYWHERE in it. Catches
//      `WITH d AS (DELETE ... RETURNING *) SELECT *`, `EXPLAIN ANALYZE DELETE`,
//      `select 1; drop table x`, and `SELECT some_function()` where the
//      function writes.
//
// Known limits, on purpose:
// - A string literal containing a blocked word (e.g. notes ILIKE '%delete%')
//   is a false positive. The block message says so; rewrite the query or run
//   it from the Supabase dashboard. The hook cannot be overridden by approval.
// - Mutations belong in a migration (apply_migration, CRM repo only) where
//   they are reviewable, not in ad-hoc SQL.

import { readFileSync } from 'node:fs';

function block(reason) {
  process.stderr.write(`sql-read-only hook blocked execute_sql: ${reason}\n`);
  process.exit(2);
}

// ---------------------------------------------------------------------------
// VOLATILE functions, GENERATED from production, not hand-maintained.
//
// Postgres already knows which functions may have side effects: provolatile =
// 'v'. Read-only helpers in this schema (is_staff, dq_*, client_ref_counts,
// quote_request_accepts_documents) are declared STABLE and so are absent,
// which is why this list is precise rather than paranoid. A hand-kept list
// drifted the day it was written; this one is regenerated, not edited.
//
// Generated 2026-10-21 as the UNION of both projects execute_sql can reach,
// production fetiakfllzxwibqzfedh and demo wdynqlrbirvartitpwcn, with:
//
//   SELECT DISTINCT n.nspname || '.' || p.proname
//   FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
//   WHERE p.provolatile = 'v'
//     AND n.nspname IN ('public','cron','net','dreamlit','vault')
//   ORDER BY 1;
//
// The union matters: public.demo_reset exists only on the demo project and
// was the one function the production-only list missed.
//
// `public`, `cron`, `net` are the schemas the review named. `dreamlit` is
// added because send_supabase_auth_email sends real email, and `vault`
// because create_secret/update_secret write secrets. `extensions` is left out
// on purpose: it is almost all gen_random_uuid / pgp_* / uuid_generate_*,
// which are volatile but harmless in a SELECT.
//
// To regenerate: run the query above through the Supabase MCP against BOTH
// projects (it is itself read-only and passes this hook), merge the results
// here, update the date. If a function that writes is missing from this
// list, the fix is to declare the read-only ones STABLE in a CRM migration,
// not to hand-edit this array. Note that `expire-stale-policies`, the active
// cron job, is NOT a function: it runs an inline DO block, which layer 1
// blocks by keyword.
// ---------------------------------------------------------------------------
const VOLATILE_FUNCTIONS = [
  'cron.alter_job',
  'cron.job_cache_invalidate',
  'cron.schedule',
  'cron.schedule_in_database',
  'cron.unschedule',
  'dreamlit.dreamlit_80a410d3_public_clients',
  'dreamlit.dreamlit_auth_create_trigger',
  'dreamlit.dreamlit_auth_drop_trigger',
  'dreamlit.dreamlit_e170072a_public_quote_requests',
  'dreamlit.send_supabase_auth_email',
  'net._await_response',
  'net._http_collect_response',
  'net.check_worker_is_up',
  'net.http_collect_response',
  'net.http_delete',
  'net.http_get',
  'net.http_post',
  'net.wait_until_running',
  'net.wake',
  'net.worker_restart',
  'public.apply_carrier_mapping',
  'public.apply_name_fix',
  'public.calculate_commission',
  'public.create_client_invite',
  'public.create_lead_from_quote_request',
  'public.demo_reset',
  'public.enroll_demo_nurture',
  'public.file_profile_link_request',
  'public.generate_referral_code',
  'public.handle_new_user',
  'public.init_user_settings_and_onboarding',
  'public.link_client_profile',
  'public.mark_test_quote_request',
  'public.merge_clients',
  'public.redeem_client_invite',
  'public.rls_auto_enable',
  'public.set_quote_request_contacted_at',
  'public.set_referral_code_on_insert',
  'public.touch_demo_requests_updated_at',
  'public.update_circle_membership',
  'public.update_cross_sell_timestamp',
  'public.update_renewal_email_sent',
  'public.update_updated_at',
  'public.update_updated_at_column',
  'vault.create_secret',
  'vault.update_secret',
];

// pg_catalog is not in the generated query (thousands of rows, nearly all
// harmless). These are the system functions that act on the server or on
// sequences and are worth naming by hand. This short list IS hand-kept.
const SYSTEM_FUNCTIONS = [
  'pg_terminate_backend',
  'pg_cancel_backend',
  'pg_sleep',
  'pg_notify',
  'pg_reload_conf',
  'pg_stat_statements_reset',
  'nextval',
  'setval',
  'dblink',
  'lo_import',
  'lo_export',
  'pg_read_file',
  'pg_read_binary_file',
  'pg_ls_dir',
];

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// `public.fn` may be called bare or qualified; any other schema must be
// qualified, so a bare `schedule` or `send` in a column name does not trip it.
const FUNCTION_PATTERNS = VOLATILE_FUNCTIONS.map((full) => {
  const [schema, name] = full.split('.');
  return schema === 'public'
    ? `(?:public\\.)?${escapeRe(name)}`
    : `${escapeRe(schema)}\\.${escapeRe(name)}`;
}).concat(SYSTEM_FUNCTIONS.map((n) => `(?:pg_catalog\\.)?${escapeRe(n)}`));

// Layer 2 only needs the words that can legally appear INSIDE a statement
// that starts with an allowed keyword: a writing CTE, EXPLAIN ANALYZE DELETE,
// SET ROLE after a SELECT. Statement-level verbs (DO, CALL, COPY, GRANT,
// LOCK, VACUUM, COMMENT, CLUSTER, ...) are already stopped by layer 1, and
// listing them here would only add false positives on column names.
// `analyze` is deliberately absent so `EXPLAIN ANALYZE SELECT ...` passes.
const WRITING_KEYWORDS = [
  'insert', 'update', 'delete', 'drop', 'truncate', 'alter', 'create',
  'refresh\\s+materialized',
  'set\\s+role', 'reset\\s+role', 'set\\s+session', 'set\\s+local',
];

const READ_ONLY_START = /^(select|with|explain|show|values|table)\b/i;
const WRITING = new RegExp(`\\b(${WRITING_KEYWORDS.join('|')})\\b`, 'i');
const VOLATILE = new RegExp(`\\b(${FUNCTION_PATTERNS.join('|')})\\s*\\(`, 'i');

let input;
try {
  input = JSON.parse(readFileSync(0, 'utf8'));
} catch (err) {
  block(`could not parse hook input (${err.message}); refusing rather than guessing`);
}

const query = input?.tool_input?.query;
if (typeof query !== 'string' || !query.trim()) {
  block('no SQL query found in tool_input');
}

// Strip comments, dollar-quoted bodies and string literals before inspecting
// keywords, so a commented-out DROP does not block and a literal 'x' does not
// hide one. Literals become placeholders, which is what makes the
// false-positive case above rare rather than common.
const stripped = query
  .replace(/--[^\n]*/g, ' ')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/\$[A-Za-z_]*\$[\s\S]*?\$[A-Za-z_]*\$/g, ' $$body$$ ')
  .replace(/'(?:[^']|'')*'/g, "'lit'")
  .replace(/"(?:[^"]|"")*"/g, '"ident"');

const statements = stripped
  .split(';')
  .map((s) => s.trim())
  .filter(Boolean);

if (statements.length === 0) {
  block('query is empty after stripping comments');
}

for (const stmt of statements) {
  if (!READ_ONLY_START.test(stmt)) {
    block(`statement does not start with a read-only keyword: "${stmt.slice(0, 60)}". Mutations go in a migration.`);
  }
  const kw = stmt.match(WRITING);
  if (kw) {
    block(`read-only statement contains "${kw[1]}". If this is a false positive from a column or value name, rewrite the query; the hook cannot be approved around.`);
  }
  const fn = stmt.match(VOLATILE);
  if (fn) {
    block(`read-only statement calls VOLATILE function "${fn[1]}", which may write. Use a migration, or if it is actually read-only, declare it STABLE and regenerate the list in this hook.`);
  }
}

process.exit(0);
