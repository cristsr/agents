// status.mjs — the pipeline modelled as a dependency graph.
//
// /status renders whatever this computes, so an error here does not look like a
// bug: it looks like advice. The cases that matter are the ones where "the next
// artifact" is NOT simply "the first file missing" — the evidence carril, which
// skips a stage, and a regression, where the gap sits behind finished work and
// re-running the stage would discard it.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'status.mjs');

const PROFILE = `SCHEMA_VERSION: 2

identity:
  PROJECT_NAME: fixture

items:
  STORY_ID_PATTERN: spec-<number>

paths:
  WORKDIR_ACTIVE: work/active/{{STORY_ID}}/
  WORKDIR_DONE: work/done/{{STORY_ID}}/
`;

/** Runs status.mjs --json over a throwaway story and returns the parsed report. */
function status(files, { storyId = 'spec-0001', args = null } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'sdd-status-'));
  try {
    mkdirSync(join(root, '.agents'), { recursive: true });
    writeFileSync(join(root, '.agents', 'profile.yaml'), PROFILE);
    const dir = join(root, 'work', 'active', storyId);
    mkdirSync(dir, { recursive: true });
    for (const [name, body] of Object.entries(files)) writeFileSync(join(dir, name), body);

    const run = spawnSync(process.execPath, [SCRIPT, ...(args ?? [storyId, '--json'])], {
      cwd: root, encoding: 'utf8',
    });
    return { code: run.status, out: `${run.stdout}${run.stderr}`, json: safeJson(run.stdout) };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const safeJson = (s) => { try { return JSON.parse(s); } catch { return null; } };
const stage = (report, id) => report.artifacts.find((a) => a.id === id);

const SPEC = '---\ntype: feat\n---\n\n## Acceptance Criteria\n\n### AC-1: It works\n\nTHE SYSTEM SHALL work.\n';
const CONTEXT = '# Technical context\n';

test('a spec-only story points at /clarify', () => {
  const { code, json } = status({ 'spec.md': SPEC });
  assert.equal(code, 0);
  assert.equal(stage(json, 'spec').status, 'done');
  assert.equal(json.next.artifact, 'context');
});

test('an unresolved marker keeps clarification unfinished', () => {
  // /clarify's contract is to leave zero markers, so a spec still carrying one
  // means the stage did not finish — design must not read as ready.
  const spec = `${SPEC}\n[NEEDS CLARIFICATION: which currency?]\n`;
  const { json } = status({ 'spec.md': spec, 'context.md': CONTEXT });
  assert.equal(stage(json, 'context').status, 'ready');
  assert.equal(stage(json, 'design').status, 'blocked');
});

test('in the tdd carril /design stands between context and plan', () => {
  const { json } = status({ 'spec.md': SPEC, 'context.md': CONTEXT });
  assert.equal(json.next.artifact, 'design');
  assert.equal(stage(json, 'plan').status, 'blocked');
  assert.deepEqual(stage(json, 'plan').missingDeps, ['design']);
});

test('in the evidence carril /design is skipped, not pending', () => {
  // Reporting "/design" as the next step in a carril where it never runs sends
  // the developer to a stage that has nothing to produce.
  const spec = SPEC.replace('type: feat', 'type: chore\nbuild_mode: evidence');
  const { json } = status({ 'spec.md': spec, 'context.md': CONTEXT });
  assert.equal(stage(json, 'design').status, 'skipped');
  assert.equal(json.next.artifact, 'plan');
  assert.deepEqual(stage(json, 'plan').requires, ['context']);
});

test('a half-done plan is not a finished build', () => {
  const plan = '### Task 1: One [X]\n### Task 2: Two\n';
  const { json } = status({ 'spec.md': SPEC, 'context.md': CONTEXT, 'design.md': '# D\n', 'plan.md': plan });
  assert.equal(stage(json, 'build').status, 'ready');
  assert.notEqual(stage(json, 'build').status, 'done');
});

test('a gap behind finished work is flagged as a regression', () => {
  // plan.md and a finished build exist, but context.md never did. Re-running
  // /clarify would discard what was built on top — /hotfix is the way back in.
  const plan = '### Task 1: One [X]\n';
  const { json } = status({ 'spec.md': SPEC, 'plan.md': plan });
  assert.equal(json.next.regression, true);
});

test('an unknown story cannot be reported on', () => {
  const { code } = status({ 'spec.md': SPEC }, { args: ['spec-9999', '--json'] });
  assert.equal(code, 2);
});

test('--all lists the active stories without a story id', () => {
  const { code, json } = status({ 'spec.md': SPEC }, { args: ['--all', '--json'] });
  assert.equal(code, 0);
  assert.equal(json.stories.length, 1);
  assert.equal(json.stories[0].storyId, 'spec-0001');
});
