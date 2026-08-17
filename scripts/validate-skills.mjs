#!/usr/bin/env node
// validate-skills.mjs — SDD ecosystem healthcheck (Node port of validate-skills.sh)
// Checks:
//   1. Every profile key referenced by the skills exists in sdd-profile.template.yaml
//   2. Every profile block a skill cites ("stack block") exists in the template
//   3. Ports: the catalog (PORTS.md), the template's ports block, each pack's
//      ports.yaml, and the skills that call them — a port must appear in all three
//   4. Every local references/<file> path referenced by a skill exists in that skill
//   5. Every <STACK_REFS>/<file> template exists in the generic pack (the fallback
//      floor every project shares); an <STACK_REFS>/architecture/ reference is an
//      error — packs carry no guides, the framework concretion lives in the skill
// Usage: node validate-skills.mjs

import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { discoverSkills, duplicateNames } from './lib/skills.mjs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SKILLS = join(ROOT, 'skills');
const TEMPLATE = join(ROOT, 'sdd-profile.template.yaml');
const STACKS = join(ROOT, 'stacks');
const PACKS = ['generic', 'typescript', 'nestjs'];
const CATALOG = join(ROOT, 'PORTS.md');

const STOP_KEYS = /^(AC|ACs|API|CI|DTO|DTOs|EARS|FAIL|FTS5|NEW|NEXT|OK|PASS|PR|REST|SQL|TDD|TODO|UI|UUID|YAML|X|Y|Z|M|N|P|A|B|C)$/;

let issues = 0;
const report = (m) => { console.log(m); issues++; };
const readLines = (f) => readFileSync(f, 'utf8').split(/\r?\n/);
const isFile = (p) => { try { return statSync(p).isFile(); } catch { return false; } };

// The skill directories, at whatever depth the source tree nests them
// (skills/sdd/pipeline/clarify/, skills/conventions/nestjs/, …).
const skillDirs = () => discoverSkills(SKILLS);

// Skill files, excluding the two meta skills (they teach the format, they don't
// carry it) — same `-not -path '*/skill-creator/*' ...` the bash script used.
function skillFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (entry.name === 'skill-creator' || entry.name === 'skill-evaluator') continue;
      out.push(...skillFiles(join(dir, entry.name)));
    } else if (entry.name.endsWith('.md')) {
      out.push(join(dir, entry.name));
    }
  }
  return out;
}

// --- 1. Keys defined in the template ---
// The template is YAML: a key is `  KEY:` under a block, never backticked. Lines
// whose first non-blank character is `#` are commentary and must not count as
// definitions — the comments name keys they only refer to. SCHEMA_VERSION sits at
// the top level with no indentation, so it is added by hand.
const defined = new Set(['SCHEMA_VERSION']);
for (const line of readLines(TEMPLATE)) {
  const m = line.match(/^\s+([A-Z][A-Z0-9_]{2,})(?=:)/);
  if (m && !STOP_KEYS.test(m[1])) defined.add(m[1]);
}
if (defined.size === 0) {
  console.error(`FAIL: no keys found in ${TEMPLATE} — is the template still YAML?`);
  process.exit(2);
}

// --- 2. Keys referenced by the skills (non-meta) ---
const referenced = new Set();
for (const f of skillFiles(SKILLS)) {
  const text = readFileSync(f, 'utf8');
  for (const m of text.matchAll(/(?<=`)([A-Z][A-Z0-9_]{2,})(?=`)/g)) {
    if (!STOP_KEYS.test(m[1])) referenced.add(m[1]);
  }
}
const warnings = [...referenced].filter((k) => !defined.has(k)).sort();
if (warnings.length) {
  console.log('WARNINGS — backticked tokens that are not profile keys (check whether any is new):');
  for (const w of warnings) console.log(`  ${w}`);
}

// --- 2b. Profile blocks cited by the skills ---
// The template's blocks are its top-level keys. A skill cites one as "stack block".
// Only lines that also mention the profile are considered, so prose like "framing
// block" or "Contract block" never registers as a bad citation.
const blocks = new Set();
for (const line of readLines(TEMPLATE)) {
  const m = line.match(/^([a-z][a-z_]*)(?=:)/);
  if (m) blocks.add(m[1]);
}
const blockLineRe = new RegExp(`\\b(${[...blocks].join('|')}|[a-z_]+) block\\b`);
const stopBlockRe = /\b(framing|Contract|code|following|this|that|the) block\b/;
const citedRe = /(?<!\w)([a-z][a-z_]+)(?= block\b)/g;
const staleRe = /.{0,30}profile.{0,20}section \d+|section \d+.{0,20}profile.{0,10}/gi;

