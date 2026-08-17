// The `shell:readonly` guard, exercised through the same interface Claude Code
// uses: a JSON payload on stdin, a decision in the exit code.
//
// This is the ecosystem's only HARD control — the one a model cannot decide to
// skip. Its predecessor (bash + jq) failed OPEN when jq was absent: the
// extraction returned empty and the guard approved everything, silently. So the
// cases that matter most here are the malformed ones, where the correct answer
// is to block something that might have been harmless.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HOOK = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '..', 'hooks', 'sdd-validate-readonly-bash.js',
);

const BLOCK = 2;
const ALLOW = 0;

const run = (payload) =>
  spawnSync(process.execPath, [HOOK], { input: payload, encoding: 'utf8' }).status;

const command = (cmd) => run(JSON.stringify({ tool_input: { command: cmd } }));

test('read-only commands are allowed', () => {
  for (const cmd of ['git status', 'git log --oneline -5', 'ls -la', 'rg "port" skills/', 'cat README.md']) {
    assert.equal(command(cmd), ALLOW, `should allow: ${cmd}`);
  }
});

test('destructive and write commands are blocked', () => {
  for (const cmd of ['rm -rf build', 'mv a b', 'git commit -m "x"', 'git push', 'git add .', 'npm install left-pad']) {
    assert.equal(command(cmd), BLOCK, `should block: ${cmd}`);
  }
});

test('output redirection is blocked, input redirection is not', () => {
  assert.equal(command('echo hi > file.txt'), BLOCK);
  assert.equal(command('echo hi >> file.txt'), BLOCK);
  assert.equal(command('node script.mjs < payload.json'), ALLOW);
});

test('an unreadable payload blocks — the guard fails CLOSED', () => {
  // The failure mode that motivated the rewrite. With no parseable command
  // there is no way to know what would run, so the only safe answer is no.
  assert.equal(run('not json at all'), BLOCK);
  assert.equal(run(''), BLOCK);
});

test('a payload with no command is allowed — there is nothing to run', () => {
  // Distinct from unreadable: the payload parsed, and it carries no command.
  assert.equal(run(JSON.stringify({ tool_input: {} })), ALLOW);
  assert.equal(command('   '), ALLOW);
});

test('the guard is wired to the path targets.yaml resolves', () => {
  // targets.yaml points at {AGENTS_ROOT}/scripts/hooks/… and sync-agents.mjs
  // expands it. A guard whose file moved does not warn — it just stops running.
  const emitted = join(dirname(HOOK), '..', '..', 'scripts', 'hooks', 'sdd-validate-readonly-bash.js');
  assert.equal(resolve(emitted), HOOK);
});
