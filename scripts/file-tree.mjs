#!/usr/bin/env node
// file-tree.mjs — renders a plan's File Tree from its tasks, deterministically.
//   node ~/.agents/scripts/file-tree.mjs <story-id>           write both renderings
//   node ~/.agents/scripts/file-tree.mjs <story-id> --check   report staleness, write nothing
//
// Reads every task's `**Files:**` lines in plan.md, dedupes them by path, groups
// them by component, and writes:
//   - the `### File Tree` section of plan.md (flat, full path per leaf — the one
//     validate-artifacts checks);
//   - docs/file-tree.md (nested, for human review).
//
// Exit codes: 0 = written / up to date · 1 = stale (--check) · 2 = could not run

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadProfile, key } from './lib/profile.mjs';
import { rel as toRel } from './lib/paths.mjs';
import { readStory, taskFiles } from './lib/story.mjs';
import {
  declaredComponents, consolidate, renderFlat, renderNested, replaceFileTree, currentFileTree,
} from './lib/filetree.mjs';

const argv = process.argv.slice(2);
const check = argv.includes('--check');
const storyId = argv.find((a) => !a.startsWith('--')) ?? null;

if (!storyId) {
  console.error('usage: file-tree.mjs <story-id> [--check]');
  process.exit(2);
}

const profile = loadProfile();
const rel = (p) => toRel(p, profile.root);
const story = readStory(profile, storyId);

if (!story.dir) {
  console.error(`FAIL: no workspace for ${storyId}`);
  process.exit(2);
}
if (!story.files.plan) {
  console.error(`FAIL: ${storyId} has no plan.md — write the tasks first, then render their File Tree`);
  process.exit(2);
}

const plan = story.text.plan;
const files = taskFiles(plan);
if (files.length === 0) {
  console.log(`OK: no task in ${rel(story.files.plan)} declares **Files:** — nothing to render`);
  process.exit(0);
}

const groups = consolidate(files, {
  components: declaredComponents(plan),
  moduleRoot: key(profile, 'MODULE_ROOT'),
});
const flat = renderFlat(groups);
const nested = renderNested(groups, storyId);
const nestedPath = join(story.dir, 'docs', 'file-tree.md');

if (check) {
  const stale = [];
  if (currentFileTree(plan) !== flat.trim()) stale.push(`${rel(story.files.plan)} § File Tree`);
  const onDisk = existsSync(nestedPath) ? readFileSync(nestedPath, 'utf8') : null;
  if (onDisk !== nested) stale.push(rel(nestedPath));
  if (stale.length) {
    console.log(`STALE: ${stale.join(', ')} — run: node ~/.agents/scripts/file-tree.mjs ${storyId}`);
    process.exit(1);
  }
  console.log(`OK: File Tree up to date (${files.length} path(s))`);
  process.exit(0);
}

writeFileSync(story.files.plan, replaceFileTree(plan, flat));
mkdirSync(join(story.dir, 'docs'), { recursive: true });
writeFileSync(nestedPath, nested);

const all = groups.flatMap((g) => g.files);
const count = (kind) => all.filter((f) => f.kind === kind).length;
console.log(
  `OK: ${all.length} file(s) across ${groups.length} component(s) — ` +
    `${count('create')} create · ${count('modify')} modify · ${count('delete')} delete · ${count('test')} test`,
);
console.log(`  wrote ${rel(story.files.plan)} § File Tree`);
console.log(`  wrote ${rel(nestedPath)}`);
