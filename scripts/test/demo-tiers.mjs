#!/usr/bin/env node
// demo-tiers.mjs — one story per execution tier, laid out in a throwaway project and
// reported by the real scripts.
//   node scripts/test/demo-tiers.mjs
//
// The suite already asserts each of these behaviours separately (status.test.mjs and
// validate-artifacts.test.mjs). What this adds is the whole picture in one screen: the
// same four stories through `status.mjs --all`, two of them through the artifact gate —
// including the one that breaks its own tier guardrail, which is the case a demo is
// most likely to get wrong.
//
// It is not part of the test run (`npm test` globs `*.test.mjs`) and it touches nothing
// outside a temporary directory, which it deletes on the way out.

import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const root = mkdtempSync(join(tmpdir(), 'sdd-tiers-'));

const write = (rel, body) => {
  const path = join(root, rel);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, body);
};

write('.agents/profile.yaml', `SCHEMA_VERSION: 3

identity:
  PROJECT_NAME: demo

items:
  STORY_ID_PATTERN: spec-<number>
  ITEM_TYPES: [feat, bug, debt, chore]
  FAST_TIER_TYPES: [bug, debt, chore]
  STANDARD_TIER_TYPES: [feat, bug, debt, chore]

paths:
  WORKING_DIRECTORY: ${root}
  WORKDIR_ACTIVE: work/active/{{STORY_ID}}/
  WORKDIR_DONE: work/done/{{STORY_ID}}/
`);

write('src/foo.ts', "export const parseFoo = () => 'ok';\n");

// ── spec-0001 · no `tier` field → full, the pipeline as always ────────────────
write('work/active/spec-0001/spec.md', `---
type: feat
origin: manual
---

# spec-0001: The whole pipeline

## User Story

**As a** developer
**I want** the default flow
**So that** nothing changed for the stories written before this axis

## Acceptance Criteria

### AC-1: It works

THE SYSTEM SHALL work.
`);

// ── spec-0002 · standard → no design stage ────────────────────────────────────
write('work/active/spec-0002/spec.md', `---
type: feat
origin: manual
tier: standard
---

# spec-0002: One component, no design stage

## User Story

**As a** developer
**I want** a flat plan without a design pass
**So that** a single-component change stays cheap

## Tier Rationale

**Why this tier:** one component, no contract or schema change.
**What covers the omitted stages:** the plan's own verifications, and the module suite.

## Acceptance Criteria

### AC-1: It works

THE SYSTEM SHALL work.
`);
write('work/active/spec-0002/context.md', '# Technical context\n');

// ── spec-0003 · fast, closed by `## AC Coverage` in spec.md ───────────────────
write('work/active/spec-0003/spec.md', `---
type: bug
origin: manual
tier: fast
---

# spec-0003: A trailing separator keeps its empty field

## Defect

**Symptom:** the parser drops a trailing separator.
**Reproduction:** parse "a;b;".
**Expected:** two fields.
**Actual:** one field.
**Impact:** the import silently loses a column.

## Tier Rationale

**Why this tier:** one criterion, one file, no contract or schema change.
**What covers the omitted stages:** the parser's own test, and the branch gate in the build.

## Change Surface

**Confined to:** \`src/foo.ts\` (\`parseFoo\`)

**Check:** \`npm test -- parseFoo\`

## Acceptance Criteria

### AC-1: A trailing separator yields an empty field

WHEN the value ends with the separator, THE SYSTEM SHALL keep the empty field.

## AC Coverage

AC-1: ✓ \`npm test -- parseFoo\` — two fields parsed
`);
write('work/active/spec-0003/.branch', 'fix/spec-0003-trailing-separator\n');

// ── spec-0004 · fast with no `## Change Surface` → the gate must refuse it ────
write('work/active/spec-0004/spec.md', `---
type: bug
origin: manual
tier: fast
---

# spec-0004: A fast story with no declared surface

## Defect

**Symptom:** something is wrong somewhere.

## Tier Rationale

**Why this tier:** it looked small.
**What covers the omitted stages:** a test.

## Acceptance Criteria

### AC-1: It works

THE SYSTEM SHALL work.
`);

const run = (script, args) => {
  const out = spawnSync(process.execPath, [join(REPO, 'scripts', script), ...args], {
    cwd: root, encoding: 'utf8',
  });
  process.stdout.write(out.stdout);
  process.stdout.write(out.stderr);
  return out.status;
};

const heading = (text) => console.log(`\n── ${text} ${'─'.repeat(Math.max(0, 66 - text.length))}`);

try {
  heading('status.mjs --all — one story per tier');
  run('status.mjs', ['--all']);

  heading('status.mjs spec-0003 — the fast story, closed');
  run('status.mjs', ['spec-0003']);

  heading('status.mjs spec-0002 — the standard story');
  run('status.mjs', ['spec-0002']);

  heading('validate-artifacts.mjs spec-0003 — fast, guardrails holding');
  console.log(`exit: ${run('validate-artifacts.mjs', ['spec-0003'])}`);

  heading('validate-artifacts.mjs spec-0004 — fast, no Change Surface');
  console.log(`exit: ${run('validate-artifacts.mjs', ['spec-0004'])}`);

  heading('validate-artifacts.mjs spec-0001 — no tier, unchanged behaviour');
  console.log(`exit: ${run('validate-artifacts.mjs', ['spec-0001'])}`);
} finally {
  rmSync(root, { recursive: true, force: true });
}
