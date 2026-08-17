#!/usr/bin/env node
// validate-profile.mjs — validates a project's `.agents/profile.yaml` against the
// SDD contract. Run after every profile edit:
//   node ~/.agents/scripts/validate-profile.mjs [.agents/profile.yaml]
//
// The STRUCTURE (which blocks and keys exist) is derived from
// `~/.agents/contracts/sdd-profile.template.yaml`, so adding a key to the template
// registers it here automatically. The RULES below — required, enums, cross-checks — are the
// only thing this file owns.
//
// Exit codes: 0 = valid · 1 = issues found · 2 = could not run (bad args, no parser)

import { readFileSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, isAbsolute } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const TEMPLATE = resolve(HERE, '..', 'contracts', 'sdd-profile.template.yaml');

// ── YAML parsing ────────────────────────────────────────────────────────────
// js-yaml when available (resolved from ~/.agents/node_modules regardless of the
// project we are invoked from). The profile is a two-level map of scalars and
// lists, so a minimal fallback parser keeps the validator usable on a machine
// where `npm install` was never run in ~/.agents.
let parse;
try {
  const { load } = await import('js-yaml');
  parse = (text) => load(text);
} catch {
  parse = miniParse;
}

function miniParse(text) {
  // Indentation stack: the profile nests three deep (ports → PORT → operation).
  // A key with no inline value opens a level; whether that level turns out to be a
  // map or a list is only known when its first child appears, so a list item
  // rewrites the placeholder its parent key is holding.
  const root = {};
  const stack = [{ indent: -1, node: root, lastKey: null }];

  for (const raw of text.split(/\r?\n/)) {
    const line = stripComment(raw);
    if (!line.trim()) continue;
    const indent = line.length - line.trimStart().length;
    const body = line.trim();

    if (body === '-' || body.startsWith('- ')) {
      // Climb to the nearest level that actually owns a key.
      while (stack.length > 1 && (stack[stack.length - 1].lastKey === null ||
                                  indent <= stack[stack.length - 1].indent)) {
        stack.pop();
      }
      const top = stack[stack.length - 1];
      if (top.lastKey === null) continue;
      if (!Array.isArray(top.node[top.lastKey])) top.node[top.lastKey] = [];
      top.node[top.lastKey].push(scalar(body.replace(/^-\s*/, '')));
      continue;
    }

    const m = body.match(/^([A-Za-z_][A-Za-z0-9_]*):(.*)$/);
    if (!m) continue;
    const [, key, rest] = m;
    const value = rest.trim();

    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) stack.pop();
    const top = stack[stack.length - 1];

    if (value === '') {
      const child = {};
      top.node[key] = child;
      top.lastKey = key;
      stack.push({ indent, node: child, lastKey: null });
    } else {
      top.node[key] = scalar(value);
      top.lastKey = key;
    }
  }
  return root;
}

function stripComment(line) {
  let out = '';
  let quote = null;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quote) { if (c === quote) quote = null; }
    else if (c === '"' || c === "'") quote = c;
    else if (c === '#' && (i === 0 || /\s/.test(line[i - 1]))) break;
    out += c;
  }
  return out;
}

