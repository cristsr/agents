// The ecosystem itself, checked as a unit.
//
// The unit tests pin the PARSERS; these pin the TREE. Together they are what
// makes a rename safe: change a skill's folder and this run goes red before
// anyone follows a dead reference in prose.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

test('validate-skills passes over this repo', () => {
  // The end-to-end assertion behind checks 1-8: every profile key, port,
  // reference path, `/command` and `~/.agents/…` path in the tree resolves.
  const run = spawnSync(process.execPath, [join(REPO, 'scripts', 'validate-skills.mjs')], {
    cwd: REPO, encoding: 'utf8',
  });
  assert.equal(run.status, 0, `validate-skills reported issues:\n${run.stdout}${run.stderr}`);
});

test('targets.yaml names no machine-specific path', () => {
  // A guard pointing at one developer's home directory breaks silently on every
  // other clone — and a hook that cannot start is a control that is not applied.
  const yaml = readFileSync(join(REPO, 'agents', 'targets.yaml'), 'utf8');
  assert.doesNotMatch(yaml, /[A-Za-z]:[\\/]Users[\\/]/, 'absolute Windows path in targets.yaml');
  assert.doesNotMatch(yaml, /\/home\/[a-z]/, 'absolute Unix home path in targets.yaml');
  assert.match(yaml, /\{AGENTS_ROOT\}/, 'the guard must reference the repo through the placeholder');
});

test('every guard command that targets.yaml declares exists in this repo', () => {
  const yaml = readFileSync(join(REPO, 'agents', 'targets.yaml'), 'utf8');
  const referenced = [...yaml.matchAll(/\{AGENTS_ROOT\}\/([A-Za-z0-9_./-]+)/g)].map((m) => m[1]);
  assert.ok(referenced.length > 0, 'no guard script referenced — did the wiring change?');
  for (const ref of referenced) {
    assert.doesNotThrow(() => readFileSync(join(REPO, ref)), `guard script missing: ${ref}`);
  }
});

test('no skill front matter carries an angle-bracket placeholder', () => {
  // Check 10 of validate-skills, pinned here so the failure names the skill and the
  // token instead of arriving as a generic non-zero exit from the whole validator.
  // The front matter is always loaded and is parsed as data: `<app>` reads there as
  // a tag, not as the slot it stands for. The body is free to use any notation.
  const offenders = [];
  for (const f of skillFiles()) {
    const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(readFileSync(f, 'utf8'));
    if (!fm) continue;
    for (const hit of new Set(fm[1].match(/<[A-Za-z/][^>\n]*>/g) ?? [])) {
      offenders.push(`${f.replace(REPO, '')}: ${hit}`);
    }
  }
  assert.deepEqual(offenders, [], `angle brackets in front matter:\n  ${offenders.join('\n  ')}`);
});

function skillFiles() {
  const out = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name === 'SKILL.md') out.push(p);
    }
  };
  walk(join(REPO, 'skills'));
  return out;
}
