// The two prose readers that back validate-skills.mjs checks 7 and 8.
//
// These carry the highest false-positive risk in the ecosystem: they read
// English, not code. A regex that is too eager buries the real finding under
// twenty endpoint paths; one that is too shy lets a rename through — which is
// the defect they exist to catch. Both edges are pinned here.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stripFences, invocations, agentsPaths, templateNotes } from '../lib/prose.mjs';

test('stripFences removes fenced blocks and keeps inline code', () => {
  const text = [
    'Prose with `inline` code.',
    '```bash',
    'cd /tmp && rm -rf /var',
    '```',
    'More prose.',
  ].join('\n');
  const out = stripFences(text);
  assert.match(out, /`inline`/);
  assert.doesNotMatch(out, /\/tmp/);
});

test('stripFences removes INDENTED fences', () => {
  // A fence nested in a list item is indented. An anchored `^``` ` misses it and
  // takes the whole diagram as prose — which is how `POST /accounts` was read as
  // an invocation of a skill named "accounts".
  const text = [
    '1. The flow:',
    '   ```mermaid',
    '   Client->>C: POST /accounts',
    '   ```',
  ].join('\n');
  assert.doesNotMatch(stripFences(text), /accounts/);
});

test('invocations reads both spellings of a handoff', () => {
  assert.deepEqual(invocations('That is `/plan`, invoked by /sync.'), ['plan', 'sync']);
  assert.deepEqual(invocations('Use when the user says "/clarify spec-XXXX"'), ['clarify']);
  assert.deepEqual(invocations('(use /docs)'), ['docs']);
});

test('invocations ignores prose alternation, not commands', () => {
  // Every one of these appeared in the skills and must stay silent.
  assert.deepEqual(invocations('the `command`/query it fires'), []);
  assert.deepEqual(invocations('use case(s)/handler(s), domain aggregate(s)/entity(ies)'), []);
  assert.deepEqual(invocations('- `providers`/registrations — list all tokens'), []);
  assert.deepEqual(invocations('read ~/.agents/skills/sdd/plan/SKILL.md'), []);
  assert.deepEqual(invocations('see PHASE 4/design/references/design-template.md'), []);
});

test('invocations skips a placeholder standing for any command', () => {
  // Documentation about the check itself talks in patterns: `/<command>` names
  // no skill, exactly as `~/.agents/agents/<name>.md` names no file.
  assert.deepEqual(invocations('every `/<command>` a skill names must resolve'), []);
});

test('invocations catches the rename that started this — a command with no skill', () => {
  const line = 'If it says Yes: invoke /architecture with the node already specified.';
  assert.deepEqual(invocations(line), ['architecture']);
});

test('invocations distinguishes a sentence period from a file extension', () => {
  // Half the handoffs in the skills are the last word of their sentence. A guard
  // that rejects every period to keep `/plan.md` out is blind to all of them.
  assert.deepEqual(invocations("that's /docs, invoked by /sync."), ['docs', 'sync']);
  assert.deepEqual(invocations('run /build\n'), ['build']);
  assert.deepEqual(invocations('open /plan.md for the tasks'), []);
});

test('invocations dedupes and preserves order', () => {
  assert.deepEqual(invocations('/spec then /plan then /spec again'), ['spec', 'plan']);
});

test('agentsPaths returns repo-relative paths, trimming sentence punctuation', () => {
  assert.deepEqual(
    agentsPaths('The catalog is ~/.agents/contracts/PORTS.md.'),
    ['contracts/PORTS.md'],
  );
  assert.deepEqual(
    agentsPaths('Read ~/.agents/skills/sdd/clarify/SKILL.md — the source of truth.'),
    ['skills/sdd/clarify/SKILL.md'],
  );
});

test('agentsPaths skips placeholder patterns', () => {
  // `~/.agents/agents/<name>.md` documents a shape; no file was meant to sit there.
  assert.deepEqual(agentsPaths('Source: ~/.agents/agents/<name>.md'), []);
  assert.deepEqual(agentsPaths('Output: ~/.agents/skills/{name}/SKILL.md'), []);
});

test('agentsPaths dedupes repeated citations', () => {
  const text = '~/.agents/contracts/PORTS.md and again ~/.agents/contracts/PORTS.md';
  assert.deepEqual(agentsPaths(text), ['contracts/PORTS.md']);
});

// ── templateNotes: what a template must not hand to the artifact ────────────
// A template is copied, so its literal block IS the artifact. The three cases
// below are the line the check has to hold: a note to the writer inside the
// block is a defect, the same note outside it is the fix, and the artifact's own
// content is none of its business.

test('templateNotes catches a note to the writer left inside the literal block', () => {
  // The real case: plan-header-template carried this inside the Task 0 block, so
  // every plan.md written from it said who had resolved the branch.
  const template = [
    'Every plan starts with this header:',
    '',
    '```markdown',
    '### Task 0: Verify the working branch',
    '',
    '> The branch name was resolved by `/prepare` and recorded in `.branch`.',
    '```',
  ].join('\n');
  const notes = templateNotes(template);
  assert.equal(notes.length, 1);
  assert.equal(notes[0].line, 6);
  assert.match(notes[0].text, /prepare/);
});

test('templateNotes ignores the same instruction outside the block', () => {
  const template = [
    'The branch was resolved by `/prepare` (PHASE 1) — write it in literally.',
    '',
    '```markdown',
    '### Task 0: Verify the working branch',
    '```',
  ].join('\n');
  assert.deepEqual(templateNotes(template), []);
});

test('templateNotes leaves the artifact own content alone', () => {
  // A blockquote is suspicious only when it names the pipeline. A quoted business
  // rule is content, and an endpoint that reads like a command is a known cost:
  // it is reported, and a template quoting `GET /docs` is rare enough to accept.
  const template = [
    '```markdown',
    '> The export lists settled entries only.',
    '```',
  ].join('\n');
  assert.deepEqual(templateNotes(template), []);
});