function scalar(v) {
  const s = v.trim().replace(/^(["'])(.*)\1$/, '$2');
  if (s === 'null' || s === '~' || s === '') return null;
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (/^-?\d+$/.test(s)) return Number(s);
  if (s.startsWith('[') && s.endsWith(']')) {
    const inner = s.slice(1, -1).trim();
    return inner ? inner.split(',').map((x) => scalar(x)) : [];
  }
  return s;
}

// ── Rules ───────────────────────────────────────────────────────────────────
const SCHEMA_VERSION = 2;

// Keys a project cannot leave null — the pipeline cannot resolve a fallback.
const REQUIRED = [
  'identity.PROJECT_NAME',
  'items.STORY_ID_PREFIX',
  'items.STORY_ID_PATTERN',
  'items.ITEM_TYPES',
  'paths.WORKING_DIRECTORY',
  'paths.WORKDIR_ACTIVE',
  'paths.WORKDIR_DONE',
  'language.OUTPUT_LANGUAGE',
  'vcs.BASE_BRANCH',
  'stack.COMPONENT_TERM',
  'stack.LANGUAGE',
  'stack.ARCHITECTURE',
  'stack.MODULE_ROOT',
  'stack.TEST_FRAMEWORK',
];

const ENUMS = {
  'items.STORY_ID_MODE': ['sequential', 'name', 'tracker-code'],
  'vcs.REPO_TOPOLOGY': ['mono-repo', 'multi-repo'],
  'docs.API_CONTRACT_MODE': ['delta', 'full'],
  'docs.DESIGN_OUTPUT_MODE': ['full', 'full-flow'],
  'stack.DIAGRAM_FORMAT': ['Mermaid', 'PlantUML'],
};

// Keys whose value must be a list, even when empty. (null still means
// "not configured" and skips the check.)
const LISTS = [
  'items.STORY_ID_LEGACY_PREFIXES',
  'items.ITEM_TYPES',
  'items.EVIDENCE_MODE_TYPES',
  'intake.INTAKE_FORMATS',
  'mcp.EXPECTED',
  'stack.SKILLS',
];


// Keys holding a filesystem path that must exist when set. Relative paths resolve
// against the profile's project root.
const PATHS_ON_DISK = [
  'paths.WORKING_DIRECTORY',
  'stack.STACK_REFS',
  'stack.MODULE_ROOT',
];

const issues = [];
const warnings = [];
const notes = [];
const issue = (key, msg) => issues.push(`${key}: ${msg}`);
const warn = (key, msg) => warnings.push(`${key}: ${msg}`);

// ── Load ────────────────────────────────────────────────────────────────────
const target = process.argv[2] ?? '.agents/profile.yaml';
if (!existsSync(target)) {
  console.error(`FAIL: no profile at ${target}`);
  console.error(`Copy the template and fill it in:\n  cp ${TEMPLATE} .agents/profile.yaml`);
  process.exit(2);
}

let profile;
try {
  profile = parse(readFileSync(target, 'utf8'));
} catch (err) {
  console.error(`FAIL: ${target} is not valid YAML\n  ${err.message}`);
  process.exit(1);
}
if (!profile || typeof profile !== 'object') {
  console.error(`FAIL: ${target} parsed to nothing — is it empty?`);
  process.exit(1);
}

let template = null;
if (existsSync(TEMPLATE)) {
  try { template = parse(readFileSync(TEMPLATE, 'utf8')); } catch { /* structure check skipped */ }
}
if (!template) warn('template', `could not read ${TEMPLATE} — key-name check skipped`);

const projectRoot = resolve(dirname(resolve(target)), '..');
const get = (path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), profile);
const isSet = (v) => v != null && v !== '' && !(Array.isArray(v) && v.length === 0);

// ── 1. Schema version ───────────────────────────────────────────────────────
// A version mismatch is the one issue where naming the expected number is not
// enough: the developer is holding a file written against an older contract and
// needs to know what changed, not that a digit differs. Each known predecessor
// gets its migration; anything else is reported as unrecognised rather than
// guessed at.
const MIGRATIONS = {
  1: 'v1 was the Markdown profile with numbered sections. Migrate by running /bootstrap, '
   + 'which rewrites it as YAML blocks, and carry your old values across — the key NAMES '
   + 'did not change, only their container. Skills no longer cite "section <n>".',
};

if (profile.SCHEMA_VERSION !== SCHEMA_VERSION) {
  const found = profile.SCHEMA_VERSION ?? 'nothing';
  const migration = MIGRATIONS[found];
  issue(
    'SCHEMA_VERSION',
    `expected ${SCHEMA_VERSION}, found ${found}. `
    + (migration
      ? `${migration} The full guide: ~/.agents/skills/sdd/bootstrap/references/profile-guide.md § "Schema versions".`
      : 'No migration is known for that value — compare against contracts/sdd-profile.template.yaml, '
      + 'or re-run /bootstrap to regenerate the profile from the current schema.'),
  );
}

// ── 2. Structure: blocks and key names against the template ─────────────────
// `ports` is the one block with a third level (port → operation → adapters); it is
// checked in its own pass below.
let keyCount = 0;
for (const [block, body] of Object.entries(profile)) {
  if (block === 'SCHEMA_VERSION') continue;
  if (body == null || typeof body !== 'object' || Array.isArray(body)) {
    issue(block, 'top level holds only SCHEMA_VERSION and named blocks');
    continue;
  }
  keyCount += Object.keys(body).length;
  if (!template) continue;
  if (!(block in template)) { warn(block, 'unknown block — not in the template'); continue; }
  if (block === 'ports') continue;
  for (const key of Object.keys(body)) {
    if (key in template[block]) continue;
    warn(`${block}.${key}`, 'unknown key — not in the template');
  }
}
if (template) {
  for (const [block, body] of Object.entries(template)) {
    if (block === 'SCHEMA_VERSION') continue;
    if (!(block in profile)) { issue(block, 'block missing from the profile'); continue; }
    if (block === 'ports') continue;
    for (const key of Object.keys(body)) {
      if (!(key in profile[block])) warn(`${block}.${key}`, 'key missing — the skills will read it as null');
    }
  }
}

// ── 2b. Ports: capability wiring ────────────────────────────────────────────
// The template is the registry of valid ports and operations — it mirrors the
// catalog in ~/.agents/contracts/PORTS.md, which validate-skills.mjs keeps in sync.
//
// Adapters resolve in layers: the stack packs first (base → specific, later wins),
// the profile on top. What a skill actually gets is the resolved value, so that is
// what "unbound" is measured against — a port left null here is bound if a pack
// binds it.
const ADAPTER_FORMS = /^(mcp:[\w.-]+|agent:[\w.-]+(\?model=[\w.-]+)?|inline|[^\s].*)$/;
const unbound = [];
const inherited = [];
const ports = profile.ports;
const expectedMcp = Array.isArray(get('mcp.EXPECTED')) ? get('mcp.EXPECTED') : [];
const skippedMcp = new Set();

// STACK_REFS is a list of pack paths, ordered base → specific: the language pack
// first (e.g. `~/.agents/stacks/typescript`), a framework pack on top
// (e.g. `~/.agents/stacks/nestjs`). Adapters merge across the layers — a later
// pack's operation replaces an earlier one — and the profile overrides on top.
let packPorts = null;
const stackRefs = get('stack.STACK_REFS');
if (isSet(stackRefs)) {
  const home = process.env.HOME ?? process.env.USERPROFILE ?? '~';
  const list = Array.isArray(stackRefs) ? stackRefs : [stackRefs];
  if (list.some((p) => typeof p !== 'string' || !p.trim())) {
    issue('stack.STACK_REFS', 'must be a list of pack paths (a single path string also works)');
  } else {
    const merged = {};
    for (const ref of list) {
      const packRoot = ref.replace(/^~/, home);
      const packDir = isAbsolute(packRoot) ? packRoot : resolve(projectRoot, packRoot);

      const packFile = resolve(packDir, 'ports.yaml');
      if (!existsSync(packFile)) {
        warn('stack.STACK_REFS', `pack has no ports.yaml — nothing to inherit (${packFile})`);
      } else {
        let pack;
        try { pack = parse(readFileSync(packFile, 'utf8')); }
        catch (err) { issue('stack.STACK_REFS', `pack ports.yaml is not valid YAML: ${err.message}`); }
        for (const [port, ops] of Object.entries(pack ?? {})) {
          if (ops == null || typeof ops !== 'object' || Array.isArray(ops)) continue;
          merged[port] = { ...(merged[port] ?? {}), ...ops };
        }
      }

      // A Python project pointing at the TypeScript pack gets absurd templates halfway
      // through the pipeline. The pack name is the cheapest place to catch it.
      const packName = packDir.replace(/[\\/]+$/, '').split(/[\\/]/).pop()?.toLowerCase() ?? '';
      if (packName && packName !== 'generic') {
        const norm = (v) => (typeof v === 'string' ? v.toLowerCase().replace(/[^a-z0-9]/g, '') : '');
        const lang = norm(get('stack.LANGUAGE'));
        const fw = norm(get('stack.FRAMEWORK'));
        const flat = packName.replace(/[^a-z0-9]/g, '');
        const matches = (lang && flat.includes(lang)) || (fw && flat.includes(fw));
        if ((lang || fw) && !matches) {
          warn('stack.STACK_REFS', `pack "${packName}" doesn't look like it matches LANGUAGE/FRAMEWORK (${get('stack.LANGUAGE')} / ${get('stack.FRAMEWORK')})`);
        }
      }
    }
    packPorts = merged;
  }
}

// The effective adapter list for a port operation, after both layers.
const resolveOp = (port, op, own) => {
  if (own != null) return own;                       // [] included: an explicit override
  return packPorts?.[port]?.[op] ?? null;            // null/omitted: inherit
};
if (ports != null && (typeof ports !== 'object' || Array.isArray(ports))) {
  issue('ports', 'must be a map of PORT → operation → list of adapters');
} else if (ports && template?.ports) {
  for (const [port, ops] of Object.entries(ports)) {
    const path = `ports.${port}`;
    if (!(port in template.ports)) {
      warn(path, 'unknown port — not in the catalog (~/.agents/contracts/PORTS.md)');
      continue;
    }
    if (ops == null || typeof ops !== 'object' || Array.isArray(ops)) {
      issue(path, 'must be a map of operation → list of adapters');
      continue;
    }
    const declared = Object.keys(template.ports[port] ?? {});
    let bound = false;
    let fromPack = false;
    for (const op of new Set([...Object.keys(ops), ...declared])) {
      const opPath = `${path}.${op}`;
      if (declared.length && !declared.includes(op)) {
        issue(opPath, `unknown operation — ${port} declares: ${declared.join(', ')}`);
        continue;
      }
      const own = ops[op];
      if (own != null && !Array.isArray(own)) {
        issue(opPath, 'must be a list of adapters, even with a single one');
        continue;
      }
      const adapters = resolveOp(port, op, own);
      if (adapters == null) continue;              // nothing here, nothing in the pack
      if (!Array.isArray(adapters)) {
        issue(opPath, `the pack declares a non-list for this operation: ${JSON.stringify(adapters)}`);
        continue;
      }
      if (own == null && adapters.length) fromPack = true;
      // An `mcp:` adapter names a tool the harness exposes. Tool names follow
      // `mcp__<server>__<tool>`; anything else is taken as the server name itself.
      // Severity depends on who declared it: a pack adapter is an *opportunity* —
      // without the server it is simply unavailable and the chain moves on — while
      // one written in this file is a contradiction with its own mcp.EXPECTED.
      for (const a of adapters) {
        if (typeof a !== 'string' || !a.startsWith('mcp:')) continue;
        const tool = a.slice(4);
        const server = tool.startsWith('mcp__') ? tool.split('__')[1] : tool;
        if (expectedMcp.includes(server)) continue;
        if (Array.isArray(own) && own.includes(a)) {
          issue(opPath, `adapter "${a}" needs MCP server "${server}", which is not in mcp.EXPECTED`);
        } else {
          skippedMcp.add(`${server} (${port})`);
        }
      }

      // Only validate the adapters this file owns — the pack's are the pack's problem,
      // and validate-skills.mjs checks those where they live.
      (own ?? []).forEach((a, i) => {
        if (typeof a !== 'string' || !a.trim()) {
          issue(`${opPath}[${i}]`, 'adapter must be a non-empty string');
          return;
        }
        if (!ADAPTER_FORMS.test(a)) issue(`${opPath}[${i}]`, `not a valid adapter form: "${a}"`);
        // `inline` never fails, so anything after it can never be reached.
        if (a === 'inline' && i !== own.length - 1) {
          issue(`${opPath}[${i}]`, 'inline is always available — the adapters after it are unreachable');
        }
      });
      if (adapters.length) bound = true;
      keyCount += 1;
    }
    if (!bound) unbound.push(port);
    else if (fromPack) inherited.push(port);
  }
  for (const port of Object.keys(template.ports)) {
    if (!(port in ports)) unbound.push(`${port} (absent)`);
  }
  // One line, not one per port: a project legitimately leaves several unwired, and
  // the useful signal is the list, not eight separate warnings.
  if (unbound.length) {
    warn('ports', `unbound, so the consuming skills will degrade: ${unbound.join(', ')}`);
  }
  if (skippedMcp.size) {
    notes.push(`pack MCP adapters skipped, server not in mcp.EXPECTED: ${[...skippedMcp].join(', ')}`);
  }
  if (inherited.length) {
    notes.push(`ports inherited from the stack pack: ${inherited.join(', ')}`);
  }
}

// ── 3. Required, enums, types ───────────────────────────────────────────────
for (const path of REQUIRED) {
  if (!isSet(get(path))) issue(path, 'required — the skills have no fallback for it');
}
for (const [path, allowed] of Object.entries(ENUMS)) {
  const v = get(path);
  if (isSet(v) && !allowed.includes(v)) issue(path, `"${v}" is not one of: ${allowed.join(', ')}`);
}
for (const path of LISTS) {
  const v = get(path);
  if (v != null && !Array.isArray(v)) issue(path, 'must be a list, e.g. [a, b]');
}

// ── 4. Paths that must exist on disk ────────────────────────────────────────
for (const path of PATHS_ON_DISK) {
  const v = get(path);
  if (!isSet(v)) continue;
  if (path === 'stack.STACK_REFS') {
    const refs = Array.isArray(v) ? v : [v];
    for (const ref of refs) {
      if (typeof ref !== 'string') { issue(path, 'each entry must be a pack path string'); continue; }
      const expanded = ref.replace(/^~/, process.env.HOME ?? process.env.USERPROFILE ?? '~');
      const abs = isAbsolute(expanded) ? expanded : resolve(projectRoot, expanded);
      if (!existsSync(abs)) issue(path, `points at a path that does not exist: ${abs}`);
    }
    continue;
  }
  if (typeof v !== 'string') continue;
  const expanded = v.replace(/^~/, process.env.HOME ?? process.env.USERPROFILE ?? '~');
  const abs = isAbsolute(expanded) ? expanded : resolve(projectRoot, expanded);
  if (!existsSync(abs)) issue(path, `points at a path that does not exist: ${abs}`);
}
const wd = get('paths.WORKING_DIRECTORY');
if (isSet(wd) && typeof wd === 'string' && !isAbsolute(wd)) {
  issue('paths.WORKING_DIRECTORY', 'must be absolute — every skill checks its cwd against it');
}
if (isSet(wd) && existsSync(wd) && !statSync(wd).isDirectory()) {
  issue('paths.WORKING_DIRECTORY', 'is not a directory');
}

// ── 5. Cross-key coherence ──────────────────────────────────────────────────
const prefix = get('items.STORY_ID_PREFIX');
const pattern = get('items.STORY_ID_PATTERN');
if (isSet(prefix) && isSet(pattern) && !String(pattern).startsWith(String(prefix))) {
  issue('items.STORY_ID_PATTERN', `does not start with STORY_ID_PREFIX ("${prefix}")`);
}

// Docs-as-code is an all-or-nothing set: half of it leaves /design writing flows
// that /sync has nowhere to put.
const docsAsCode = {
  'docs.DESIGN_OUTPUT_MODE': get('docs.DESIGN_OUTPUT_MODE') === 'full-flow',
  'docs.DOCS_UNIT_FLOWS': isSet(get('docs.DOCS_UNIT_FLOWS')),
};
const on = Object.entries(docsAsCode).filter(([, v]) => v).map(([k]) => k);
const off = Object.entries(docsAsCode).filter(([, v]) => !v).map(([k]) => k);
if (on.length && off.length) {
  issue('docs', `docs-as-code is half-configured — set (${on.join(', ')}) but not (${off.join(', ')})`);
}
const diagramCheck = get('ports.DIAGRAM_CHECK.run');
const resolvedDiagram = diagramCheck != null ? diagramCheck : packPorts?.DIAGRAM_CHECK?.run ?? null;
if (get('docs.DESIGN_OUTPUT_MODE') === 'full-flow' && !isSet(resolvedDiagram)) {
  warn('ports.DIAGRAM_CHECK', 'docs-as-code with this port unbound — diagram identifiers go unverified');
}
if (get('docs.API_CONTRACT_MODE') === 'delta' && !isSet(get('docs.DOCS_MODULE'))) {
  issue('docs.DOCS_MODULE', 'required when API_CONTRACT_MODE is delta — /sync has no canonical api.yaml folder to merge into');
}
if (isSet(get('docs.DOCS_UNIT_README')) && !isSet(get('docs.DOCS_UNIT_FLOWS'))) {
  warn('docs.DOCS_UNIT_FLOWS', 'a unit README without flows — C4 L4 has nowhere to land');
}
// `build_mode: evidence` is opt-in per item type, and the opt-in only means
// something if the type exists and if something can actually run the check.
const evidenceTypes = get('items.EVIDENCE_MODE_TYPES');
const itemTypes = get('items.ITEM_TYPES');
if (Array.isArray(evidenceTypes) && Array.isArray(itemTypes)) {
  const unknown = evidenceTypes.filter((t) => !itemTypes.includes(t));
  if (unknown.length) {
    issue('items.EVIDENCE_MODE_TYPES', `lists type(s) absent from ITEM_TYPES: ${unknown.join(', ')} — no item can ever carry them`);
  }
}
if (Array.isArray(evidenceTypes) && evidenceTypes.length) {
  const verify = get('ports.VERIFY.run');
  const resolvedVerify = verify != null ? verify : packPorts?.VERIFY?.run ?? null;
  if (!isSet(resolvedVerify)) {
    warn('ports.VERIFY', 'EVIDENCE_MODE_TYPES declares eligible types but this port is unbound — an evidence-mode story would have nothing to close its ACs with, and /plan stops');
  }
}

const survey = get('ports.CODE_SURVEY.run');
if (Array.isArray(survey) && survey.length === 1 && survey[0] === 'inline') {
  warn('ports.CODE_SURVEY', 'only inline — surveys will be slower and spend the main context');
}
if (!isSet(get('stack.STACK_REFS'))) {
  warn('stack.STACK_REFS', 'no stack pack — the skills fall back to their generic references/');
}

// ── Report ──────────────────────────────────────────────────────────────────
if (notes.length) {
  for (const n of notes) console.log(`note: ${n}`);
}
if (warnings.length) {
  console.log(`WARNINGS (${warnings.length}):`);
  for (const w of warnings) console.log(`  ${w}`);
}
if (issues.length) {
  console.log(`ISSUES (${issues.length}):`);
  for (const i of issues) console.log(`  ${i}`);
  process.exit(1);
}
console.log(`OK: ${keyCount} keys, schema v${SCHEMA_VERSION}, 0 issues.`);
process.exit(0);
