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
// Known limits, on purpose:
// - A SELECT that calls a mutating function is still a write. The names of
//   the ones that exist in this schema are on the blocklist below; a new one
//   must be added here when it is created.
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

// Strip comments and string literals before inspecting keywords, so a
// commented-out DROP does not block and a literal 'x' does not hide one.
// Literals are replaced by a placeholder, which is what makes the
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

const READ_ONLY_START = /^(select|with|explain|show|values|table)\b/i;

const MUTATING = new RegExp(
  '\\b(' +
    [
      'insert', 'update', 'delete', 'merge', 'upsert',
      'drop', 'truncate', 'alter', 'create', 'rename', 'comment',
      'grant', 'revoke', 'copy', 'vacuum', 'analyze', 'reindex', 'cluster',
      'refresh\\s+materialized', 'lock', 'listen', 'notify', 'unlisten',
      'set\\s+role', 'reset\\s+role', 'set\\s+session', 'set\\s+local',
      'pg_terminate_backend', 'pg_cancel_backend', 'pg_sleep',
      'dblink', 'net\\.http_', 'pg_notify',
      'nextval', 'setval',
      // SECURITY DEFINER functions in this schema that write
      'demo_reset', 'merge_clients', 'apply_name_fix', 'apply_carrier_mapping',
      'create_client_invite', 'redeem_client_invite', 'link_client_profile',
      'file_profile_link_request', 'enroll_demo_nurture',
    ].join('|') +
    ')\\b',
  'i',
);

for (const stmt of statements) {
  if (!READ_ONLY_START.test(stmt)) {
    block(`statement does not start with a read-only keyword: "${stmt.slice(0, 60)}". Mutations go in a migration.`);
  }
  const hit = stmt.match(MUTATING);
  if (hit) {
    block(`read-only statement contains "${hit[1]}". If this is a false positive from a column or value name, rewrite the query; the hook cannot be approved around.`);
  }
}

process.exit(0);
