#!/usr/bin/env node
/* global process */
// PreToolUse hook that unconditionally blocks whatever tool it is matched to.
//
// Why this exists alongside the `permissions.deny` rules in settings.json:
// a deny rule names an MCP tool as `mcp__<server>__<tool>`, and <server> is
// whatever the host calls the MCP server. In this session's cloud
// environment the GitHub and Supabase servers are called `github` and
// `Supabase`; in Cowork and in child sessions they are identified by a UUID
// (`mcp__7849c45f-...__execute_sql`), so the deny rule matches nothing
// there. The 2026-10-22 live test proved it: the SQL hook, matched on
// `mcp__[Ss]upabase__execute_sql`, never fired because the tool was named
// by UUID. Hook matchers are regular expressions, so `mcp__.*__<tool>`
// matches the tool regardless of what the server is called. The deny rules
// stay as a second layer for hosts where the names do line up.
//
// Exit 2 with a reason on stderr blocks the call in every permission mode,
// including bypassPermissions.

import { readFileSync } from 'node:fs';

let name = 'this tool';
try {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  if (typeof input?.tool_name === 'string') name = input.tool_name;
} catch {
  // Fall through: block regardless of whether the input parsed.
}

process.stderr.write(
  `deny-tool hook blocked ${name}: this repository does not let a session merge, ` +
  `auto-merge, apply migrations from the portal, or pause a Supabase project. ` +
  `Merges are Felix's; open the PR and stop.\n`,
);
process.exit(2);
