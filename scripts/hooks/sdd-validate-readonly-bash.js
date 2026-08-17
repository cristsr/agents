#!/usr/bin/env node
/**
 * PreToolUse hook: keeps the read-only audit agents (`code-explorer`,
 * `conventions-reviewer`, and anything else declaring the `shell:readonly`
 * guard) from writing or destroying anything.
 *
 * It reads the hook payload from stdin and blocks (exit 2) any Bash command
 * that writes. It replaces an earlier bash+jq version that failed OPEN: `jq`
 * was not installed, the extraction returned empty, and the guard approved
 * everything.
 *
 * The rule: when in doubt, BLOCK. A guard that fails open is not a guard.
 * Node is used because it is guaranteed in this environment; jq is not.
 *
 * Wiring: `agents/targets.yaml` (guard `shell:readonly`) points at this file
 * through the `{AGENTS_ROOT}` placeholder, which `sync-agents.mjs` resolves to
 * the absolute path of this repo on each machine. Never hardcode a path there.
 */

const DENY = /\b(rm|mv|git\s+commit|git\s+push|git\s+add|git\s+checkout\s+-b|npm\s+install|yarn\s+add|pnpm\s+add)\b|>>|[^<]>/i;

const BLOCK = 2;
const ALLOW = 0;

function deny(reason) {
  console.error(`Blocked: this agent is read-only. ${reason}`);
  process.exit(BLOCK);
}

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { raw += chunk; });
process.stdin.on('end', () => {
  let command;
  try {
    command = JSON.parse(raw)?.tool_input?.command;
  } catch {
    // The payload could not be parsed: there is no way to know what would run.
    deny('Could not read the command to validate (unreadable payload).');
  }

  // No command means there is nothing to run and nothing to validate.
  if (typeof command !== 'string' || command.trim() === '') {
    process.exit(ALLOW);
  }

  if (DENY.test(command)) {
    deny('Write and destructive operations are not allowed.');
  }

  process.exit(ALLOW);
});
