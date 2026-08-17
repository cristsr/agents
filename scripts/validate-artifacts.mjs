#!/usr/bin/env node
// validate-artifacts.mjs — validates a story's artifacts against the structural
// contract the SDD skills share.
//   node ~/.agents/scripts/validate-artifacts.mjs <story-id> [--strict] [--json]
//   node ~/.agents/scripts/validate-artifacts.mjs --all [--strict]
//
// SDD-PIPELINE.md already declares that the structural headings are a contract
// between skills — `## Ambiguity Resolution`, `## Global Architecture Impact`,
// `## Design Decisions`, `### AC → Task traceability`, `## AC Coverage`, `Task N` —
// and that translating one breaks the pipeline. Until now nothing enforced it.
// This does, mechanically, at the gates each skill declares.
//
// It validates only what EXISTS: a story at the `context` stage is not faulted for
// having no plan.md. What it refuses to accept is an artifact that exists and lies
// about its shape.
//
// Exit codes: 0 = valid · 1 = issues found · 2 = could not run (unknown story)

import { relative } from 'node:path';
import { loadProfile, listStories, storyIdMatcher, key } from './lib/profile.mjs';
import {
  readStory, frontMatter, acceptanceCriteria, clarificationMarkers,
  tasks, traceability, acCoverage, hasHeading, section,
} from './lib/story.mjs';

const argv = process.argv.slice(2);
const asJson = argv.includes('--json');
const strict = argv.includes('--strict');
const all = argv.includes('--all');
const storyArg = argv.find((a) => !a.startsWith('--')) ?? null;

const profile = loadProfile();

if (!storyArg && !all) {
  console.error('usage: validate-artifacts.mjs <story-id> [--strict] [--json] | --all');
  process.exit(2);
}

const targets = all
  ? listStories(profile, 'active').filter((id) => storyIdMatcher(profile).test(id))
  : [storyArg];

const reports = [];
for (const id of targets) {
  const report = validate(id);
  if (!report) {
    if (!all) {
      console.error(`FAIL: no story workspace for "${id}".`);
      process.exit(2);
    }
    continue;
  }
  reports.push(report);
}

render(reports);

// ── Validation ──────────────────────────────────────────────────────────────

