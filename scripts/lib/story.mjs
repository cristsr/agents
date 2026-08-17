// story.mjs — reads a story workspace and parses the structural contract the SDD
// skills write into its artifacts.
//
// The headings parsed here are the SAME contract SDD-PIPELINE.md declares under
// "Language": `## Acceptance Criteria`, `### AC-N:`, `## Ambiguity Resolution`,
// `## Global Architecture Impact`, `## Design Decisions`, `### Task N:`,
// `## AC Coverage`. They stay English regardless of ARTIFACT_LANGUAGE, which is
// exactly what makes them parseable — this module is the machine reader that
// contract was always implying.

import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { workdir } from './profile.mjs';

/** `hu.md` is spec.md's legacy name (items predating the rename). */
const SPEC_NAMES = ['spec.md', 'hu.md'];

/**
 * Locates a story in the active workspace, falling back to the done one.
 * Returns the resolved paths and the text of every artifact that exists.
 */
export function readStory(profile, storyId) {
  const active = workdir(profile, storyId, 'active');
  const done = workdir(profile, storyId, 'done');

  let dir = null;
  let location = null;
  if (isDir(active)) { dir = active; location = 'active'; }
  else if (isDir(done)) { dir = done; location = 'done'; }

  const story = { id: storyId, dir, location, activeDir: active, doneDir: done, files: {}, text: {} };
  if (!dir) return story;

  story.files.spec = SPEC_NAMES.map((n) => join(dir, n)).find(existsSync) ?? null;
  for (const [id, name] of [['context', 'context.md'], ['design', 'design.md'], ['plan', 'plan.md']]) {
    const path = join(dir, name);
    story.files[id] = existsSync(path) ? path : null;
  }
  story.files.docs = isDir(join(dir, 'docs')) ? join(dir, 'docs') : null;
  story.files.branch = existsSync(join(dir, '.branch')) ? join(dir, '.branch') : null;

  for (const id of ['spec', 'context', 'design', 'plan']) {
    story.text[id] = story.files[id] ? read(story.files[id]) : null;
  }
  return story;
}

function isDir(path) {
  try { return statSync(path).isDirectory(); } catch { return false; }
}

function read(path) {
  try { return readFileSync(path, 'utf8'); } catch { return null; }
}

// ── spec.md ─────────────────────────────────────────────────────────────────

/** The `---` front-matter as a flat map of scalars, or null when absent. */
export function frontMatter(text) {
  const m = text?.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const out = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/);
    if (kv) out[kv[1]] = kv[2].trim().replace(/^["'](.*)["']$/, '$1');
  }
  return out;
}

/**
 * Every `### AC-N: <title>` under `## Acceptance Criteria`, in order of
 * appearance, with the body text and the scenarios that hang off it.
 */
