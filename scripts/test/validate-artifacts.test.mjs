// validate-artifacts.mjs end to end, over throwaway story workspaces.
//
// This script is the pipeline's only mechanical gate: /plan's close, /sync's
// Requires and /healthcheck --all all read its exit code. Every case here is one
// a skill would otherwise have to judge by eye — and the ones that matter most
// are the NEGATIVE ones, because a gate that never fails is not a gate.
//
// Exit codes under test: 0 = valid · 1 = issues found · 2 = could not run.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'validate-artifacts.mjs');

const PROFILE = `SCHEMA_VERSION: 2

identity:
  PROJECT_NAME: fixture

items:
  STORY_ID_PATTERN: spec-<number>
  ITEM_TYPES: [feat, bug, debt, chore]
  EVIDENCE_MODE_TYPES: [debt, chore]

paths:
  WORKDIR_ACTIVE: work/active/{{STORY_ID}}/
  WORKDIR_DONE: work/done/{{STORY_ID}}/
`;

/** Builds a project holding one story, runs the validator, returns its result. */
function check(files, { storyId = 'spec-0001', args = [] } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'sdd-artifacts-'));
  try {
    mkdirSync(join(root, '.agents'), { recursive: true });
    writeFileSync(join(root, '.agents', 'profile.yaml'), PROFILE);
    const dir = join(root, 'work', 'active', storyId);
    mkdirSync(dir, { recursive: true });
    for (const [name, body] of Object.entries(files)) writeFileSync(join(dir, name), body);

    const run = spawnSync(process.execPath, [SCRIPT, ...(args.length ? args : [storyId])], {
      cwd: root, encoding: 'utf8',
    });
    return { code: run.status, out: `${run.stdout}${run.stderr}` };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const VALID_SPEC = `---
type: feat
origin: manual
---

## Acceptance Criteria

### AC-1: The export lists every settled entry

WHEN the month closes, THE SYSTEM SHALL emit one row per settled entry.

#### Scenario: a closed month

- **WHEN** the month closes
- **THEN** one row exists per settled entry
`;

test('a well-formed spec-only story passes', () => {
  const { code } = check({ 'spec.md': VALID_SPEC });
  assert.equal(code, 0);
});

const CLARIFIED_SPEC = `${VALID_SPEC}
## Ambiguity Resolution

| Unknown | Decision | Source |
|---|---|---|
| Which entries count | Settled only | docs/rules.md |
`;

test('a story with no plan is not faulted for it', () => {
  // It validates only what EXISTS: a story mid-pipeline is not a defect.
  const { code, out } = check({ 'spec.md': CLARIFIED_SPEC, 'context.md': '# Context\n' });
  assert.equal(code, 0);
  assert.doesNotMatch(out, /plan\.md/);
});

test('a context.md without the decision log means /clarify did not finish', () => {
  // The pair is the contract: context.md exists only because /clarify ran, and
  // /clarify writes the decision log first. One without the other is a story
  // that LOOKS clarified — the state a later stage would build on unknowingly.
  const { code, out } = check({ 'spec.md': VALID_SPEC, 'context.md': '# Context\n' });
  assert.equal(code, 1);
  assert.match(out, /Ambiguity Resolution/);
});

test('an unknown story cannot be validated at all', () => {
  const { code } = check({ 'spec.md': VALID_SPEC }, { args: ['spec-9999'] });
  assert.equal(code, 2, 'a missing workspace is "could not run", not "invalid"');
});

test('a broken AC numbering is rejected', () => {
  const spec = VALID_SPEC.replace('### AC-1:', '### AC-2:');
  const { code, out } = check({ 'spec.md': spec });
  assert.equal(code, 1);
  assert.match(out, /numbering/i);
});

test('a front-matter type outside ITEM_TYPES is rejected', () => {
  const spec = VALID_SPEC.replace('type: feat', 'type: epic');
  const { code, out } = check({ 'spec.md': spec });
  assert.equal(code, 1);
  assert.match(out, /ITEM_TYPES/);
});

test('`## Acceptance Criteria` holding no AC is rejected', () => {
  const spec = '---\ntype: feat\norigin: manual\n---\n\n## Acceptance Criteria\n\nTBD\n';
  const { code, out } = check({ 'spec.md': spec });
  assert.equal(code, 1);
  assert.match(out, /AC-N|no `### AC-N/i);
});

// ── The evidence carril's guardrails ────────────────────────────────────────
// Three layers, and this script is the one that enforces two of them
// mechanically. If these stop failing, the relaxed carril becomes reachable by
// typing one line of front matter — which is exactly what it must never be.

const EVIDENCE_SPEC = `---
type: chore
origin: manual
build_mode: evidence
---

## Acceptance Criteria

### AC-1: The validator rejects a malformed profile

WHEN the profile omits a required key, THE SYSTEM SHALL exit non-zero.

#### Scenario: a required key left null

- **WHEN** PROJECT_NAME is null
- **THEN** the validator exits 1

## Build Mode Rationale

The deliverable is a validator; VERIFY runs it against a fixture.
`;

test('evidence mode passes when both guardrails hold', () => {
  const { code } = check({ 'spec.md': EVIDENCE_SPEC });
  assert.equal(code, 0);
});

test('evidence mode is refused to a type outside EVIDENCE_MODE_TYPES', () => {
  const spec = EVIDENCE_SPEC.replace('type: chore', 'type: feat');
  const { code, out } = check({ 'spec.md': spec });
  assert.equal(code, 1);
  assert.match(out, /EVIDENCE_MODE_TYPES/);
});

test('evidence mode is refused without a `## Build Mode Rationale`', () => {
  const spec = EVIDENCE_SPEC.split('## Build Mode Rationale')[0];
  const { code, out } = check({ 'spec.md': spec });
  assert.equal(code, 1);
  assert.match(out, /Build Mode Rationale/);
});

test('an EMPTY `## Build Mode Rationale` is refused too', () => {
  // The section existing is not the point; what it says is.
  const spec = `${EVIDENCE_SPEC.split('## Build Mode Rationale')[0]}## Build Mode Rationale\n`;
  const { code, out } = check({ 'spec.md': spec });
  assert.equal(code, 1);
  assert.match(out, /Build Mode Rationale/);
});

test('a build_mode typo is reported, never normalized into a carril', () => {
  const spec = EVIDENCE_SPEC.replace('build_mode: evidence', 'build_mode: evidnce');
  const { code, out } = check({ 'spec.md': spec });
  assert.equal(code, 1);
  assert.match(out, /evidnce/);
});

// ── plan.md ─────────────────────────────────────────────────────────────────

const PLAN = `# Plan — spec-0001

### Task 0: Verify the working branch [X]
### Task 1: The export use case [X]

### AC → Task traceability

| AC | Tasks |
|---|---|
| AC-1 | Task 1 |

## AC Coverage

AC-1: ✓ covered by export.spec.ts
`;

test('a complete plan passes', () => {
  const { code } = check({ 'spec.md': VALID_SPEC, 'plan.md': PLAN });
  assert.equal(code, 0);
});

test('an AC missing from the traceability table is rejected', () => {
  const spec = `${VALID_SPEC}\n### AC-2: Empty months emit no rows\n\nTHE SYSTEM SHALL emit nothing.\n\n#### Scenario: empty month\n\n- **WHEN** nothing settled\n- **THEN** no row is emitted\n`;
  const { code, out } = check({ 'spec.md': spec, 'plan.md': PLAN });
  assert.equal(code, 1);
  assert.match(out, /AC-2/);
});

test('a ✗ in AC Coverage is an unfinished build', () => {
  const plan = PLAN.replace('AC-1: ✓ covered by export.spec.ts', 'AC-1: ✗ not covered');
  const { code, out } = check({ 'spec.md': VALID_SPEC, 'plan.md': plan });
  assert.equal(code, 1);
  assert.match(out, /✗|coverage/i);
});

test('--json emits parseable output', () => {
  const { out } = check({ 'spec.md': VALID_SPEC }, { args: ['spec-0001', '--json'] });
  assert.doesNotThrow(() => JSON.parse(out));
});
