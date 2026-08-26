#!/usr/bin/env node
// validate-code-provenance.mjs — the code carries no reference to the story that
// produced it.
//
//   node ~/.agents/scripts/validate-code-provenance.mjs [<base-ref>] [--json]
//
// With no argument it diffs against the profile's BASE_BRANCH (three-dot, so only
// this branch's own work is read); pass a ref to override it, or `--working` to read
// the uncommitted tree instead. Exit codes: 0 = clean · 1 = references found ·
// 2 = could not run (no git, no diff).
//
// It reports two things with two different weights. A reference to the story is a
// FAILURE: it is always wrong, in every project. A loose comment on a single
// property is a NOTE that never touches the exit code — a project may adopt JSDoc
// as its documentation standard, where documenting properties is the whole point,
// and no script can tell which convention is in force.
//
// This exists because it is the one convention whose cost is invisible at the moment
// it is broken: `// AC-3` reads as helpful the day it is written and points nowhere
// once /sdd-sync archives the workspace. It replaces the hand-written grep /sdd-build used
// to carry, which hardcoded `spec-` (wrong for any project numbering its work
// differently) and needed a POSIX shell (this ecosystem runs on Windows too).

import { spawnSync } from 'node:child_process';
import { loadProfile, key, storyIdSource } from './lib/profile.mjs';
import { artifactReferences, propertyComments } from './lib/diff.mjs';

const argv = process.argv.slice(2);
const asJson = argv.includes('--json');
const working = argv.includes('--working');
const ref = argv.find((a) => !a.startsWith('--')) ?? null;

const profile = loadProfile();
const base = ref ?? key(profile, 'BASE_BRANCH', null);

const args = working || (!base && !ref)
  ? ['diff', '--unified=0', 'HEAD']
  : ['diff', '--unified=0', `${base}...HEAD`];

const run = spawnSync('git', args, { encoding: 'utf8' });
if (run.status !== 0) {
  const detail = (run.stderr || run.error?.message || '').trim().split('\n')[0];
  console.error(`FAIL: could not read the diff (git ${args.join(' ')})${detail ? `\n  ${detail}` : ''}`);
  console.error('  Pass an explicit base ref, or --working to read the uncommitted tree.');
  process.exit(2);
}

const range = args.slice(2).join(' ');
const findings = artifactReferences(run.stdout, profile.data ? storyIdSource(profile) : null);
const notes = propertyComments(run.stdout);

if (asJson) {
  console.log(JSON.stringify({ version: '1.1', range, findings, notes }, null, 2));
  process.exit(findings.length ? 1 : 0);
}

const clip = (text, max = 100) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

if (findings.length) {
  console.log(`REFERENCES (${findings.length}) — the code cites the story that produced it:`);
  for (const f of findings) {
    console.log(`  ${f.file}:${f.line} — ${f.match} (${f.reason})`);
    console.log(`    ${clip(f.text)}`);
  }
  console.log('\nState the RULE the criterion asked for ("settled entries only"), never its');
  console.log('number: the traceability lives in plan.md, and the workspace is archived on close.');
  console.log('A hit whose text is genuine domain content (a project whose domain IS tasks) is a');
  console.log('false positive — say so in the close-out instead of rewording the domain.');
} else {
  console.log(`OK: no artifact references in the code (${range}).`);
}

// Advisory, and deliberately not part of the exit code: a project that adopts
// JSDoc/TSDoc documents its public properties on purpose, and its convention
// outranks this default. Read them, don't obey them.
if (notes.length) {
  console.log(`\nNOTES (${notes.length}) — loose comments on single properties:`);
  for (const n of notes) console.log(`  ${n.file}:${n.line} (${n.kind}) — ${clip(n.text, 90)}`);
  console.log('\nA field that needs a sentence beside it usually needs a better name');
  console.log('(`amount` + "in cents" → `amountInCents`). Not a failure: if this project');
  console.log("documents properties by convention, that convention wins — say so and move on.");
}

process.exit(findings.length ? 1 : 0);
