// profile.mjs — shared reader for a project's `.agents/profile.yaml`.
// Used by the scripts that run INSIDE a project (status.mjs,
// validate-artifacts.mjs); `validate-profile.mjs` owns its own parser because it
// validates the file's shape rather than consuming it.
//
// Everything here degrades: with no profile, the caller gets the documented
// fallbacks instead of an error, because a diagnosis that refuses to run in a
// project that never bootstrapped is useless.

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';

// ── YAML parsing ────────────────────────────────────────────────────────────
// js-yaml when available (resolved from ~/.agents/node_modules regardless of the
// project we are invoked from). The keys these scripts read are two levels deep
// at most, so the fallback only has to handle `block:` → `KEY: value`.
let parse;
try {
  const { load } = await import('js-yaml');
  parse = (text) => load(text);
} catch {
  parse = miniParse;
}

function miniParse(text) {
  const root = {};
  let block = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\s+#.*$/, '').replace(/^#.*$/, '');
    if (!line.trim()) continue;
    const indent = line.length - line.trimStart().length;
    const m = line.trim().match(/^([A-Za-z_][A-Za-z0-9_]*):(.*)$/);
    if (!m) continue;
    const [, key, rest] = m;
    const value = rest.trim();
    if (indent === 0) {
      if (value === '') { root[key] = {}; block = root[key]; }
      else { root[key] = scalar(value); block = null; }
      continue;
    }
    if (block) block[key] = value === '' ? null : scalar(value);
  }
  return root;
}

function scalar(raw) {
  const v = raw.trim();
  if (v === '' || v === 'null' || v === '~') return null;
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (/^\[.*\]$/.test(v)) {
    const inner = v.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(',').map((s) => scalar(s));
  }
  if (/^-?\d+$/.test(v)) return Number(v);
  return v.replace(/^["'](.*)["']$/, '$1');
}

// ── Loading ─────────────────────────────────────────────────────────────────

/**
 * Walks up from `startDir` looking for `.agents/profile.yaml`.
 * Returns `{ path, data, root }` — `path`/`data` are null when none is found,
 * and `root` falls back to `startDir` so callers always have a base to resolve
 * relative paths against.
 */
export function loadProfile(startDir = process.cwd()) {
  let dir = resolve(startDir);
  for (;;) {
    const candidate = join(dir, '.agents', 'profile.yaml');
    if (existsSync(candidate)) {
      let data = null;
      try {
        data = parse(readFileSync(candidate, 'utf8'));
      } catch {
        data = null;
      }
      return { path: candidate, data, root: dir };
    }
    const parent = dirname(dir);
    if (parent === dir) return { path: null, data: null, root: resolve(startDir) };
    dir = parent;
  }
}

/**
 * Reads a bare key name from whichever block holds it — skills cite keys by name
 * (`WORKDIR_ACTIVE`), not by path. A key holding null is NOT configured, so the
 * caller's declared fallback applies.
 */
export function key(profile, name, fallback = null) {
  const data = profile?.data;
  if (!data || typeof data !== 'object') return fallback;
  if (data[name] !== undefined && data[name] !== null) return data[name];
  for (const block of Object.values(data)) {
    if (block && typeof block === 'object' && !Array.isArray(block)) {
      if (block[name] !== undefined && block[name] !== null) return block[name];
    }
  }
  return fallback;
}

// ── Story workspaces ────────────────────────────────────────────────────────

const DEFAULT_ACTIVE = 'work/active/{{STORY_ID}}/';
const DEFAULT_DONE = 'work/done/{{STORY_ID}}/';

/** Absolute path of a story's workspace. `which` is 'active' | 'done'. */
export function workdir(profile, storyId, which = 'active') {
  const raw = which === 'done'
    ? key(profile, 'WORKDIR_DONE', DEFAULT_DONE)
    : key(profile, 'WORKDIR_ACTIVE', DEFAULT_ACTIVE);
  const pattern = typeof raw === 'string' && raw.trim() ? raw : (which === 'done' ? DEFAULT_DONE : DEFAULT_ACTIVE);
  return resolve(profile.root, pattern.replace(/\{\{STORY_ID\}\}/g, storyId));
}

/** The directory the per-story folders live in (the workdir minus {{STORY_ID}}). */
export function workdirBase(profile, which = 'active') {
  const raw = which === 'done'
    ? key(profile, 'WORKDIR_DONE', DEFAULT_DONE)
    : key(profile, 'WORKDIR_ACTIVE', DEFAULT_ACTIVE);
  const pattern = typeof raw === 'string' && raw.trim() ? raw : (which === 'done' ? DEFAULT_DONE : DEFAULT_ACTIVE);
  const cut = pattern.indexOf('{{STORY_ID}}');
  const base = cut === -1 ? pattern : pattern.slice(0, cut);
  return resolve(profile.root, base || '.');
}

/** Every story folder under the active (or done) base, sorted by name. */
export function listStories(profile, which = 'active') {
  const base = workdirBase(profile, which);
  if (!existsSync(base)) return [];
  try {
    return readdirSync(base)
      .filter((name) => {
        try { return statSync(join(base, name)).isDirectory(); } catch { return false; }
      })
      .sort();
  } catch {
    return [];
  }
}

/**
 * Turns `STORY_ID_PATTERN` (`spec-<number>`, `SPEC-<number>`, `<name>`) into a
 * regex. Legacy prefixes are accepted alongside the current pattern.
 */
export function storyIdMatcher(profile) {
  const pattern = key(profile, 'STORY_ID_PATTERN', 'spec-<number>');
  const legacy = key(profile, 'STORY_ID_LEGACY_PREFIXES', []) ?? [];
  const toSource = (p) =>
    String(p)
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/<number>/gi, '\\d+')
      .replace(/<name>/gi, '[A-Za-z0-9._-]+');
  const sources = [toSource(pattern)];
  for (const prefix of Array.isArray(legacy) ? legacy : [legacy]) {
    if (prefix) sources.push(`${toSource(prefix)}\\d+`);
  }
  return new RegExp(`^(?:${sources.join('|')})$`, 'i');
}
