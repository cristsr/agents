// The parsers for the structural contract the skills write into their artifacts.
//
// These headings are the pipeline's only machine-readable interface: /build
// navigates by `### Task N`, /sync by `## Global Architecture Impact`,
// validate-artifacts by all of them. A parser that quietly returns [] here does
// not fail — it PASSES a story that should have been rejected, which is the
// worst failure mode a gate can have. Every case below is one such silence.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  frontMatter, buildMode, BUILD_MODES, acceptanceCriteria, clarificationMarkers,
  tasks, traceability, acCoverage, hasHeading, section,
} from '../lib/story.mjs';

const SPEC = `---
type: feat
origin: tracker
build_mode: evidence
---

# spec-0042

## Acceptance Criteria

### AC-1: The ledger counts an internal transfer once

WHEN a transfer settles, THE SYSTEM SHALL record one entry.

#### Scenario: a settled transfer

- **GIVEN** two accounts in the same ledger
- **WHEN** a transfer settles
- **THEN** exactly one entry is recorded

### AC-2: An empty result is not an error

THE SYSTEM SHALL return an empty list. [NEEDS CLARIFICATION: which status code?]

## Build Mode Rationale

No runtime behavior ships here; the deliverable is a validator.
`;

test('frontMatter reads scalars and strips quotes', () => {
  const fm = frontMatter(SPEC);
  assert.equal(fm.type, 'feat');
  assert.equal(fm.build_mode, 'evidence');
  assert.equal(frontMatter('---\nname: "quoted"\n---\n').name, 'quoted');
});

test('frontMatter returns null when there is none', () => {
  assert.equal(frontMatter('# just a title'), null);
  assert.equal(frontMatter(null), null);
});

test('frontMatter survives CRLF line endings', () => {
  // The artifacts are written on Windows as often as not.
  assert.equal(frontMatter('---\r\ntype: bug\r\n---\r\n').type, 'bug');
});

test('buildMode defaults to tdd, never to the relaxed carril', () => {
  assert.equal(buildMode('# no front matter'), 'tdd');
  assert.equal(buildMode('---\ntype: feat\n---\n'), 'tdd');
  assert.equal(buildMode(SPEC), 'evidence');
});

test('buildMode returns a typo raw instead of normalizing it', () => {
  // Normalizing `evidnce` to either mode would be a guess: one silently relaxes
  // the guardrail, the other hides the typo. The caller reports it instead.
  const raw = buildMode('---\nbuild_mode: evidnce\n---\n');
  assert.equal(raw, 'evidnce');
  assert.ok(!BUILD_MODES.includes(raw));
});

test('acceptanceCriteria parses numbering, body, scenarios and EARS', () => {
  const acs = acceptanceCriteria(SPEC);
  assert.equal(acs.length, 2);
  assert.deepEqual(acs.map((a) => a.id), ['AC-1', 'AC-2']);
  assert.equal(acs[0].number, 1);
  assert.equal(acs[0].title, 'The ledger counts an internal transfer once');
  assert.equal(acs[0].ears, true);
  assert.equal(acs[0].scenarios.length, 1);
  assert.equal(acs[0].scenarios[0].hasWhen, true);
  assert.equal(acs[0].scenarios[0].hasThen, true);
  assert.equal(acs[0].scenarios[0].steps.length, 3);
  assert.equal(acs[1].scenarios.length, 0);
});

test('acceptanceCriteria stops at the next level-2 heading', () => {
  // `## Build Mode Rationale` follows the ACs; its prose must not be swallowed
  // into AC-2's body, or a rationale check would read as satisfied by an AC.
  const acs = acceptanceCriteria(SPEC);
  assert.doesNotMatch(acs[1].body, /validator/);
});

test('acceptanceCriteria returns [] when the heading is missing or empty', () => {
  assert.deepEqual(acceptanceCriteria('# spec\n\n## Something Else\n'), []);
  assert.deepEqual(acceptanceCriteria('## Acceptance Criteria\n\nnone yet\n'), []);
  assert.deepEqual(acceptanceCriteria(null), []);
});

test('clarificationMarkers reports each marker with its line', () => {
  const found = clarificationMarkers(SPEC);
  assert.equal(found.length, 1);
  assert.match(found[0].text, /which status code/);
  assert.ok(found[0].line > 0);
});

const PLAN = `# Plan

### Task 0: Verify the working branch [X]
### Task 1: Request and response DTOs [X]

- [ ] a checklist item inside the body, not a task

### Task 2 — Persistence adapter [P]
### Task HOTFIX-1: Correct the rounding

### AC → Task traceability

| AC | Tasks |
|---|---|
| AC-1 | Task 1, Task 2 |
| AC-2 | Task 2 |

## AC Coverage

AC-1: ✓ covered by ledger.spec.ts
AC-2: ✗ not covered
`;

test('tasks reads state from the heading line only', () => {
  const t = tasks(PLAN);
  assert.deepEqual(t.map((x) => x.id), ['Task 0', 'Task 1', 'Task 2', 'Task HOTFIX-1']);
  assert.equal(t[0].done, true);
  assert.equal(t[2].done, false);
  assert.equal(t[2].parallel, true);
  // The `- [ ]` line in a task body is a TDD step, never a task.
  assert.equal(t.filter((x) => x.title.includes('checklist')).length, 0);
});

test('tasks handles the em-dash title separator and hotfix ids', () => {
  const t = tasks(PLAN);
  assert.equal(t[2].title, 'Persistence adapter');
  assert.equal(t[3].hotfix, true);
  assert.equal(t[3].number, null);
});

test('tasks strips the markers out of the title', () => {
  assert.equal(tasks(PLAN)[1].title, 'Request and response DTOs');
});

test('traceability maps every AC to its cell', () => {
  const map = traceability(PLAN);
  assert.equal(map.get('AC-1'), 'Task 1, Task 2');
  assert.equal(map.get('AC-2'), 'Task 2');
  assert.equal(map.size, 2);
});

test('traceability returns null when the table is absent', () => {
  assert.equal(traceability('# plan with no table'), null);
});

test('acCoverage separates covered from uncovered', () => {
  const rows = acCoverage(PLAN);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].covered, true);
  assert.equal(rows[1].uncovered, true);
  // A ✗ is an unfinished build — the one signal /sync refuses to close on.
  assert.equal(rows.filter((r) => r.uncovered).length, 1);
});

test('acCoverage returns null when /build never wrote the section', () => {
  // Distinct from an EMPTY section: null means the stage never ran.
  assert.equal(acCoverage('# plan'), null);
  assert.deepEqual(acCoverage('## AC Coverage\n'), []);
});

test('hasHeading matches the exact name at any structural level', () => {
  assert.equal(hasHeading(SPEC, 'Build Mode Rationale'), true);
  assert.equal(hasHeading(SPEC, 'Acceptance Criteria'), true);
  assert.equal(hasHeading(SPEC, 'Design Decisions'), false);
  assert.equal(hasHeading(null, 'Acceptance Criteria'), false);
});

test('section returns the body, trimmed, up to the next heading', () => {
  assert.equal(
    section(SPEC, 'Build Mode Rationale'),
    'No runtime behavior ships here; the deliverable is a validator.',
  );
});

test('section distinguishes a missing heading from an empty one', () => {
  // The difference decides the message: "add the section" vs "fill it in".
  assert.equal(section(SPEC, 'Design Decisions'), null);
  assert.equal(section('## Build Mode Rationale\n\n## Next\n', 'Build Mode Rationale'), '');
});
