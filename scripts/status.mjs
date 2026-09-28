#!/usr/bin/env node
// status.mjs — computes where a story sits in the SDD pipeline, deterministically.
//   node ~/.agents/scripts/status.mjs [story-id] [--json] [--all]
//
// The pipeline is a dependency graph, not a checklist: each artifact declares what
// it requires, and the stage is COMPUTED from what exists on disk. The first
// `ready` artifact is the one to write next — the /sdd-status skill renders that
// answer, it doesn't derive it.
//
// Read-only: it opens files and never writes, moves or deletes anything.
//
// Exit codes: 0 = reported · 2 = could not run (unknown story, no workspace)

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadProfile, listStories, storyIdMatcher, workdirBase } from './lib/profile.mjs';
import { rel as toRel } from './lib/paths.mjs';
import { readStory, acceptanceCriteria, clarificationMarkers, tasks, acCoverage, traceability, buildMode, tier, hasHeading, section } from './lib/story.mjs';

// ── The pipeline graph ──────────────────────────────────────────────────────
// Order here is dependency order; ties break by declaration order, so the first
// `ready` entry is always the next thing to do.
//
// `route` is /sdd-route's review run, the one after clarification. Its initial run
// (right after /sdd-spec) leaves no trace a script can read when both axes keep their
// defaults, so it is not a node — like /sdd-prepare, it is reported by its absence
// only where something downstream needs it.
const PIPELINE = [
  { id: 'spec', file: 'spec.md', requires: [], command: '/sdd-spec' },
  { id: 'context', file: 'context.md', requires: ['spec'], command: '/sdd-scan' },
  { id: 'clarify', file: null, requires: ['context'], command: '/sdd-clarify' },
  { id: 'route', file: null, requires: ['clarify'], command: '/sdd-route' },
  { id: 'design', file: 'design.md', requires: ['route'], command: '/sdd-design' },
  { id: 'plan', file: 'plan.md', requires: ['design'], command: '/sdd-plan' },
  { id: 'build', file: null, requires: ['plan'], command: '/sdd-build' },
  { id: 'sync', file: null, requires: ['build'], command: '/sdd-sync' },
];

/**
 * The graph as the story's two axes draw it. A stage that never runs is marked
 * `skipped` rather than `pending` — otherwise the next step would read "/sdd-design"
 * in a flow where /sdd-design has nothing to produce.
 *
 * `build_mode: evidence` removes the design stage whatever the tier: that carril has
 * no API contract and no sequence diagram to make. The tier removes more — `standard`
 * also drops the design, and `fast` drops clarification and the plan as well, which is
 * why its build hangs off spec.md and not off a plan.
 */
function pipelineFor(mode, storyTier) {
  const nodes = PIPELINE.map((node) => ({ ...node }));
  const set = (id, patch) => Object.assign(nodes.find((n) => n.id === id), patch);

  if (storyTier === 'fast') {
    set('context', { skipped: true });
    set('clarify', { skipped: true });
    set('route', { skipped: true });
    set('design', { skipped: true });
    set('plan', { skipped: true, requires: [] });
    set('build', { requires: ['spec'] });
    return nodes;
  }
  if (storyTier === 'standard') {
    set('design', { skipped: true });
    set('plan', { requires: ['route'] });
    return nodes;
  }
  // `full` runs everything but the evidence carril's design, which has no API contract
  // and no sequence diagram to produce; the plan then hangs off the routed story instead.
  if (mode === 'evidence') {
    set('design', { skipped: true });
    set('plan', { requires: ['route'] });
  }

  return nodes;
}

const argv = process.argv.slice(2);
const asJson = argv.includes('--json');
const all = argv.includes('--all');
const storyArg = argv.find((a) => !a.startsWith('--')) ?? null;

const profile = loadProfile();

if (!storyArg || all) {
  reportAll();
} else {
  const report = buildReport(storyArg);
  if (!report) {
    fail(`No story carries the id "${storyArg}".`, activeHint());
  }
  output(report);
}

// ── Reporting ───────────────────────────────────────────────────────────────

function reportAll() {
  const active = listStories(profile, 'active').filter((id) => storyIdMatcher(profile).test(id));
  const reports = active.map(buildReport).filter(Boolean);
  if (asJson) {
    console.log(JSON.stringify({ root: profile.root, profile: rel(profile.path), stories: reports }, null, 2));
    process.exit(0);
  }
  if (reports.length === 0) {
    console.log(`No active stories under ${rel(workdirBase(profile, 'active'))}`);
    process.exit(0);
  }
  console.log(`${reports.length} active ${reports.length === 1 ? 'story' : 'stories'}\n`);
  for (const r of reports) {
    const stage = r.artifacts.filter((a) => a.status === 'done').map((a) => a.id).pop() ?? 'inbox';
    const tag = r.tier === 'full' ? '' : ` (${r.tier})`;
    console.log(`  ${(r.storyId + tag).padEnd(16)} ${stage.padEnd(9)} → ${r.next?.command ?? '/sdd-commit'} ${r.detail ?? ''}`.trimEnd());
  }
  process.exit(0);
}

