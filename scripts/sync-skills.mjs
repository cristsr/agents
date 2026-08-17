#!/usr/bin/env node
// sync-skills.mjs — installs the skill sources into the flat tree the tools read.
//   npm run skills:sync            # write
//   npm run skills:check           # dry-run: what would change
//   npm run skills:sync -- --prune # also remove orphans it manages
//
// The source (`~/.agents/skills/`) is organised by owner — sdd/pipeline,
// sdd/workspace, conventions, meta. Both Claude Code and OpenCode resolve
// `<root>/<name>/SKILL.md` in a SINGLE level, so the installed tree must be flat.
// This script bridges the two with symlinks: rename a category, nest deeper, move
// a skill between groups — re-run and the tools see the same flat set.
//
// One destination serves both tools: OpenCode reads `~/.claude/skills/` alongside
// its own locations, so there is nothing to duplicate.
//
// Safety, same rules as sync-agents.mjs:
//   · it only ever manages links that point INSIDE the source tree
//   · a real directory (a hand-made copy) is reported, never silently replaced
//   · --prune removes only links into the source tree whose skill is gone
//
// Exit codes: 0 = in sync (or written) · 1 = drift found in --dry-run · 2 = failed

import { readdirSync, existsSync, lstatSync, readlinkSync, symlinkSync, unlinkSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join, relative } from 'node:path';
import { homedir } from 'node:os';
import { discoverSkills, duplicateNames } from './lib/skills.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const SOURCE = join(ROOT, 'skills');
const DEST = join(homedir(), '.claude', 'skills');

const argv = process.argv.slice(2);
const dryRun = argv.includes('--dry-run') || argv.includes('--check');
const prune = argv.includes('--prune');

const skills = discoverSkills(SOURCE);
if (skills.length === 0) {
  console.error(`FAIL: no skill found under ${SOURCE}`);
  process.exit(2);
}

const dupes = duplicateNames(skills);
if (dupes.length) {
  for (const [a, b] of dupes) {
    console.error(`FAIL: duplicate name "${a.name}" (${a.category}/ and ${b.category}/) — the installed tree is flat`);
  }
  process.exit(2);
}

if (!existsSync(DEST)) {
  if (dryRun) console.log(`would create ${DEST}`);
  else mkdirSync(DEST, { recursive: true });
}

const actions = [];
const blocked = [];

// ── Install each source skill ───────────────────────────────────────────────
for (const skill of skills) {
  const link = join(DEST, skill.name);
  const state = inspect(link);

  if (state.kind === 'missing') {
    actions.push({ verb: 'link', skill, link, note: skill.category });
  } else if (state.kind === 'link') {
    if (samePath(state.target, skill.dir)) continue; // already correct
    if (pointsIntoSource(state.target)) {
      actions.push({ verb: 'relink', skill, link, note: `was ${short(state.target)}` });
    } else {
      blocked.push(`${skill.name}: link points outside the source tree (${state.target}) — left untouched`);
    }
  } else {
    // A real directory: could be a hand-made copy that has since diverged.
    blocked.push(`${skill.name}: a real directory exists at ${link} — inspect it, then remove it and re-run`);
  }
}

// ── Orphans: links into the source tree whose skill no longer exists ─────────
const names = new Set(skills.map((s) => s.name));
for (const entry of existsSync(DEST) ? readdirSync(DEST) : []) {
  if (names.has(entry)) continue;
  const link = join(DEST, entry);
  const state = inspect(link);
  if (state.kind !== 'link' || !pointsIntoSource(state.target)) continue;
  const reason = existsSync(join(state.target, 'SKILL.md')) ? 'moved or renamed' : 'target gone';
  if (prune) actions.push({ verb: 'remove', skill: { name: entry }, link, note: reason });
  else blocked.push(`${entry}: orphan link (${reason}) — re-run with --prune to remove it`);
}

// ── Apply ───────────────────────────────────────────────────────────────────
for (const action of actions) {
  const label = `${action.verb.padEnd(7)} ${action.skill.name.padEnd(24)} ${action.note ?? ''}`.trimEnd();
  if (dryRun) { console.log(`would ${label}`); continue; }
  try {
    if (action.verb !== 'link') unlinkSync(action.link);
    if (action.verb !== 'remove') symlinkSync(action.skill.dir, action.link, 'dir');
    console.log(label);
  } catch (err) {
    blocked.push(`${action.skill.name}: ${err.code === 'EPERM'
      ? 'no permission to create symlinks — enable Windows Developer Mode or run as admin'
      : err.message}`);
  }
}

// ── Report ──────────────────────────────────────────────────────────────────
const categories = [...new Set(skills.map((s) => s.category))].sort();
console.log(`\n${skills.length} skills · ${categories.join(' · ')}`);
console.log(`source ${short(SOURCE)}  →  ${DEST} (flat; OpenCode reads it too)`);

if (blocked.length) {
  console.log(`\nNEEDS ATTENTION (${blocked.length}):`);
  for (const b of blocked) console.log(`  ${b}`);
}

if (dryRun && (actions.length || blocked.length)) process.exit(1);
if (!dryRun && !actions.length && !blocked.length) console.log('\nalready in sync — nothing to do');
process.exit(blocked.length ? 1 : 0);

// ── helpers ─────────────────────────────────────────────────────────────────

function inspect(path) {
  let stat;
  try { stat = lstatSync(path); } catch { return { kind: 'missing' }; }
  if (stat.isSymbolicLink()) {
    try { return { kind: 'link', target: resolve(dirname(path), readlinkSync(path)) }; }
    catch { return { kind: 'link', target: '' }; }
  }
  return { kind: 'dir' };
}

function pointsIntoSource(target) {
  const rel = relative(SOURCE, target);
  return rel !== '' && !rel.startsWith('..');
}

function samePath(a, b) {
  const norm = (p) => resolve(p).replace(/[\\/]+$/, '').toLowerCase();
  return norm(a) === norm(b);
}

function short(path) {
  const home = homedir();
  return path.startsWith(home) ? path.replace(home, '~').split('\\').join('/') : path;
}
