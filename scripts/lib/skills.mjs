// skills.mjs — discovery of the skill sources in `~/.agents/skills/`.
//
// The source tree is organised by OWNER of the knowledge:
//
//   skills/sdd/pipeline/    the ordered walk of a story
//   skills/sdd/workspace/   operations on an existing story, outside the order
//   skills/conventions/     loaded by another skill through `stack.SKILLS`
//   skills/meta/            skills about the ecosystem itself
//
// That layout is for humans reading the repo. Both Claude Code and OpenCode
// resolve `<root>/<name>/SKILL.md` in a single level, so the INSTALLED tree is
// flat — `sync-skills.mjs` generates it. Category folders can be renamed, nested
// deeper or dropped without any skill noticing: a skill is any directory holding
// a `SKILL.md`, at whatever depth.

import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * Every skill under `root`, at any depth.
 * Returns `{ name, dir, category }` — `name` is the directory name (the invocation
 * name), `category` the path between `root` and the skill (`sdd/pipeline`), `''`
 * for a skill sitting directly at the root.
 */
export function discoverSkills(root) {
  const out = [];
  walk(root);
  return out.sort((a, b) => a.name.localeCompare(b.name));

  function walk(dir) {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    if (entries.some((e) => e.isFile() && e.name === 'SKILL.md')) {
      out.push({
        name: dir.split(/[\\/]/).pop(),
        dir,
        category: relative(root, join(dir, '..')).split('\\').join('/'),
      });
      return; // a skill's own subfolders (references/, scripts/) are not skills
    }
    for (const entry of entries) {
      if (entry.isDirectory()) walk(join(dir, entry.name));
    }
  }
}

/** Duplicate invocation names — fatal, since the installed tree is flat. */
export function duplicateNames(skills) {
  const seen = new Map();
  const dupes = [];
  for (const skill of skills) {
    if (seen.has(skill.name)) dupes.push([seen.get(skill.name), skill]);
    else seen.set(skill.name, skill);
  }
  return dupes;
}

export function isDir(path) {
  try { return statSync(path).isDirectory(); } catch { return false; }
}