for (const f of skillFiles(SKILLS)) {
  const text = readFileSync(f, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    let m;
    staleRe.lastIndex = 0;
    while ((m = staleRe.exec(line)) !== null) {
      report(`ISSUE [${f}]: stale reference to the old numbered profile — ${m[0]}`);
    }
    if (!/profile/.test(line)) continue;
    if (!blockLineRe.test(line)) continue;
    if (stopBlockRe.test(line)) continue;
    for (const cm of line.matchAll(citedRe)) {
      if (!blocks.has(cm[1])) {
        report(`ISSUE [${f}]: cites a profile block that does not exist: '${cm[1]} block'`);
      }
    }
  }
}

// --- 2c. Ports: catalog ↔ template ↔ packs ↔ skills ---
if (!existsSync(CATALOG)) {
  report(`ISSUE: missing port catalog ${CATALOG}`);
} else {
  const catalogPorts = new Set();
  for (const line of readLines(CATALOG)) {
    const m = line.match(/^### `([A-Z][A-Z0-9_]+)`/);
    if (m) catalogPorts.add(m[1]);
  }

  // In the template the ports are the keys nested one level under `ports:`.
  const templatePorts = new Set();
  {
    let inPorts = false;
    for (const line of readLines(TEMPLATE)) {
      if (/^ports:/.test(line)) { inPorts = true; continue; }
      if (/^[a-z]/.test(line)) inPorts = false;
      if (inPorts && /^  [A-Z]/.test(line)) templatePorts.add(line.trim().replace(/[: ]/g, ''));
    }
  }

  for (const p of catalogPorts) {
    if (!templatePorts.has(p)) report(`ISSUE [PORTS.md]: ${p} is in the catalog but not declared in the template`);
  }
  for (const p of templatePorts) {
    if (!catalogPorts.has(p)) report(`ISSUE [${TEMPLATE}]: port ${p} is not documented in PORTS.md`);
  }

  // Each pack's ports.yaml may only declare ports from the catalog: a typo there
  // is silently inherited by every project on that stack.
  for (const pack of PACKS) {
    const pf = join(STACKS, pack, 'ports.yaml');
    if (!existsSync(pf)) { report(`ISSUE [${pack}]: pack has no ports.yaml`); continue; }
    for (const line of readLines(pf)) {
      const m = line.match(/^([A-Z][A-Z0-9_]+)(?=:)/);
      if (m && !catalogPorts.has(m[1])) report(`ISSUE [${pf}]: declares a port that is not in the catalog: ${m[1]}`);
    }
  }

  // Ports called from a skill: `PORT.operation` or "`PORT` (port)". The first
  // alternative excludes file-extension tokens (`PORTS.md`, `api.yaml`).
  const portCallRe =
    /(?<=`)([A-Z][A-Z0-9_]{2,})(?=\.(?!md`|ya?ml`|json`|sh`|ts`|js`|py`|txt`)[a-z]+`)|(?<=`)([A-Z][A-Z0-9_]{2,})(?=` \(port\))/g;
  for (const f of skillFiles(SKILLS)) {
    const text = readFileSync(f, 'utf8');
    const seen = new Set();
    for (const m of text.matchAll(portCallRe)) {
      const p = m[1] ?? m[2];
      if (seen.has(p)) continue;
      seen.add(p);
      if (!catalogPorts.has(p)) report(`ISSUE [${f}]: calls a port that is not in the catalog: ${p}`);
    }
  }
}

// --- 3. Local references/<file> paths + cross-skill references ---
// A skill consults its own `references/<file>` (must exist locally) or another
// skill's, written in the prose form "the `<skill>` skill's `references/<file>`"
// (validated against that skill's folder; cross-skill `../<skill>/references/...`
// spellings are ignored as before).
const crossRe = /the[\s>]+`([a-z][a-z0-9-]+)`[\s>]+skill['’]s[\s>]+`(references\/[A-Za-z0-9_./-]+\.(?:md|sh))`/g;
const localRe = /(?<![./])(references\/[A-Za-z0-9_./-]+\.md)/g;
for (const f of skillFiles(SKILLS)) {
  const text = readFileSync(f, 'utf8');
  const dir = dirname(f);
  const crossRanges = [];
  for (const m of text.matchAll(crossRe)) {
    // The cited skill is located by NAME, wherever its category folder sits —
    // prose says "the `nestjs` skill's `references/…`", never a path, so moving a
    // skill between categories must not break a citation.
    const cited = skillDirs().find((s) => s.name === m[1]);
    const target = cited ? join(cited.dir, m[2]) : null;
    if (!target || !isFile(target)) report(`ISSUE [${f}]: references a file that does not exist in the '${m[1]}' skill: ${m[2]}`);
    crossRanges.push([m.index, m.index + m[0].length]);
  }
  for (const m of text.matchAll(localRe)) {
    if (crossRanges.some(([s, e]) => m.index >= s && m.index < e)) continue;
    if (!isFile(resolve(dir, m[1]))) report(`ISSUE [${f}]: missing local file ${m[1]}`);
  }
}

// --- 4. <STACK_REFS>/<file> paths ---
// A skill writes `<STACK_REFS>/<file>` only for the TEMPLATE references the packs
// carry (config + templates). Packs no longer hold architecture/ guides — the
// per-framework concretion lives in the framework skill's own references/, so an
// `<STACK_REFS>/architecture/` reference here is a mistake, not a miss.
const stackRe = /<STACK_REFS>\/([A-Za-z0-9_./-]+\.(?:md|sh))/g;
for (const f of skillFiles(SKILLS)) {
  const text = readFileSync(f, 'utf8');
  for (const m of text.matchAll(stackRe)) {
    const ref = m[1];
    if (ref.startsWith('architecture/')) {
      report(`ISSUE [${f}]: ${ref} — packs no longer hold architecture/ guides; the framework concretion lives in the framework skill's references/`);
    } else if (!isFile(join(STACKS, 'generic', ref))) {
      report(`ISSUE [${f}]: ${ref} missing from the generic pack — a project with no specific pack cannot resolve it`);
    }
  }
}

// --- 5. Chat output conventions ---
// Every conversational skill must announce, carry an ## Output language section,
// and cite the shared chat-conventions.md. The convention skills (typescript,
// error-handling, hexagonal-architecture, design-principles) and the two meta
// skills (already skipped by skillFiles) are exempt.
const CHAT_CONVENTIONS = join(ROOT, 'references', 'chat-conventions.md');
const CHAT_EXEMPT = new Set(['typescript', 'nestjs', 'error-handling', 'hexagonal-architecture', 'design-principles']);
if (!isFile(CHAT_CONVENTIONS)) {
  report(`ISSUE: missing shared ${CHAT_CONVENTIONS}`);
} else {
  for (const { name, dir } of skillDirs()) {
    if (name === 'skill-creator' || name === 'skill-evaluator') continue;
    if (CHAT_EXEMPT.has(name)) continue;
    const f = join(dir, 'SKILL.md');
    if (!isFile(f)) continue;
    const text = readFileSync(f, 'utf8');
    if (!/Announce at start/.test(text)) {
      report(`ISSUE [${f}]: missing "Announce at start" (chat output conventions)`);
    }
    if (!/^## Output language/m.test(text)) {
      report(`ISSUE [${f}]: missing "## Output language" section`);
    }
    if (!/chat-conventions\.md/.test(text)) {
      report(`ISSUE [${f}]: does not cite the shared chat-conventions.md`);
    }
  }
}

// --- 6. Unique invocation names across categories ---
// The source tree groups skills into folders; the installed tree is flat, so two
// skills sharing a name in different categories would collide on install.
for (const [a, b] of duplicateNames(skillDirs())) {
  report(`ISSUE: duplicate skill name "${a.name}" — ${a.category}/ and ${b.category}/ would install to the same place`);
}

if (issues === 0) {
  const all = skillDirs();
  const byCategory = [...new Set(all.map((s) => s.category))].sort();
  console.log(`note: ${all.length} skills in ${byCategory.length} categories (${byCategory.join(', ')})`);
  console.log(`OK: ${defined.size} profile keys, no issues.`);
  process.exit(0);
} else {
  console.log(`ISSUES (${issues}):`);
  process.exit(1);
}