function validate(storyId) {
  const story = readStory(profile, storyId);
  if (!story.dir) return null;

  const issues = [];
  const warnings = [];
  const notes = [];        // counts, rendered in the header
  const observations = []; // quality signals that are not defects
  const issue = (artifact, message) => issues.push({ artifact, message });
  const warn = (artifact, message) => warnings.push({ artifact, message });

  const closed = story.location === 'done';
  const clarified = Boolean(story.files.context);

  // ── spec.md ───────────────────────────────────────────────────────────────
  const acs = acceptanceCriteria(story.text.spec);
  if (!story.files.spec) {
    issue('spec.md', 'missing — every story starts here (/spec)');
  } else {
    const fm = frontMatter(story.text.spec);
    const itemTypes = key(profile, 'ITEM_TYPES', ['feat', 'bug', 'debt', 'incident', 'chore']);
    if (!fm) {
      warn('spec.md', 'no front-matter — `type` and `origin` are what /clarify and /design frame the item with');
    } else {
      if (!fm.type) warn('spec.md', 'front-matter has no `type`');
      else if (Array.isArray(itemTypes) && itemTypes.length && !itemTypes.includes(fm.type)) {
        issue('spec.md', `front-matter type "${fm.type}" is not one of ITEM_TYPES (${itemTypes.join(', ')})`);
      }
      if (!fm.origin) warn('spec.md', 'front-matter has no `origin`');
    }

    if (!hasHeading(story.text.spec, 'Acceptance Criteria')) {
      issue('spec.md', 'missing `## Acceptance Criteria` — a structural heading, never translated');
    } else if (acs.length === 0) {
      issue('spec.md', '`## Acceptance Criteria` holds no `### AC-N:` heading — the ACs are the only contract with the rest of the pipeline');
    } else {
      acs.forEach((ac, i) => {
        if (ac.number !== i + 1) {
          issue('spec.md', `${ac.id} breaks the numbering — ACs are numbered in order of appearance, expected AC-${i + 1} (line ${ac.line})`);
        }
        if (!ac.title) warn('spec.md', `${ac.id} has no title after the colon (line ${ac.line})`);
        if (!ac.body) issue('spec.md', `${ac.id} has an empty body — an AC with no criterion is not verifiable (line ${ac.line})`);
        // Scenarios are optional; when present, their shape is not.
        ac.scenarios.forEach((s) => {
          if (!s.name) warn('spec.md', `${ac.id} has a "#### Scenario:" heading with no name`);
          if (!s.hasWhen || !s.hasThen) {
            issue('spec.md', `${ac.id} scenario "${s.name}" is missing **WHEN** or **THEN** — a scenario without both is not executable`);
          }
        });
        // /clarify only rewrites an AC in EARS when it fails testability, so
        // neither form is mandatory — but an AC with no EARS wording and no
        // scenario is the shape ambiguity hides in. Worth naming, not failing.
        if (clarified && !ac.ears && ac.scenarios.length === 0) {
          observations.push(`${ac.id} ("${ac.title}") has neither EARS wording nor a scenario`);
        }
      });
      notes.push(`${acs.length} ACs`);
    }

    const markers = clarificationMarkers(story.text.spec);
    if (markers.length) {
      const where = markers.map((m) => `line ${m.line}`).join(', ');
      if (clarified) issue('spec.md', `${markers.length} unresolved [NEEDS CLARIFICATION] marker(s) after /clarify (${where}) — /design refuses to proceed while any remain`);
      else warn('spec.md', `${markers.length} [NEEDS CLARIFICATION] marker(s) pending (${where}) — /clarify resolves them`);
    }

    if (clarified && !hasHeading(story.text.spec, 'Ambiguity Resolution')) {
      issue('spec.md', 'context.md exists but spec.md has no `## Ambiguity Resolution` — /clarify writes the decision log before the ACs');
    }
  }

  // ── design.md ─────────────────────────────────────────────────────────────
  if (story.files.design) {
    if (!hasHeading(story.text.design, 'Global Architecture Impact')) {
      issue('design.md', 'missing `## Global Architecture Impact` — always present, never inferred; /sync reads it to decide whether to invoke /docs');
    } else {
      const body = section(story.text.design, 'Global Architecture Impact') ?? '';
      if (!/\b(yes|no|sí|si|none|ninguno)\b/i.test(body)) {
        issue('design.md', '`## Global Architecture Impact` carries no yes/no answer — /sync cannot decide whether the architecture docs need refreshing');
      }
    }
    for (const heading of ['Module Components', 'Quality Gates Validation']) {
      if (!hasHeading(story.text.design, heading)) warn('design.md', `missing \`## ${heading}\` (design-template.md)`);
    }
  }

  // ── plan.md ───────────────────────────────────────────────────────────────
  const taskList = tasks(story.text.plan);
  const doneTasks = taskList.filter((t) => t.done);
  if (story.files.plan) {
    const trace = traceability(story.text.plan);
    if (trace === null) {
      issue('plan.md', 'missing the `### AC → Task traceability` table — /build refuses to start without it');
    } else if (acs.length) {
      for (const ac of acs) {
        if (!trace.has(ac.id.toUpperCase())) {
          issue('plan.md', `${ac.id} is absent from the traceability table — never save a plan with an uncovered AC`);
        } else if (!/task\s*\d/i.test(trace.get(ac.id.toUpperCase()))) {
          issue('plan.md', `${ac.id} maps to no task in the traceability table ("${trace.get(ac.id.toUpperCase())}")`);
        }
      }
      for (const id of trace.keys()) {
        if (!acs.some((ac) => ac.id.toUpperCase() === id)) {
          warn('plan.md', `the traceability table lists ${id}, which no longer exists in spec.md`);
        }
      }
    }

    if (taskList.length === 0) {
      issue('plan.md', 'no `### Task N:` heading found — /build and /hotfix locate tasks by that exact name');
    } else {
      if (taskList[0].id !== 'Task 0') {
        issue('plan.md', `the first task is "${taskList[0].id}", not Task 0 — Task 0 verifies the working branch and is always first`);
      }
      const numbered = taskList.filter((t) => t.number !== null);
      numbered.forEach((t, i) => {
        if (t.number !== i) {
          issue('plan.md', `task numbering breaks at "${t.id}" (line ${t.line}) — expected Task ${i}`);
        }
      });
      notes.push(`${doneTasks.length}/${taskList.length} tasks`);
    }

    const coverage = acCoverage(story.text.plan);
    const built = taskList.length > 0 && doneTasks.length === taskList.length;
    if (built || closed) {
      if (!coverage) {
        issue('plan.md', built
          ? 'every task is [X] but there is no `## AC Coverage` section — /build appends it, and /sync reads it before closing the story'
          : 'archived without a `## AC Coverage` section — /sync reads it before closing the story');
      } else {
        const uncovered = coverage.filter((r) => r.uncovered);
        if (uncovered.length) {
          issue('plan.md', `${uncovered.length} AC(s) marked ✗ in AC Coverage (${uncovered.map((r) => r.id).join(', ')}) — a ✗ is an unfinished build, not a footnote`);
        }
        for (const ac of acs) {
          if (!coverage.some((r) => r.id === ac.id.toUpperCase())) {
            issue('plan.md', `${ac.id} has no line in "## AC Coverage" — one line per AC in spec.md, no more and no fewer`);
          }
        }
        const noTest = coverage.filter((r) => r.covered && !/[./]\w+/.test(r.text));
        for (const r of noTest) warn('plan.md', `${r.id} is marked ✓ with no concrete test reference`);
      }
    }
  }

  // ── closed stories ────────────────────────────────────────────────────────
  // The equivalent of `openspec validate --archived`: a story only leaves
  // work/active with its plan fully executed.
  if (closed && taskList.length && doneTasks.length !== taskList.length) {
    issue('plan.md', `archived with ${taskList.length - doneTasks.length} task(s) still unchecked — /sync should not have closed it`);
  }

  return {
    storyId,
    location: story.location,
    dir: rel(story.dir),
    issues,
    warnings,
    notes,
    observations,
    ok: issues.length === 0 && (!strict || warnings.length === 0),
  };
}