export function acceptanceCriteria(text) {
  if (!text) return [];
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((l) => /^##\s+Acceptance Criteria\s*$/i.test(l));
  if (start === -1) return [];
  const end = nextHeading(lines, start + 1, 2);

  const acs = [];
  for (let i = start + 1; i < end; i++) {
    const m = lines[i].match(/^###\s+AC-(\d+)\s*:\s*(.*)$/i);
    if (!m) continue;
    const bodyEnd = nextHeading(lines, i + 1, 3, end);
    const block = lines.slice(i + 1, bodyEnd);
    acs.push({
      id: `AC-${m[1]}`,
      number: Number(m[1]),
      title: m[2].trim(),
      line: i + 1,
      body: block.filter((l) => !/^####\s/.test(l)).join('\n').trim(),
      scenarios: scenarios(block),
      ears: block.some((l) => /\b(THE SYSTEM SHALL|SHALL)\b/.test(l)),
    });
  }
  return acs;
}

/** `#### Scenario: <name>` blocks with their WHEN/THEN bullet lines. */
function scenarios(block) {
  const out = [];
  for (let i = 0; i < block.length; i++) {
    const m = block[i].match(/^####\s+Scenario\s*:\s*(.*)$/i);
    if (!m) continue;
    const end = block.findIndex((l, k) => k > i && /^#{1,4}\s/.test(l));
    const body = block.slice(i + 1, end === -1 ? block.length : end);
    out.push({
      name: m[1].trim(),
      steps: body.filter((l) => /^\s*[-*]\s+\*\*(GIVEN|WHEN|THEN|AND)\*\*/i.test(l)),
      hasWhen: body.some((l) => /^\s*[-*]\s+\*\*WHEN\*\*/i.test(l)),
      hasThen: body.some((l) => /^\s*[-*]\s+\*\*THEN\*\*/i.test(l)),
    });
  }
  return out;
}

/** Unresolved `[NEEDS CLARIFICATION: ...]` markers. */
export function clarificationMarkers(text) {
  if (!text) return [];
  return text.split(/\r?\n/).reduce((acc, line, i) => {
    if (/\[NEEDS CLARIFICATION/i.test(line)) acc.push({ line: i + 1, text: line.trim() });
    return acc;
  }, []);
}

// ── plan.md ─────────────────────────────────────────────────────────────────

/**
 * Every `### Task N: <title>` heading, with its `[X]` (done, written by /build at
 * the end of the heading) and `[P]` (parallel group) markers. State lives on the
 * heading line only — the checkbox lists inside a task body are TDD steps.
 */
export function tasks(text) {
  if (!text) return [];
  const lines = text.split(/\r?\n/);
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^###\s+Task\s+(\d+|HOTFIX-\d+)\s*(?:[:—–-]\s*(.*))?$/i);
    if (!m) continue;
    out.push({
      id: `Task ${m[1]}`,
      number: /^\d+$/.test(m[1]) ? Number(m[1]) : null,
      hotfix: /^HOTFIX/i.test(m[1]),
      title: (m[2] ?? '').replace(/\[[xXpP]\]/g, '').trim(),
      line: i + 1,
      parallel: /\[P\]/.test(lines[i]),
      done: /\[[xX]\]/.test(lines[i]),
    });
  }
  return out;
}

/** The `### AC → Task traceability` table, as a map of AC id → raw cell. */
export function traceability(text) {
  if (!text) return null;
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((l) => /^###\s+AC\s*(?:→|->)\s*Task traceability/i.test(l));
  if (start === -1) return null;
  const end = nextHeading(lines, start + 1, 3);
  const map = new Map();
  for (const line of lines.slice(start + 1, end)) {
    const m = line.match(/^\|\s*(AC-\d+)\s*\|\s*(.*?)\s*\|/i);
    if (m) map.set(m[1].toUpperCase(), m[2]);
  }
  return map;
}

/** The `## AC Coverage` section /build appends: one line per AC, ✓ or ✗. */
export function acCoverage(text) {
  if (!text) return null;
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((l) => /^##\s+AC Coverage\s*$/i.test(l));
  if (start === -1) return null;
  const end = nextHeading(lines, start + 1, 2);
  const rows = [];
  for (const line of lines.slice(start + 1, end)) {
    const m = line.match(/^\s*(AC-\d+)\s*:\s*(.*)$/i);
    if (!m) continue;
    rows.push({ id: m[1].toUpperCase(), text: m[2], covered: m[2].includes('✓'), uncovered: m[2].includes('✗') });
  }
  return rows;
}

// ── shared ──────────────────────────────────────────────────────────────────

/** True when a `## Heading` (any level ≤ 3) with this exact name exists. */
export function hasHeading(text, name) {
  if (!text) return false;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^#{2,4}\\s+${escaped}\\s*$`, 'im').test(text);
}

/** The body under a heading, up to the next heading of the same level or higher. */
export function section(text, name) {
  if (!text) return null;
  const lines = text.split(/\r?\n/);
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`^(#{2,4})\\s+${escaped}\\s*$`, 'i');
  const start = lines.findIndex((l) => re.test(l));
  if (start === -1) return null;
  const level = lines[start].match(/^#+/)[0].length;
  const end = nextHeading(lines, start + 1, level);
  return lines.slice(start + 1, end).join('\n').trim();
}

function nextHeading(lines, from, maxLevel, limit = lines.length) {
  for (let i = from; i < limit; i++) {
    const m = lines[i].match(/^(#{1,6})\s/);
    if (m && m[1].length <= maxLevel) return i;
  }
  return limit;
}
