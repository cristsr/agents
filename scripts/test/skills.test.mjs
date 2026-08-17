// Skill discovery — what both sync scripts and the ecosystem validator walk.
//
// The source tree groups skills by owner at any depth; the installed tree is
// flat. Everything below protects that translation, because its failure modes
// are silent: a skill not discovered is simply never installed, and two sharing
// a name overwrite each other at the destination.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { discoverSkills, duplicateNames, isDir } from '../lib/skills.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** A throwaway source tree: each entry is a path that gets a SKILL.md. */
function tree(paths, extras = []) {
  const root = mkdtempSync(join(tmpdir(), 'sdd-skills-'));
  for (const p of paths) {
    mkdirSync(join(root, p), { recursive: true });
    writeFileSync(join(root, p, 'SKILL.md'), '---\nname: x\n---\n');
  }
  for (const p of extras) mkdirSync(join(root, p), { recursive: true });
  return root;
}

test('discoverSkills finds skills at any depth', () => {
  const root = tree(['sdd/pipeline/plan', 'conventions/typescript', 'flat']);
  try {
    const found = discoverSkills(root);
    assert.deepEqual(found.map((s) => s.name), ['flat', 'plan', 'typescript']);
    assert.equal(found.find((s) => s.name === 'plan').category, 'sdd/pipeline');
    assert.equal(found.find((s) => s.name === 'flat').category, '');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("discoverSkills does not descend into a skill's own subfolders", () => {
  // references/ and scripts/ are the skill's content, not sibling skills. One
  // holding a SKILL.md-shaped file must not register as an installable skill.
  const root = tree(['sdd/plan', 'sdd/plan/references']);
  try {
    assert.deepEqual(discoverSkills(root).map((s) => s.name), ['plan']);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('discoverSkills ignores directories with no SKILL.md', () => {
  const root = tree(['sdd/plan'], ['sdd/notes', 'assets']);
  try {
    assert.deepEqual(discoverSkills(root).map((s) => s.name), ['plan']);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('discoverSkills returns [] for a missing root instead of throwing', () => {
  assert.deepEqual(discoverSkills(join(tmpdir(), 'sdd-does-not-exist-9f3c')), []);
});

test('duplicateNames pairs the two skills that would collide', () => {
  const root = tree(['sdd/docs', 'meta/docs']);
  try {
    const dupes = duplicateNames(discoverSkills(root));
    assert.equal(dupes.length, 1);
    assert.equal(dupes[0][0].name, 'docs');
    assert.notEqual(dupes[0][0].category, dupes[0][1].category);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('duplicateNames is empty for a healthy tree', () => {
  const root = tree(['sdd/plan', 'conventions/typescript']);
  try {
    assert.deepEqual(duplicateNames(discoverSkills(root)), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('isDir answers without throwing on a missing path', () => {
  assert.equal(isDir(REPO), true);
  assert.equal(isDir(join(REPO, 'package.json')), false);
  assert.equal(isDir(join(REPO, 'nope-9f3c')), false);
});

test('this repo installs without a name collision', () => {
  // The real tree, not a fixture: the check that actually protects the install.
  assert.deepEqual(duplicateNames(discoverSkills(join(REPO, 'skills'))), []);
});