function buildReport(storyId) {
  const story = readStory(profile, storyId);
  if (!story.dir) return null;

  const markers = clarificationMarkers(story.text.spec);
  const acs = acceptanceCriteria(story.text.spec);
  const taskList = tasks(story.text.plan);
  const doneTasks = taskList.filter((t) => t.done);
  const closed = story.location === 'done';
  const mode = buildMode(story.text.spec);
  const storyTier = tier(story.text.spec);
  const fastTier = storyTier === 'fast';
  // The tier decides where the story closes: a plan's `## AC Coverage` for full and
  // standard, spec.md's own for fast — which writes no plan at all.
  const coverage = acCoverage(fastTier ? story.text.spec : story.text.plan);
  const pipeline = pipelineFor(mode, storyTier);

  // Satisfaction per artifact. `clarify` is not done while unresolved markers
  // remain: /sdd-clarify's own contract is to leave zero, so a spec still carrying
  // them means clarification is unfinished, not that design may start. `route` is done
  // once the review wrote its two entries into the decision log. `build` is closed by
  // the artifact the tier closes in.
  const log = section(story.text.spec, 'Ambiguity Resolution') ?? '';
  const satisfied = {
    spec: Boolean(story.files.spec),
    context: Boolean(story.files.context),
    clarify: hasHeading(story.text.spec, 'Ambiguity Resolution') && markers.length === 0,
    route: /\*\*Tier ·/.test(log) && /\*\*Build mode ·/.test(log),
    design: Boolean(story.files.design),
    plan: Boolean(story.files.plan),
    build: fastTier
      ? Boolean(coverage?.length) && !coverage.some((r) => r.uncovered)
      : taskList.length > 0 && doneTasks.length === taskList.length,
    sync: closed,
  };

  const artifacts = pipeline.map((node) => {
    const missingDeps = node.requires.filter((dep) => !satisfied[dep]);
    const status = node.skipped && !satisfied[node.id]
      ? 'skipped'
      : satisfied[node.id] ? 'done' : missingDeps.length ? 'blocked' : 'ready';
    const entry = {
      id: node.id,
      status,
      requires: node.requires,
      outputPath: node.file ? rel(join(story.dir, node.file)) : null,
    };
    if (missingDeps.length) entry.missingDeps = missingDeps;
    return entry;
  });

  const next = artifacts.find((a) => a.status !== 'done' && a.status !== 'skipped');
  const nextNode = next ? pipeline.find((n) => n.id === next.id) : null;

  // A pending artifact sitting BEHIND finished ones is a regression, not the next
  // step: something downstream was already built on top of it. Naming it matters —
  // re-running the stage would discard that work, and /sdd-hotfix is the way back in.
  const nextIndex = next ? artifacts.indexOf(next) : -1;
  const regression = nextIndex !== -1 && artifacts.slice(nextIndex + 1).some((a) => a.status === 'done');

  const warnings = [];
  if (markers.length) warnings.push(`${markers.length} unresolved [NEEDS CLARIFICATION] marker(s) in spec.md`);
  if (acs.length === 0 && story.files.spec) warnings.push('spec.md has no `### AC-N:` acceptance criteria');
  if ((story.files.plan || fastTier) && !story.files.branch && !closed) {
    warnings.push('no `.branch` marker — /sdd-prepare never ran');
  }
  if (story.files.plan && traceability(story.text.plan) === null) {
    warnings.push('plan.md has no `### AC → Task traceability` table');
  }
  if (fastTier) {
    // The tier writes no plan and no design, so the scope contract and the close both
    // live in spec.md. What is missing is named here; validate-artifacts.mjs rejects it.
    if (story.files.spec && !hasHeading(story.text.spec, 'Change Surface')) {
      warnings.push('tier: fast without a `## Change Surface` section — the build has no declared scope');
    }
    if (story.files.plan) warnings.push('plan.md is present in a `tier: fast` story — the close belongs to `## AC Coverage` in spec.md');
    if (story.files.context) warnings.push('context.md is present in a `tier: fast` story — that tier runs no survey');
  } else if (storyTier === 'standard' && story.files.design) {
    warnings.push('design.md is present in a `tier: standard` story — raise the tier, or drop the artifact');
  }
  if (coverage?.some((r) => r.uncovered)) {
    warnings.push(`AC Coverage has ${coverage.filter((r) => r.uncovered).length} AC(s) marked ✗`);
  }
  if (satisfied.build && !coverage) {
    warnings.push(fastTier
      ? 'the criterion reads as closed but spec.md has no `## AC Coverage` section'
      : 'every task is [X] but plan.md has no `## AC Coverage` section');
  }
  if (regression) {
    warnings.push(`${next.id} is unfinished but later stages are done — re-running that stage would discard built work`);
  }

  return {
    storyId,
    root: profile.root,
    location: story.location,
    buildMode: mode,
    tier: storyTier,
    dir: rel(story.dir),
    artifacts,
    next: nextNode && !closed
      ? {
          artifact: next.id,
          command: regression ? `/hotfix ${storyId}` : `${nextNode.command} ${storyId}`,
          blocked: next.status === 'blocked',
          regression,
          regressedStage: regression ? next.id : null,
        }
      : { artifact: null, command: `/commit ${storyId}`, blocked: false, regression: false, regressedStage: null },
    counts: {
      acceptanceCriteria: acs.length,
      tasks: { done: doneTasks.length, total: taskList.length },
      clarificationMarkers: markers.length,
    },
    docs: story.files.docs ? readdirSync(story.files.docs).sort() : [],
    branch: story.files.branch ? read(story.files.branch) : null,
    warnings,
    detail: taskList.length ? `(${doneTasks.length}/${taskList.length} tasks)` : '',
  };
}

