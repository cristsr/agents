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
function check(files, { storyId = 'spec-0001', args = [], done = false, profile = PROFILE } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'sdd-artifacts-'));
  try {
    mkdirSync(join(root, '.agents'), { recursive: true });
    writeFileSync(join(root, '.agents', 'profile.yaml'), profile);
    const dir = join(root, 'work', done ? 'done' : 'active', storyId);
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

// ── The execution tiers' guardrails ─────────────────────────────────────────
// The other axis: `build_mode` says how a criterion is closed, the tier says which
// stages exist. `fast` drops the clarification pass, the design and the plan, so what
// those stages would have established has to be IN THE SPEC before any code runs — a
// single criterion, no open question, a declared surface and the check that closes it.
// If these stop failing, a story skips three stages by typing one line of front matter.

const FAST_SPEC = `---
type: bug
origin: manual
tier: fast
---

## Defect

**Symptom:** the parser drops a trailing separator.
**Reproduction:** parse "a;b;".
**Expected:** two fields.
**Actual:** one field.
**Impact:** the import silently loses a column.

## Tier Rationale

**Why this tier:** one criterion, one file, no contract or schema change.
**What covers the omitted stages:** the module's own test, and the branch gate in build.

## Change Surface

**Confined to:** \`scripts/lib/story.mjs\` (\`frontMatter\`)

**Check:** \`node --test scripts/test/story.test.mjs\`

## Acceptance Criteria

### AC-1: A trailing separator yields an empty field

WHEN the value ends with the separator, THE SYSTEM SHALL keep the empty field.
`;

test('a fast story that holds its guardrails passes', () => {
  const { code } = check({ 'spec.md': FAST_SPEC });
  assert.equal(code, 0);
});

test('a fast story is refused when it carries more than one criterion', () => {
  const spec = `${FAST_SPEC}\n### AC-2: A leading separator too\n\nTHE SYSTEM SHALL keep it as well.\n`;
  const { code, out } = check({ 'spec.md': spec });
  assert.equal(code, 1);
  assert.match(out, /exactly one acceptance criterion/);
});

test('a fast story is refused while a clarification marker is open', () => {
  // The pass that resolves it is the one the tier omits.
  const spec = `${FAST_SPEC}\n[NEEDS CLARIFICATION: which separator?]\n`;
  const { code, out } = check({ 'spec.md': spec });
  assert.equal(code, 1);
  assert.match(out, /NEEDS CLARIFICATION/);
});

test('a fast story is refused without a `## Change Surface`', () => {
  const spec = FAST_SPEC.split('## Change Surface')[0] + FAST_SPEC.split('## Acceptance Criteria')[1];
  const { code, out } = check({ 'spec.md': spec });
  assert.equal(code, 1);
  assert.match(out, /Change Surface/);
});

test('a fast story is refused when the surface names no check', () => {
  const spec = FAST_SPEC.replace(/^\*\*Check:\*\*.*$/m, '**Check:** the reviewer looks at it');
  const { code, out } = check({ 'spec.md': spec });
  assert.equal(code, 1);
  assert.match(out, /names no check/);
});

test('a fast story is refused to a type outside FAST_TIER_TYPES', () => {
  // `feat` is deliberately absent from the default allowlist: a new capability with one
  // criterion is still a capability, and `standard` is where it belongs.
  const spec = FAST_SPEC.replace('type: bug', 'type: feat');
  const { code, out } = check({ 'spec.md': spec });
  assert.equal(code, 1);
  assert.match(out, /FAST_TIER_TYPES/);
});

test('a reduced tier is refused without a `## Tier Rationale`', () => {
  const spec = FAST_SPEC.split('## Tier Rationale')[0] + FAST_SPEC.split('## Change Surface')[1].replace(/^/, '## Change Surface');
  const { code, out } = check({ 'spec.md': spec });
  assert.equal(code, 1);
  assert.match(out, /Tier Rationale/);
});

test('a tier typo is reported, never normalized into a flow', () => {
  const spec = FAST_SPEC.replace('tier: fast', 'tier: fst');
  const { code, out } = check({ 'spec.md': spec });
  assert.equal(code, 1);
  assert.match(out, /fst/);
  assert.match(out, /absent means full/);
});

test('a fast story closes in spec.md, and a ✗ there is an unfinished build', () => {
  const spec = `${FAST_SPEC}
## AC Coverage

AC-1: ✗ the check fails on a trailing separator
`;
  const { code, out } = check({ 'spec.md': spec });
  assert.equal(code, 1);
  assert.match(out, /✗/);
});

test('a fast line marked ✓ names the check that proves it', () => {
  const spec = `${FAST_SPEC}
## AC Coverage

AC-1: ✓ \`node --test scripts/test/story.test.mjs\` — two fields parsed
`;
  const { code } = check({ 'spec.md': spec });
  assert.equal(code, 0);
});

test('a plan.md is a warning in a fast story, not a silent contradiction', () => {
  const { code, out } = check({ 'spec.md': FAST_SPEC, 'plan.md': PLAN });
  assert.equal(code, 0, 'the tier warns instead of failing: the file may be a leftover');
  assert.match(out, /tier: fast/);
});

test('a standard story with a design.md is warned about, not failed', () => {
  const spec = VALID_SPEC.replace('origin: manual', 'origin: manual\ntier: standard') + `
## Tier Rationale

**Why this tier:** one component, no contract change.
**What covers the omitted stages:** the plan and the module suite.
`;
  const { code, out } = check({ 'spec.md': spec, 'design.md': '# design\n\n## Global Architecture Impact\n\nNo.\n' });
  assert.equal(code, 0);
  assert.match(out, /omits the design stage/);
});

test('a story with no tier is validated exactly as before the axis existed', () => {
  const { code, out } = check({ 'spec.md': VALID_SPEC });
  assert.equal(code, 0);
  assert.doesNotMatch(out, /tier/i);
});

test('an archived fast story is asked for its close, and accepts it in spec.md', () => {
  // The tier writes no plan, so the archive gate reads `## AC Coverage` from spec.md —
  // the same claim, in the artifact the flow kept.
  const without = check({ 'spec.md': FAST_SPEC }, { done: true });
  assert.equal(without.code, 1);
  assert.match(without.out, /archived without a `## AC Coverage`/);

  const spec = `${FAST_SPEC}
## AC Coverage

AC-1: ✓ \`node --test scripts/test/story.test.mjs\` — two fields parsed
`;
  const with_ = check({ 'spec.md': spec }, { done: true });
  assert.equal(with_.code, 0);
});

test('standard eligibility comes from the documented default, not from ITEM_TYPES', () => {
  // A fallback that followed the item types would widen a reduced tier the moment a
  // project adds its own type. The allowlists are deliberate edits of the profile.
  const profile = PROFILE.replace('ITEM_TYPES: [feat, bug, debt, chore]', 'ITEM_TYPES: [feat, bug, debt, chore, spike]');
  const spec = FAST_SPEC.replace('type: bug', 'type: spike').replace('tier: fast', 'tier: standard');
  const { code, out } = check({ 'spec.md': spec }, { profile });
  assert.equal(code, 1);
  assert.match(out, /STANDARD_TIER_TYPES/);
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

// ── plan.md § File Tree ──────────────────────────────────────────────────────
// A task's **Files:** lines are the source of truth; the File Tree is a
// derived summary. A tree the tasks have outgrown is exactly the drift this
// check exists to catch — the same reasoning as the traceability table above.

const PLAN_WITH_FILES = PLAN.replace(
  '### Task 1: The export use case [X]',
  [
    '### Task 1: The export use case [X]',
    '',
    '**Files:**',
    '- Create: `apps/api/src/export/export.use-case.ts`',
    '- Test: `apps/api/src/export/export.use-case.spec.ts`',
  ].join('\n'),
);

test('a task with Files and no `### File Tree` in the header is rejected', () => {
  const { code, out } = check({ 'spec.md': VALID_SPEC, 'plan.md': PLAN_WITH_FILES });
  assert.equal(code, 1);
  assert.match(out, /File Tree/);
});

const PLAN_WITH_TREE = PLAN_WITH_FILES.replace(
  '### AC → Task traceability',
  [
    '### File Tree',
    '',
    '**apps/api**',
    '',
    '```',
    '├── apps/api/src/export/export.use-case.ts        (create)',
    '└── apps/api/src/export/export.use-case.spec.ts   (test)',
    '```',
    '',
    '### AC → Task traceability',
  ].join('\n'),
);

test('a File Tree consolidating every task path passes', () => {
  const { code } = check({ 'spec.md': VALID_SPEC, 'plan.md': PLAN_WITH_TREE });
  assert.equal(code, 0);
});

test('a File Tree missing one task path is rejected, naming it', () => {
  const incomplete = PLAN_WITH_TREE.replace(
    '├── apps/api/src/export/export.use-case.ts        (create)\n└── apps/api/src/export/export.use-case.spec.ts   (test)',
    '└── apps/api/src/export/export.use-case.ts        (create)',
  );
  const { code, out } = check({ 'spec.md': VALID_SPEC, 'plan.md': incomplete });
  assert.equal(code, 1);
  assert.match(out, /export\.use-case\.spec\.ts.*missing from `### File Tree`/);
});

test('--json emits parseable output', () => {
  const { out } = check({ 'spec.md': VALID_SPEC }, { args: ['spec-0001', '--json'] });
  assert.doesNotThrow(() => JSON.parse(out));
});

// ── The artifacts don't name the pipeline ───────────────────────────────────
// README § "The artifacts never name the pipeline". The leak is always a copy:
// a template's instruction comment, or a note to the writer left inside the
// block that gets written down. Neither survives a refactor of the stage names,
// and neither means anything to whoever reads the artifact later.

test('a spec citing the skill that wrote a line is warned about', () => {
  const spec = VALID_SPEC.replace(
    'WHEN the month closes, THE SYSTEM SHALL emit one row per settled entry.',
    'WHEN the month closes, THE SYSTEM SHALL emit one row per settled entry (written by /clarify).',
  );
  const { out } = check({ 'spec.md': spec });
  assert.match(out, /WARNINGS/);
  assert.match(out, /names the skill that produced it/);
});

test('a template instruction comment left in an artifact is warned about', () => {
  const spec = `${VALID_SPEC}\n<!-- Scenarios (written by /clarify, never by /spec). -->\n`;
  const { out } = check({ 'spec.md': spec });
  assert.match(out, /template instruction comment/);
});

test('a plan citing a PHASE of the skill that produced it is warned about', () => {
  const spec = `${VALID_SPEC}\n> Every AC must appear in the table (see PHASE 3.5).\n`;
  const { out } = check({ 'spec.md': spec });
  assert.match(out, /PHASE/);
});

test('naming the STORY is traceability, not a signature', () => {
  // The line to keep drawing: spec-0042 in an artifact is project history and
  // stays; the skill that typed it is machinery and does not.
  const spec = VALID_SPEC.replace(
    '## Ambiguity Resolution',
    '## Ambiguity Resolution',
  ).concat('\nSupersedes the decision taken in spec-0007.\n');
  const { code, out } = check({ 'spec.md': spec });
  assert.equal(code, 0);
  assert.doesNotMatch(out, /WARNINGS/);
});

// ── The artifacts cite paths relative to the project ────────────────────────
// README § "The artifacts cite paths relative to the project". Nobody types an
// absolute path into a spec: a validator or a shell prints one and the line is
// quoted whole. It reads as evidence and stops being true on the next clone.

test('a validator line quoted with its absolute path is warned about', () => {
  const spec = `${VALID_SPEC}\n\`npm run rules:check\` fails with \`no rules document at C:\\Users\\dev\\project\\docs\\rules.md\`.\n`;
  const { out } = check({ 'spec.md': spec });
  assert.match(out, /WARNINGS/);
  assert.match(out, /cites a path from one machine/);
});

test('a POSIX home path in a plan is the same defect', () => {
  const plan = `${PLAN}\n\nRun the suite from /home/dev/project/apps/api.\n`;
  const { out } = check({ 'spec.md': VALID_SPEC, 'plan.md': plan });
  assert.match(out, /plan\.md: line \d+ cites a path from one machine/);
});

test('an endpoint and a repo-relative path are not machine paths', () => {
  // The line to keep drawing: what an artifact is FULL of must pass, or the
  // check gets turned off. `/api/...` is a route, `docs/…` already travels.
  const spec = `${VALID_SPEC}\nThe route is /api/v1/entries and the contract sits in docs/api.yaml.\n`;
  const { code, out } = check({ 'spec.md': spec });
  assert.equal(code, 0);
  assert.doesNotMatch(out, /WARNINGS/);
});
