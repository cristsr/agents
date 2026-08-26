// paths.mjs — how a path is printed, and how a printed one is caught.
//
// Both halves exist for the same defect: a script prints an absolute path, an
// agent quotes the line into a spec.md, and the artifact now claims something
// that is only true on one machine. So the cases that matter are the boundary
// ones — what stays relative, what earns a `~`, and above all what must NOT be
// mistaken for a filesystem path, because an endpoint or a command flagged as a
// machine path is how a check gets disabled.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { homedir, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { rel, home, machinePaths } from '../lib/paths.mjs';

// ── rel ─────────────────────────────────────────────────────────────────────

test('a path inside the root is relative, with forward slashes', () => {
  const root = resolve('/project');
  assert.equal(rel(join(root, 'work', 'active', 'spec-0001', 'spec.md'), root),
    'work/active/spec-0001/spec.md');
});

test('the root itself is the current directory', () => {
  const root = resolve('/project');
  assert.equal(rel(root, root), '.');
});

test('a path outside the root but under home is written with ~', () => {
  assert.equal(rel(join(homedir(), '.agents', 'contracts', 'PORTS.md'), resolve('/project')),
    '~/.agents/contracts/PORTS.md');
});

test('a path under neither survives absolute — by then that IS the finding', () => {
  const outside = resolve(tmpdir(), 'elsewhere');
  const printed = rel(outside, join(homedir(), 'project'));
  assert.equal(printed.startsWith('..'), false);
  assert.ok(printed.length > 0);
});

test('nothing is invented for an absent path', () => {
  assert.equal(rel(null), null);
  assert.equal(rel(''), '');
});

test('home shortens only the home prefix', () => {
  assert.equal(home(join(homedir(), '.claude', 'skills')), '~/.claude/skills');
  assert.equal(home('work/active'), 'work/active');
});

// ── machinePaths ────────────────────────────────────────────────────────────
// The four spellings that actually reach an artifact.

test('a Windows path quoted from a validator is caught, with its line', () => {
  const text = '# spec-0001\n\n`npm run rules:check` fails with\n`no rules document at C:\\Users\\styve\\.agents\\docs\\rules.md`.\n';
  const found = machinePaths(text);
  assert.equal(found.length, 1);
  assert.equal(found[0].line, 4);
  assert.match(found[0].match, /^C:\\Users/);
});

test('a POSIX home and a Git-Bash mount are the same defect', () => {
  assert.equal(machinePaths('the file lives at /home/styve/project/docs/rules.md').length, 1);
  assert.equal(machinePaths('the file lives at /c/Users/styve/project/docs/rules.md').length, 1);
  assert.equal(machinePaths('the file lives at /mnt/c/project/docs/rules.md').length, 1);
});

test('a file:// URL names a machine too', () => {
  assert.equal(machinePaths('see file:///C:/tmp/report.html').length, 1);
});

// The false positives that would make this check unusable. Each one is a shape
// artifacts are full of.

test('an endpoint is not a filesystem path', () => {
  assert.deepEqual(machinePaths('**WHEN** a POST arrives at /api/v1/invoices/{id}/settle'), []);
});

test('a repo-relative path and a ~ citation both travel', () => {
  assert.deepEqual(machinePaths('the contract in contracts/PORTS.md and ~/.agents/skills/sdd/plan/'), []);
});

test('a URL path belongs to its host, not to a machine', () => {
  assert.deepEqual(machinePaths('per https://example.com/Users/guide and https://docs.dev/home/x'), []);
});

test('a URL scheme is not a drive letter', () => {
  // `ftp://` ends in `p:/`, which is shaped exactly like `C:/`.
  assert.deepEqual(machinePaths('clone from ssh://git@host/repo.git or ftp://host/pub'), []);
});

// ── the root the caller knows ───────────────────────────────────────────────
// What no pattern can guess: a project cloned outside the home directory. On
// POSIX `/srv/app/docs/sdd-rules.md` is shaped exactly like an endpoint, so the only
// way to tell them apart is to be told where the project lives.

test('no pattern can guess a POSIX project root outside home', () => {
  // The gap the anchor exists to close: this line is shaped like an endpoint.
  assert.deepEqual(machinePaths('the gate reads /srv/app/docs/rules.md'), []);
});

test('the project root is caught wherever it sits, once the caller names it', () => {
  const root = resolve('/srv/app');
  const found = machinePaths(`the gate reads ${join(root, 'docs', 'rules.md')}`, root);
  assert.equal(found.length, 1);
  assert.match(found[0].match, /rules\.md$/);
});

test('a filesystem root anchors nothing', () => {
  // `/` or `C:\` as the root would match every path in the artifact.
  assert.deepEqual(machinePaths('the contract in docs/api.yaml', resolve('/')), []);
});

test('an empty artifact has nothing to report', () => {
  assert.deepEqual(machinePaths(''), []);
  assert.deepEqual(machinePaths(null), []);
});