function output(report) {
  if (asJson) {
    console.log(JSON.stringify(report, null, 2));
    process.exit(0);
  }

  const glyph = { done: '✓', ready: '◑', blocked: '·', skipped: '–' };
  const detail = {
    spec: report.counts.acceptanceCriteria ? `${report.counts.acceptanceCriteria} ACs` : '',
    context: '',
    design: report.docs.length ? `+ docs/ (${report.docs.join(', ')})` : '',
    plan: report.counts.tasks.total ? `${report.counts.tasks.total} tasks` : '',
    build: report.tier === 'fast'
      ? (report.counts.acceptanceCriteria ? `${report.counts.acceptanceCriteria} AC(s) closed` : '')
      : (report.counts.tasks.total ? `${report.counts.tasks.done}/${report.counts.tasks.total} tasks` : ''),
    sync: report.location === 'done' ? 'archived' : '',
  };

  const modeLabel = report.buildMode === 'tdd' ? '' : ` · ${report.buildMode} mode`;
  const tierLabel = report.tier === 'full' ? '' : ` · ${report.tier} tier`;
  console.log(`${report.storyId} · ${report.location}${tierLabel}${modeLabel}${report.branch ? ` · ${report.branch}` : ''}\n`);
  // A skipped stage is skipped by one of two axes, and naming the wrong one sends the
  // developer to the profile instead of to spec.md's front matter.
  const skipNote = (id) => (id === 'design' && report.buildMode === 'evidence'
    ? 'not required in evidence mode'
    : `not required in the ${report.tier} tier`);
  for (const a of report.artifacts) {
    const name = a.outputPath ? a.id.padEnd(9) : a.id.padEnd(9);
    const suffix = a.status === 'blocked'
      ? `blocked: needs ${a.missingDeps.join(', ')}`
      : a.status === 'skipped' ? skipNote(a.id) : detail[a.id] ?? '';
    console.log(`  ${glyph[a.status]} ${name} ${suffix}`.trimEnd());
  }
  if (report.warnings.length) {
    console.log('');
    for (const w of report.warnings) console.log(`  ! ${w}`);
  }
  console.log(`\nNext: ${report.next.command}`);
  process.exit(0);
}

// ── helpers ─────────────────────────────────────────────────────────────────

function read(path) {
  try { return readFileSync(path, 'utf8').trim(); } catch { return null; }
}

function rel(path) {
  return toRel(path, profile.root);
}

function activeHint() {
  const base = workdirBase(profile, 'active');
  if (!existsSync(base)) return `No workspace at ${rel(base)} — is this the project root?`;
  const active = listStories(profile, 'active');
  return active.length ? `Active: ${active.join(', ')}` : `No active stories under ${rel(base)}`;
}

function fail(message, hint) {
  if (asJson) {
    console.log(JSON.stringify({ status: [{ severity: 'error', code: 'unknown_item', message, fix: hint }] }, null, 2));
  } else {
    console.error(`FAIL: ${message}`);
    if (hint) console.error(hint);
  }
  process.exit(2);
}
