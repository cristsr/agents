// validate-rules.mjs — the constitution's FORM, checked mechanically.
//
// /design and /plan validate their work against docs/rules.md, so a rule they
// cannot evaluate is worse than no rule: it passes silently. The two checks
// worth pinning are the ones that decide whether a rule is checkable at all —
// a Principle phrased without MUST/SHALL/NEVER, and a verification that names
// only "code review", which is the gate that never fails.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'validate-rules.mjs');

function validate(markdown) {
  const root = mkdtempSync(join(tmpdir(), 'sdd-rules-'));
  try {
    const path = join(root, 'rules.md');
    writeFileSync(path, markdown);
    const run = spawnSync(process.execPath, [SCRIPT, path], { encoding: 'utf8' });
    return { code: run.status, out: `${run.stdout}${run.stderr}` };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const VALID = `---
version: 1.2.0
ratified: 2026-01-15
last_amended: 2026-03-02
---

# Rules

### Article 1: Layer boundaries

**Principle:** The domain layer MUST NOT import from infrastructure.

**Reason:** A domain that knows its adapters cannot be tested or replaced.

**How it's verified:** A lint rule in CI fails the build on a forbidden import.

## Mandatory Quality Gates

- [x] Tests pass before merge
- [ ] Contract lint is clean
`;

test('a well-formed constitution passes', () => {
  const { code, out } = validate(VALID);
  assert.equal(code, 0, out);
  assert.match(out, /1 articles/);
});

test('a non-semver version is rejected', () => {
  const { code, out } = validate(VALID.replace('version: 1.2.0', 'version: v1'));
  assert.equal(code, 1);
  assert.match(out, /semver/);
});

test('a non-ISO date is rejected', () => {
  const { code, out } = validate(VALID.replace('ratified: 2026-01-15', 'ratified: Jan 2026'));
  assert.equal(code, 1);
  assert.match(out, /ratified/);
});

test('an article missing one of its three fields is rejected', () => {
  const { code, out } = validate(VALID.replace(/\*\*Reason:\*\*.*\n/, ''));
  assert.equal(code, 1);
  assert.match(out, /Reason/);
});

test('a Principle with no MUST/SHALL/NEVER is rejected', () => {
  // "should prefer" cannot be answered yes or no, so no gate can enforce it.
  const soft = VALID.replace(
    'The domain layer MUST NOT import from infrastructure.',
    'The domain layer should prefer not to import from infrastructure.',
  );
  const { code, out } = validate(soft);
  assert.equal(code, 1);
  assert.match(out, /normative/);
});

test('a verification resting on code review alone is warned about', () => {
  // A warning, not an issue: it is a weak rule, not a malformed one.
  const weak = VALID.replace(
    'A lint rule in CI fails the build on a forbidden import.',
    'Caught during code review.',
  );
  const { code, out } = validate(weak);
  assert.equal(code, 0, 'a weak gate does not make the document invalid');
  assert.match(out, /WARNINGS/);
  assert.match(out, /concrete gate/);
});

test('a document with no articles is not a constitution', () => {
  const { code, out } = validate('---\nversion: 1.0.0\nratified: 2026-01-01\nlast_amended: 2026-01-01\n---\n\n# Rules\n');
  assert.equal(code, 1);
  assert.match(out, /no articles/);
});

test('a missing quality gates section is rejected', () => {
  const { code, out } = validate(VALID.split('## Mandatory Quality Gates')[0]);
  assert.equal(code, 1);
  assert.match(out, /Mandatory Quality Gates/);
});

test('a missing file is "could not run", not "invalid"', () => {
  const run = spawnSync(process.execPath, [SCRIPT, join(tmpdir(), 'sdd-no-rules-9f3c.md')], { encoding: 'utf8' });
  assert.equal(run.status, 2);
  // The error names where the template lives — a path that must resolve.
  assert.match(`${run.stdout}${run.stderr}`, /skills\/sdd\/rules\/references\/rules-template\.md/);
});
