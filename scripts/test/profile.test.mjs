// The profile reader every in-project script depends on.
//
// Its contract has one rule that is easy to break and expensive to notice: a key
// holding `null` is NOT configured, so the caller's declared fallback applies —
// it never means "unknown". A reader that returned null instead would hand the
// caller a value it must not use, and the skill would resolve a path of `null/`.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { loadProfile, key, workdir, workdirBase, listStories, storyIdMatcher } from '../lib/profile.mjs';

/** A throwaway project tree. Returns its root; the caller removes it. */
function project(profileYaml, stories = []) {
  const root = mkdtempSync(join(tmpdir(), 'sdd-profile-'));
  if (profileYaml !== null) {
    mkdirSync(join(root, '.agents'), { recursive: true });
    writeFileSync(join(root, '.agents', 'profile.yaml'), profileYaml);
  }
  for (const id of stories) mkdirSync(join(root, 'work', 'active', id), { recursive: true });
  return root;
}

const YAML = `SCHEMA_VERSION: 2

identity:
  PROJECT_NAME: ledger
  ORG: null

items:
  STORY_ID_PATTERN: spec-<number>
  STORY_ID_LEGACY_PREFIXES: [sm-]
  ITEM_TYPES: [feat, bug, debt]

paths:
  WORKDIR_ACTIVE: work/active/{{STORY_ID}}/
  WORKDIR_DONE: work/done/{{STORY_ID}}/
`;

test('loadProfile walks up from a nested directory', () => {
  const root = project(YAML);
  try {
    const nested = join(root, 'src', 'modules', 'ledger');
    mkdirSync(nested, { recursive: true });
    const profile = loadProfile(nested);
    assert.equal(profile.root, resolve(root));
    assert.equal(key(profile, 'PROJECT_NAME'), 'ledger');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('loadProfile degrades instead of throwing when there is no profile', () => {
  // A diagnosis that refuses to run in a project that never bootstrapped is useless.
  const root = project(null);
  try {
    const profile = loadProfile(root);
    assert.equal(profile.path, null);
    assert.equal(profile.data, null);
    assert.equal(profile.root, resolve(root));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('key finds a bare name in whichever block holds it', () => {
  const root = project(YAML);
  try {
    const profile = loadProfile(root);
    assert.equal(key(profile, 'PROJECT_NAME'), 'ledger');
    assert.deepEqual(key(profile, 'ITEM_TYPES'), ['feat', 'bug', 'debt']);
    assert.equal(key(profile, 'SCHEMA_VERSION'), 2);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('key treats null as not-configured and returns the fallback', () => {
  const root = project(YAML);
  try {
    const profile = loadProfile(root);
    assert.equal(key(profile, 'ORG', 'fallback'), 'fallback');
    assert.equal(key(profile, 'NEVER_DECLARED', 'fallback'), 'fallback');
    assert.equal(key({ data: null }, 'ANY', 'fallback'), 'fallback');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('workdir resolves {{STORY_ID}} against the project root', () => {
  const root = project(YAML);
  try {
    const profile = loadProfile(root);
    assert.equal(workdir(profile, 'spec-0042'), resolve(root, 'work/active/spec-0042'));
    assert.equal(workdir(profile, 'spec-0042', 'done'), resolve(root, 'work/done/spec-0042'));
    assert.equal(workdirBase(profile), resolve(root, 'work/active'));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('workdir falls back to the documented default with no profile', () => {
  const root = project(null);
  try {
    const profile = loadProfile(root);
    assert.equal(workdir(profile, 'spec-1'), resolve(root, 'work/active/spec-1'));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('listStories returns the folders, sorted, and [] when the base is absent', () => {
  const root = project(YAML, ['spec-0002', 'spec-0001']);
  try {
    const profile = loadProfile(root);
    assert.deepEqual(listStories(profile), ['spec-0001', 'spec-0002']);
    assert.deepEqual(listStories(profile, 'done'), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('storyIdMatcher accepts the pattern and its legacy prefixes', () => {
  const root = project(YAML);
  try {
    const re = storyIdMatcher(loadProfile(root));
    assert.ok(re.test('spec-0042'));
    assert.ok(re.test('sm-17'), 'a legacy id must keep resolving');
    assert.ok(!re.test('spec-'), 'the number is not optional');
    assert.ok(!re.test('notes'), 'an unrelated folder is not a story');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('storyIdMatcher supports a <name> pattern', () => {
  const root = project('SCHEMA_VERSION: 2\nitems:\n  STORY_ID_PATTERN: <name>\n');
  try {
    const re = storyIdMatcher(loadProfile(root));
    assert.ok(re.test('add-ledger-export'));
    assert.ok(!re.test('has spaces'));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
