// file-tree.mjs — the plan's File Tree rendered from its tasks.
//
// The point of the script is that the File Tree can no longer disagree with the
// tasks. So the cases that matter are the ones a hand-built tree got wrong: a path
// several tasks touch, a component whose name spans two segments, a plan with no
// section yet, and the round trip through validate-artifacts.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  declaredComponents, componentOf, consolidate, renderFlat, renderNested, replaceFileTree, currentFileTree,
} from '../lib/filetree.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = resolve(HERE, '..', 'file-tree.mjs');
const VALIDATOR = resolve(HERE, '..', 'validate-artifacts.mjs');

const PLAN = `# spec-0001: Settled export — Implementation Plan

**Component(s):** \`apps/ledger\`

### AC → Task traceability

| AC | Covered by |
|----|-----------|
| AC-1 | Task 1 |

---

### Task 0: Verify the working branch

Nothing to declare.

### Task 1: Export settled entries

**Files:**

- Create: \`apps/ledger/src/export/export.use-case.ts\`
- Modify: \`apps/ledger/src/ledger.module.ts\`
- Test: \`apps/ledger/src/export/export.use-case.spec.ts\`

### Task 2: Wire the route

**Files:**

- Modify: \`apps/ledger/src/ledger.module.ts\`
- Create: \`apps/ledger/src/export/export.controller.ts\`
`;

const SPEC = `---
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

const PROFILE = `SCHEMA_VERSION: 2

identity:
  PROJECT_NAME: fixture

items:
  STORY_ID_PATTERN: spec-<number>
  ITEM_TYPES: [feat]

paths:
  WORKDIR_ACTIVE: work/active/{{STORY_ID}}/
  WORKDIR_DONE: work/done/{{STORY_ID}}/
`;

// ── the pure functions ──────────────────────────────────────────────────────

test('the header line names the components, whatever COMPONENT_TERM calls them', () => {
  assert.deepEqual(declaredComponents(PLAN), ['apps/ledger']);
  assert.deepEqual(declaredComponents('**Microservice(s):** `a-ms`, `b-ms`\n'), ['a-ms', 'b-ms']);
});

test('a declared component wins over the first path segment', () => {
  assert.equal(componentOf('apps/ledger/src/x.ts', { components: ['apps/ledger'] }), 'apps/ledger');
  assert.equal(componentOf('apps/ledger/src/x.ts', { moduleRoot: 'apps' }), 'apps/ledger');
  assert.equal(componentOf('catalog-ms/src/x.ts'), 'catalog-ms');
});

test('a file several tasks touch appears once, with its first kind', () => {
  const groups = consolidate([
    { path: 'a/x.ts', kind: 'Create' },
    { path: 'a/x.ts', kind: 'Modify' },
    { path: 'a/y.ts', kind: 'Test' },
  ]);
  assert.deepEqual(groups, [{ component: 'a', files: [{ path: 'a/x.ts', kind: 'create' }, { path: 'a/y.ts', kind: 'test' }] }]);
});

test('every flat leaf carries the complete path, so the validator finds it', () => {
  const flat = renderFlat(consolidate([{ path: 'a/src/x.ts', kind: 'Create' }, { path: 'a/src/y.ts', kind: 'Modify' }]));
  assert.match(flat, /├── a\/src\/x\.ts\s+\(create\)/);
  assert.match(flat, /└── a\/src\/y\.ts\s+\(modify\)/);
  assert.match(flat, /\*\*a\*\*/);
});

test('the nested rendering puts a shared folder once, above its files', () => {
  const nested = renderNested(consolidate([{ path: 'a/src/x.ts', kind: 'Create' }, { path: 'a/src/y.ts', kind: 'Test' }]), 'spec-0001');
  assert.match(nested, /^# spec-0001: File Tree \(visual\)/);
  assert.equal(nested.match(/src$/gm).length, 1);
  assert.match(nested, /├── x\.ts {3}\(create\)/);
  assert.match(nested, /└── y\.ts {3}\(test\)/);
});

test('replacing the section keeps the separator and everything around it', () => {
  const withTree = PLAN.replace('---\n\n### Task 0', '### File Tree\n\nold\n\n---\n\n### Task 0');
  const out = replaceFileTree(withTree, 'NEW');
  assert.match(out, /### File Tree\n\nNEW\n\n---\n\n### Task 0/);
  assert.doesNotMatch(out, /old/);
  assert.equal(currentFileTree(out), 'NEW');
});

test('a plan without the section gets one before its first task', () => {
  const out = replaceFileTree(PLAN, 'NEW');
  assert.ok(out.indexOf('### File Tree') < out.indexOf('### Task 0'));
});

// ── the script, end to end ──────────────────────────────────────────────────

function project(plan) {
  const root = mkdtempSync(join(tmpdir(), 'sdd-filetree-'));
  mkdirSync(join(root, '.agents'), { recursive: true });
  writeFileSync(join(root, '.agents', 'profile.yaml'), PROFILE);
  const dir = join(root, 'work', 'active', 'spec-0001');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'spec.md'), SPEC);
  if (plan !== null) writeFileSync(join(dir, 'plan.md'), plan);
  const run = (script, args) => spawnSync(process.execPath, [script, ...args], { cwd: root, encoding: 'utf8' });
  return { root, dir, run, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

test('a written File Tree passes the validator that checks it', () => {
  const p = project(PLAN);
  try {
    assert.equal(p.run(VALIDATOR, ['spec-0001']).status, 1, 'a plan without File Tree fails first');
    const written = p.run(SCRIPT, ['spec-0001']);
    assert.equal(written.status, 0, written.stderr);
    assert.match(written.stdout, /4 file\(s\) across 1 component/);
    assert.ok(existsSync(join(p.dir, 'docs', 'file-tree.md')));
    const validated = p.run(VALIDATOR, ['spec-0001']);
    assert.equal(validated.status, 0, validated.stdout);
  } finally {
    p.cleanup();
  }
});

test('--check reports a tree left behind by an edited task, and writes nothing', () => {
  const p = project(PLAN);
  try {
    p.run(SCRIPT, ['spec-0001']);
    assert.equal(p.run(SCRIPT, ['spec-0001', '--check']).status, 0);

    const plan = readFileSync(join(p.dir, 'plan.md'), 'utf8');
    const edited = plan.replace('- Create: `apps/ledger/src/export/export.controller.ts`',
      '- Create: `apps/ledger/src/export/export.controller.ts`\n- Delete: `apps/ledger/src/old.ts`');
    writeFileSync(join(p.dir, 'plan.md'), edited);

    const checked = p.run(SCRIPT, ['spec-0001', '--check']);
    assert.equal(checked.status, 1);
    assert.match(checked.stdout, /STALE/);
    assert.equal(readFileSync(join(p.dir, 'plan.md'), 'utf8'), edited);
  } finally {
    p.cleanup();
  }
});

test('running it twice changes nothing the second time', () => {
  const p = project(PLAN);
  try {
    p.run(SCRIPT, ['spec-0001']);
    const first = readFileSync(join(p.dir, 'plan.md'), 'utf8');
    p.run(SCRIPT, ['spec-0001']);
    assert.equal(readFileSync(join(p.dir, 'plan.md'), 'utf8'), first);
  } finally {
    p.cleanup();
  }
});

test('a story without plan.md cannot be rendered', () => {
  const p = project(null);
  try {
    assert.equal(p.run(SCRIPT, ['spec-0001']).status, 2);
  } finally {
    p.cleanup();
  }
});
