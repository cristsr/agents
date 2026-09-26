// validate-profile.mjs end to end — the schema gate a project hits first.
//
// The cases below are the ones where a wrong answer is expensive: a version
// mismatch the developer cannot act on, and a required key left null, which is
// the difference between "not configured, use the fallback" and "misconfigured".

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'validate-profile.mjs');

/** Writes a profile into a throwaway project and validates it. */
function validate(yaml) {
  const root = mkdtempSync(join(tmpdir(), 'sdd-profile-check-'));
  try {
    mkdirSync(join(root, '.agents'), { recursive: true });
    const path = join(root, '.agents', 'profile.yaml');
    writeFileSync(path, yaml);
    const run = spawnSync(process.execPath, [SCRIPT, path], { cwd: root, encoding: 'utf8' });
    return { code: run.status, out: `${run.stdout}${run.stderr}` };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('a v1 profile is told HOW to migrate, not just that it is wrong', () => {
  // The failure a developer meets when they carry a profile across a bump. It
  // has to name the change and the way out, or the version number is a wall.
  const { out } = validate('SCHEMA_VERSION: 1\n');
  assert.match(out, /SCHEMA_VERSION/);
  assert.match(out, /Markdown/, 'the message must say what v1 was');
  assert.match(out, /bootstrap/, 'and how to get to the current shape');
});

test('an unrecognised version says so instead of guessing a migration', () => {
  const { out } = validate('SCHEMA_VERSION: 99\n');
  assert.match(out, /No migration is known/);
});

test('a missing version is reported like any other mismatch', () => {
  const { out } = validate('identity:\n  PROJECT_NAME: x\n');
  assert.match(out, /SCHEMA_VERSION.*found nothing/s);
});

test('a required key left null is an error, not a fallback', () => {
  const { out } = validate('SCHEMA_VERSION: 2\n\nidentity:\n  PROJECT_NAME: null\n');
  assert.match(out, /PROJECT_NAME.*required/s);
});

test('the shipped template still parses against its own validator', () => {
  // The template holds nulls by design, so it reports required keys — what is
  // pinned here is that it PARSES and reaches the rules, rather than blowing up.
  const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const run = spawnSync(
    process.execPath,
    [SCRIPT, join(REPO, 'contracts', 'sdd-profile.template.yaml')],
    { cwd: REPO, encoding: 'utf8' },
  );
  const out = `${run.stdout}${run.stderr}`;
  assert.doesNotMatch(out, /SCHEMA_VERSION/, 'the template must declare the current version');
  assert.match(out, /required/, 'and still report its deliberately-null required keys');
});

test('a null IDENTIFIER_LANGUAGE is warned about — no skill has a default for it', () => {
  // The skills used to suggest English when the key was absent. They no longer do,
  // so the absence has to surface here instead of being resolved per file, by
  // whichever agent happens to be writing code.
  const { out } = validate('SCHEMA_VERSION: 2\n\nlanguage:\n  IDENTIFIER_LANGUAGE: null\n');
  assert.match(out, /IDENTIFIER_LANGUAGE.*not declared/s);
});

test('a declared IDENTIFIER_LANGUAGE is accepted whatever the language is', () => {
  const { out } = validate('SCHEMA_VERSION: 2\n\nlanguage:\n  IDENTIFIER_LANGUAGE: Español\n');
  assert.doesNotMatch(out, /IDENTIFIER_LANGUAGE/);
});

test('a fast-tier type absent from ITEM_TYPES is an error', () => {
  // Same rule as EVIDENCE_MODE_TYPES: a list that names a type no item can carry is
  // an allowlist that gates nothing.
  const { out } = validate('SCHEMA_VERSION: 3\n\nitems:\n  ITEM_TYPES: [feat, bug]\n  FAST_TIER_TYPES: [bug, typo]\n');
  assert.match(out, /FAST_TIER_TYPES.*absent from ITEM_TYPES/s);
});

test('a type allowed to skip everything but not to skip the design is warned about', () => {
  // The two reduced tiers are ordered: a type that may go `fast` may also stop at
  // `standard`, which is strictly more work.
  const { out } = validate('SCHEMA_VERSION: 3\n\nitems:\n  ITEM_TYPES: [feat, bug, debt]\n  FAST_TIER_TYPES: [bug, debt]\n  STANDARD_TIER_TYPES: [feat, bug]\n');
  assert.match(out, /FAST_TIER_TYPES.*STANDARD_TIER_TYPES/s);
});

test('fast-tier types with no TESTS adapter are warned about', () => {
  // A fast story closes its criterion by running its check; with nothing bound it
  // stops, so the declaration and the wiring have to agree.
  const { out } = validate('SCHEMA_VERSION: 3\n\nitems:\n  ITEM_TYPES: [feat, bug]\n  FAST_TIER_TYPES: [bug]\n');
  assert.match(out, /ports\.TESTS/);
});