// ── Report ──────────────────────────────────────────────────────────────────

function render(reports) {
  if (asJson) {
    const failed = reports.filter((r) => !r.ok).length;
    console.log(JSON.stringify({ version: '1.0', strict, root: profile.root, stories: reports }, null, 2));
    process.exit(failed ? 1 : 0);
  }

  let failed = 0;
  for (const r of reports) {
    const header = `${r.storyId} · ${r.location}`;
    const summary = r.notes.length ? ` — ${r.notes.join(' · ')}` : '';
    if (r.issues.length === 0 && r.warnings.length === 0) {
      console.log(`OK: ${header}${summary}`);
      for (const o of r.observations) console.log(`  note: ${o}`);
      continue;
    }
    console.log(`${header}${summary}`);
    for (const o of r.observations) console.log(`  note: ${o}`);
    if (r.warnings.length) {
      console.log(`  WARNINGS (${r.warnings.length}):`);
      for (const w of r.warnings) console.log(`    ${w.artifact}: ${w.message}`);
    }
    if (r.issues.length) {
      console.log(`  ISSUES (${r.issues.length}):`);
      for (const i of r.issues) console.log(`    ${i.artifact}: ${i.message}`);
    }
    if (!r.ok) failed++;
  }
  process.exit(failed ? 1 : 0);
}

function rel(path) {
  const r = relative(profile.root, path);
  return r.startsWith('..') ? path : r.split('\\').join('/');
}
