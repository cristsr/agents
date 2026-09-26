// contracts.mjs — discovery of the artifact contracts in `~/.agents/contracts/artifacts/`.
//
// A pipeline artifact is never one skill's private output: `design.md` is written by
// the design stage, mutated by the refine stage and read by the plan stage; the API
// contract is written by one skill, merged by another and consumed as the source of
// truth for the DTOs by a third. An artifact contract is that artifact's single home
// — what it requires, how it is generated, how it is checked, who may change it
// afterwards and who reads it. It sits in `contracts/` rather than inside a skill
// because the producer, every consumer and the validators all read it, and filing it
// under the producer would invert that dependency.
//
// A contract is a directory holding a `CONTRACT.md`, and beside it the template
// floors it provides for a `<STACK_REFS>/<file>` citation. The front matter is data:
// `validate-skills.mjs` reads it to check that the producer and every consumer are
// real skills, that each declared floor exists, and that the headings it declares are
// headings a script actually enforces.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
import yaml from 'js-yaml';

/**
 * The body sections every `CONTRACT.md` carries, in the order a reader expects. One
 * artifact's rules are useless split across five skills, so the shape is fixed and
 * checked: the value of moving this knowledge here is that it can be found the same
 * way every time.
 */
export const CONTRACT_SECTIONS = [
  'Identity',
  'Requires',
  'Shape',
  'Generation',
  'Validation',
  'Mutability',
  'Guarantees',
];

/** Carried only where it applies: an artifact whose gates need no port never degrades. */
export const OPTIONAL_SECTIONS = ['Degrades'];

/**
 * Every artifact contract under `<contractsRoot>/artifacts/`, sorted by name.
 * Returns `{ name, dir, file, text, frontMatter }`, where `frontMatter` is
 * `{ data, error, raw }` — `data` is the parsed mapping or null, `error` says why
 * when it could not be read as one.
 */
export function discoverContracts(contractsRoot) {
  const root = join(contractsRoot, 'artifacts');
  const out = [];
  for (const entry of dirEntries(root)) {
    if (!entry.isDirectory()) continue;
    const file = join(root, entry.name, 'CONTRACT.md');
    if (!isFile(file)) continue;
    const text = readFileSync(file, 'utf8');
    out.push({
      name: entry.name,
      dir: join(root, entry.name),
      file,
      text,
      frontMatter: contractFrontMatter(text),
    });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * The contract's front matter, as data — `{}` when there is none.
 *
 * Front matter is optional on purpose: it carries only what a script cannot infer from the
 * file itself, which is the floors this contract provides and the headings a script
 * enforces. A contract with neither declares nothing, and a block declaring nothing is
 * ceremony. Only a block that is *there* and malformed is a defect. `raw` is kept so a
 * caller can report the placeholder form without re-parsing the fences.
 */
export function contractFrontMatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text ?? '');
  if (!m) return { data: {}, error: null, raw: null, present: false };
  let data;
  try {
    data = yaml.load(m[1]);
  } catch (e) {
    return { data: null, error: `front matter is not valid YAML: ${String(e.message).split('\n')[0]}`, raw: m[1], present: true };
  }
  if (data == null) data = {};
  if (typeof data !== 'object' || Array.isArray(data)) {
    return { data: null, error: 'front matter is not a mapping of keys', raw: m[1], present: true };
  }
  return { data, error: null, raw: m[1], present: true };
}

/**
 * Every pack-relative path the contracts provide a floor for. A skill may cite
 * `<STACK_REFS>/<path>` for any of these even when the generic pack no longer carries
 * the file: the pack layer overrides it, and the contract's own template is what a
 * project without a pack resolves to.
 */
export function floorPaths(contracts) {
  const out = new Set();
  for (const contract of contracts) {
    for (const key of Object.keys(contract.frontMatter.data?.floors ?? {})) out.add(key);
  }
  return out;
}

/** Every `.md` under `contracts/artifacts/`, `CONTRACT.md` files included. */
export function artifactDocs(contractsRoot) {
  const root = join(contractsRoot, 'artifacts');
  return walkFiles(root).filter((f) => f.endsWith('.md'));
}

/**
 * The files a contract offers as templates. A template is copied into an artifact, so
 * it is the one kind of file this folder holds that must not carry a note about the
 * pipeline — the rule `validate-skills.mjs` already applies to the skills' and the
 * packs' templates.
 */
export function contractTemplates(contractsRoot) {
  return artifactDocs(contractsRoot).filter((f) => basename(f) !== 'CONTRACT.md');
}

/**
 * Every `.md`/`.yaml` under `contracts/`, at any depth. The contracts cite each other
 * and the rest of the tree by `~/.agents/…` path, so all of them are checked.
 */
export function allContractFiles(contractsRoot) {
  return walkFiles(contractsRoot).filter((f) => /\.(?:md|ya?ml)$/.test(f));
}

function walkFiles(dir) {
  const out = [];
  for (const entry of dirEntries(dir)) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkFiles(path));
    else if (entry.isFile()) out.push(path);
  }
  return out;
}

/** `readdirSync` that answers `[]` instead of throwing — a missing tree is not an error. */
function dirEntries(dir) {
  try {
    return readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

function isFile(path) {
  try { return statSync(path).isFile(); } catch { return false; }
}
