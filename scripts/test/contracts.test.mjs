// Artifact contract discovery — the files that carry one artifact's rules.
//
// A contract is read by the skill that produces the artifact, by every skill that
// consumes it and by the validator. Its failure modes are quiet: a contract nobody
// discovers is simply never checked, and a front matter that fails to parse takes the
// artifact's name, its floors and its headings with it. Everything below protects that.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CONTRACT_SECTIONS,
  allContractFiles,
  artifactDocs,
  contractFrontMatter,
  contractTemplates,
  discoverContracts,
  floorPaths,
} from '../lib/contracts.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** A throwaway `contracts/` tree; each entry is a relative path and its content. */
function tree(files) {
  const root = mkdtempSync(join(tmpdir(), 'sdd-contracts-'));
  for (const [rel, content] of Object.entries(files)) {
    const path = join(root, rel);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
  }
  return root;
}

const BODY = CONTRACT_SECTIONS.map((s) => `## ${s}\n\ncontent\n`).join('\n');

const WIDGET = `---
floors:
  references/widget-template.md: template.md
headings: []
---

# widget

${BODY}`;

function withTree(files, fn) {
  const root = tree(files);
  try {
    return fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('discoverContracts finds the contract of each artifact folder', () => {
  withTree({ 'artifacts/widget/CONTRACT.md': WIDGET }, (root) => {
    const found = discoverContracts(root);
    assert.deepEqual(found.map((c) => c.name), ['widget']);
    assert.equal(found[0].dir, join(root, 'artifacts', 'widget'));
    assert.deepEqual(found[0].frontMatter.data.floors, { 'references/widget-template.md': 'template.md' });
    assert.equal(found[0].frontMatter.error, null);
  });
});

test('discoverContracts ignores a folder with no CONTRACT.md', () => {
  withTree({ 'artifacts/widget/notes.md': 'no contract here' }, (root) => {
    assert.deepEqual(discoverContracts(root), []);
  });
});

test('discoverContracts sorts by name and tolerates a missing tree', () => {
  withTree(
    { 'artifacts/zeta/CONTRACT.md': WIDGET, 'artifacts/alpha/CONTRACT.md': WIDGET },
    (root) => assert.deepEqual(discoverContracts(root).map((c) => c.name), ['alpha', 'zeta']),
  );
  assert.deepEqual(discoverContracts(join(tmpdir(), 'sdd-contracts-none-7a1c')), []);
});

test('contractFrontMatter reads scalars, inline lists and the floors map', () => {
  const { data, error } = contractFrontMatter(WIDGET);
  assert.equal(error, null);
  assert.deepEqual(data.floors, { 'references/widget-template.md': 'template.md' });
  assert.deepEqual(data.headings, []);
});

test('contractFrontMatter reports a broken front matter instead of throwing', () => {
  const { data, error } = contractFrontMatter('---\nartifact: [unclosed\n---\n\nbody\n');
  assert.equal(data, null);
  assert.match(error, /not valid YAML/);
});

test('a contract with no front matter declares nothing and is not a defect', () => {
  const { data, error, present } = contractFrontMatter('# widget\n\nno front matter\n');
  assert.deepEqual(data, {});
  assert.equal(error, null);
  assert.equal(present, false);
});

test('floorPaths collects every path the contracts provide a floor for', () => {
  withTree(
    {
      'artifacts/widget/CONTRACT.md': WIDGET,
      'artifacts/gadget/CONTRACT.md': `---\nfloors:\n  references/gadget-template.md: template.md\n---\n\n${BODY}`,
    },
    (root) => {
      assert.deepEqual(
        [...floorPaths(discoverContracts(root))].sort(),
        ['references/gadget-template.md', 'references/widget-template.md'],
      );
    },
  );
});

test('the template set is the folder minus CONTRACT.md', () => {
  withTree(
    {
      'artifacts/widget/CONTRACT.md': WIDGET,
      'artifacts/widget/template.md': '# template\n',
      'artifacts/widget/openapi-to-dto-mapping.md': '# mapping\n',
    },
    (root) => {
      assert.deepEqual(
        contractTemplates(root).map((f) => f.split(/[\\/]/).pop()).sort(),
        ['openapi-to-dto-mapping.md', 'template.md'],
      );
      assert.equal(artifactDocs(root).length, 3);
    },
  );
});

test('allContractFiles reaches nested files and keeps only markdown and yaml', () => {
  withTree(
    {
      'PORTS.md': '# ports\n',
      'sdd-profile.template.yaml': 'SCHEMA_VERSION: 2\n',
      'artifacts/widget/CONTRACT.md': WIDGET,
      'artifacts/widget/template.md': '# template\n',
      'artifacts/widget/notes.txt': 'ignored\n',
    },
    (root) => {
      assert.deepEqual(
        allContractFiles(root).map((f) => f.replace(root, '').replace(/\\/g, '/')).sort(),
        [
          '/PORTS.md',
          '/artifacts/widget/CONTRACT.md',
          '/artifacts/widget/template.md',
          '/sdd-profile.template.yaml',
        ],
      );
    },
  );
});

test('every contract in this repo carries its shape', () => {
  // The real tree, not a fixture: `validate-skills.mjs` reports the same things through
  // the whole tree, and this run names the contract instead of a line number.
  for (const contract of discoverContracts(join(REPO, 'contracts'))) {
    const where = contract.file.replace(REPO, '');
    assert.equal(contract.frontMatter.error, null, `${where}: ${contract.frontMatter.error}`);
    const { floors = {} } = contract.frontMatter.data;
    for (const [packPath, floor] of Object.entries(floors)) {
      assert.doesNotMatch(packPath, /^\/|\.\./, `${where}: floor key "${packPath}" must be pack-relative`);
      assert.ok(
        contractTemplates(join(REPO, 'contracts')).some((f) => f === join(contract.dir, floor)),
        `${where}: floor "${packPath}" maps to ${floor}, which is not in the contract's folder`,
      );
    }
    for (const section of CONTRACT_SECTIONS) {
      assert.match(contract.text, new RegExp(`^##\\s+${section}\\s*$`, 'm'), `${where}: missing \`## ${section}\``);
    }
  }
});

test('no contract names the skill that produces it or the ones that read it', () => {
  // The whole point of the folder: an artifact states itself, so renaming a caller never
  // reaches into a contract. The junction belongs to each skill's own `Contract` block,
  // and this is what keeps a dependency index from growing back inside these files.
  for (const contract of discoverContracts(join(REPO, 'contracts'))) {
    const where = contract.file.replace(REPO, '');
    for (const key of ['producer', 'consumers']) {
      assert.equal(contract.frontMatter.data[key], undefined, `${where}: front matter carries \`${key}\` — a contract does not name its callers`);
    }
  }
});

test('the design-md contract declares exactly the headings the validator enforces', () => {
  // The headings are a contract between a script and a document: the validator looks
  // them up literally, and `design.md` has to carry them by that exact name. Declaring
  // them in the contract without this assertion would just move the copy; with it, a
  // rename on either side goes red instead of leaving a check that hunts a heading
  // nothing writes any more.
  const contract = discoverContracts(join(REPO, 'contracts')).find((c) => c.name === 'design-md');
  assert.ok(contract, 'no design-md contract — design.md has no home for its headings');

  const source = readFileSync(join(REPO, 'scripts', 'validate-artifacts.mjs'), 'utf8');
  const enforced = new Set([
    ...[...source.matchAll(/hasHeading\(story\.text\.design,\s*'([^']+)'\)/g)].map((m) => m[1]),
    ...[...source.matchAll(/for \(const heading of \[([^\]]+)\]\)/g)].flatMap((m) =>
      [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]),
    ),
  ]);
  assert.ok(enforced.size >= 3, `only ${enforced.size} heading(s) found in validate-artifacts.mjs — did the design.md block change shape?`);

  assert.deepEqual(
    [...(contract.frontMatter.data.headings ?? [])].sort(),
    [...enforced].sort(),
    'validate-artifacts.mjs and the design-md contract disagree — they must move together',
  );
});
