// The reader behind validate-code-provenance.mjs.
//
// The rule it enforces is invisible when broken — `// AC-3` reads as helpful the
// day it is written — so the cases pinned here are the ones where being wrong is
// expensive: the line number a developer opens, the project that numbers its work
// differently, and the files whose whole job IS to carry the traceability.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addedLines, isExempt, artifactReferences, propertyComments } from '../lib/diff.mjs';

const DIFF = [
  'diff --git a/src/ledger/posting.service.ts b/src/ledger/posting.service.ts',
  '--- a/src/ledger/posting.service.ts',
  '+++ b/src/ledger/posting.service.ts',
  '@@ -40,0 +41,2 @@ export class PostingService {',
  '+  // AC-3: only settled entries count',
  '+  sum(entries: Entry[]): Money {',
].join('\n');

test('addedLines numbers the lines against the NEW file', () => {
  // The number is what a developer opens, so an off-by-one is the whole value of
  // the finding.
  const added = addedLines(DIFF);
  assert.deepEqual(added.map((a) => a.line), [41, 42]);
  assert.equal(added[0].file, 'src/ledger/posting.service.ts');
});

test('a deleted line is not a finding', () => {
  // Removing `// AC-3` is the fix, not the defect.
  const diff = [
    '--- a/src/a.ts',
    '+++ b/src/a.ts',
    '@@ -1 +1 @@',
    '-  // AC-3: only settled entries',
    '+  // Settled entries only: internal transfers appear on both ledgers.',
  ].join('\n');
  assert.deepEqual(artifactReferences(diff), []);
});

test('an AC number written into code is reported', () => {
  const [finding] = artifactReferences(DIFF);
  assert.equal(finding.match, 'AC-3');
  assert.equal(finding.reason, 'acceptance criterion');
  assert.equal(finding.line, 41);
});

test("the project's own story id is what gets searched, not this ecosystem's", () => {
  // The grep this replaced hardcoded `spec-`, so a project numbering its work
  // HU-1234 was checked against a spelling it never uses — a gate that always
  // passes.
  const diff = [
    '--- a/src/a.ts',
    '+++ b/src/a.ts',
    '@@ -0,0 +1 @@',
    '+  // implements HU-1234',
  ].join('\n');
  assert.deepEqual(artifactReferences(diff), [], 'not a reference for a spec- project');
  const [finding] = artifactReferences(diff, 'HU\\-\\d+');
  assert.equal(finding.match, 'HU-1234');
  assert.equal(finding.reason, 'story id');
});

test('a workspace path in code is reported', () => {
  const diff = [
    '--- a/src/a.ts',
    '+++ b/src/a.ts',
    '@@ -0,0 +1 @@',
    '+  // see work/active/spec-0042/design.md',
  ].join('\n');
  assert.equal(artifactReferences(diff)[0].reason, 'story workspace path');
});

test('the files that OWN the traceability are exempt', () => {
  // plan.md's AC → Task table is the point. Documentation citing the story is
  // project history. Neither is code.
  assert.ok(isExempt('work/active/spec-0042/plan.md'));
  assert.ok(isExempt('docs/decisions.md'));
  assert.ok(!isExempt('src/ledger/posting.service.ts'));
  assert.ok(!isExempt('test/ledger/posting.service.spec.ts'));

  const diff = [
    '--- a/work/active/spec-0042/plan.md',
    '+++ b/work/active/spec-0042/plan.md',
    '@@ -0,0 +1 @@',
    '+| AC-3 | Task 4 |',
  ].join('\n');
  assert.deepEqual(artifactReferences(diff), []);
});

test('a test name citing the criterion is reported like any other line', () => {
  // The pull is strongest here: a regression test invites naming the AC it came
  // from, and the name outlives the numbering.
  const diff = [
    '--- a/test/a.spec.ts',
    '+++ b/test/a.spec.ts',
    '@@ -0,0 +1 @@',
    "+  it('AC-2: returns 200 with an empty list', () => {",
  ].join('\n');
  assert.equal(artifactReferences(diff)[0].match, 'AC-2');
});

test('a clean diff is clean', () => {
  const diff = [
    '--- a/src/a.ts',
    '+++ b/src/a.ts',
    '@@ -0,0 +2 @@',
    '+  // Internal transfers appear on both ledgers, so summing raw entries',
    '+  // double-counts them. Settled-only is what the balance reconciles against.',
  ].join('\n');
  assert.deepEqual(artifactReferences(diff), []);
});

// ── Comments on single properties ───────────────────────────────────────────
// Advisory by design: a project that adopts JSDoc documents its properties on
// purpose. So the detector looks only at loose `//` comments, and the caller is
// told, never blocked.

test('a trailing comment on a field is noted', () => {
  const diff = [
    '--- a/src/transfer.ts',
    '+++ b/src/transfer.ts',
    '@@ -0,0 +3 @@',
    '+export class Transfer {',
    '+  amount: number; // in cents',
    '+}',
  ].join('\n');
  const [note] = propertyComments(diff);
  assert.equal(note.kind, 'trailing');
  assert.equal(note.line, 4);
});

test('a comment on the line above a field is noted', () => {
  const diff = [
    '--- a/src/transfer.ts',
    '+++ b/src/transfer.ts',
    '@@ -0,0 +3 @@',
    '+export class Transfer {',
    '+  // the account the money comes from',
    '+  source: string;',
  ].join('\n');
  const [note] = propertyComments(diff);
  assert.equal(note.kind, 'leading');
});

test('JSDoc is documentation syntax, never a note', () => {
  // The reason this whole check is advisory: adopt TSDoc and this becomes the
  // house style. Reporting it would train the writer to strip the docs.
  const diff = [
    '--- a/src/transfer.ts',
    '+++ b/src/transfer.ts',
    '@@ -0,0 +4 @@',
    '+export class Transfer {',
    '+  /** Amount in cents, as the ledger stores it. */',
    '+  amountInCents: number;',
    '+}',
  ].join('\n');
  assert.deepEqual(propertyComments(diff), []);
});

test('a comment on a local variable is not a property comment', () => {
  // The false positive that would make this check noise: inside a function, a
  // `const` explaining itself is legitimate and common.
  const diff = [
    '--- a/src/transfer.ts',
    '+++ b/src/transfer.ts',
    '@@ -0,0 +3 @@',
    '+  // Both ledgers must accept it before the balance can be trusted.',
    '+  const settled = await this.ledger.settle(transfer);',
    '+  return settled;',
  ].join('\n');
  assert.deepEqual(propertyComments(diff), []);
});

test('a URL in a field value is not mistaken for a comment', () => {
  const diff = [
    '--- a/src/config.ts',
    '+++ b/src/config.ts',
    '@@ -0,0 +1 @@',
    "+  callbackUrl: 'https://payments.example.com/hook',",
  ].join('\n');
  assert.deepEqual(propertyComments(diff), []);
});

test('prose and markdown are not scanned for property comments', () => {
  const diff = [
    '--- a/docs/guide.md',
    '+++ b/docs/guide.md',
    '@@ -0,0 +1 @@',
    '+  amount: number; // in cents',
  ].join('\n');
  assert.deepEqual(propertyComments(diff), []);
});
