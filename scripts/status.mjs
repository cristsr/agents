#!/usr/bin/env node
// status.mjs — computes where a story sits in the SDD pipeline, deterministically.
//   node ~/.agents/scripts/status.mjs [story-id] [--json] [--all]
//
// The pipeline is a dependency graph, not a checklist: each artifact declares what
// it requires, and the stage is COMPUTED from what exists on disk. The first
// `ready` artifact is the one to write next — the /status skill renders that
// answer, it doesn't derive it.
//
// Read-only: it opens files and never writes, moves or deletes anything.
//
// Exit codes: 0 = reported · 2 = could not run (unknown story, no workspace)

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { loadProfile, listStories, storyIdMatcher, workdirBase } from './lib/profile.mjs';
import { readStory, acceptanceCriteria, clarificationMarkers, tasks, acCoverage, traceability } from './lib/story.mjs';

// ── The pipeline graph ──────────────────────────────────────────────────────
// Order here is dependency order; ties break by declaration order, so the first
// `ready` entry is always the next thing to do.
const PIPELINE = [
  { id: 'spec', file: 'spec.md', requires: [], command: '/spec' },
  { id: 'context', file: 'context.md', requires: ['spec'], command: '/clarify' },
  { id: 'design', file: 'design.md', requires: ['context'], command: '/design' },
  { id: 'plan', file: 'plan.md', requires: ['design'], command: '/plan' },
  { id: 'build', file: null, requires: ['plan'], command: '/build' },
  { id: 'sync', file: null, requires: ['build'], command: '/sync' },
];

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
    console.log(JSON.stringify({ root: profile.root, profile: profile.path, stories: reports }, null, 2));
    process.exit(0);
  }
  if (reports.length === 0) {
    console.log(`No active stories under ${rel(workdirBase(profile, 'active'))}`);
    process.exit(0);
  }
  console.log(`${reports.length} active ${reports.length === 1 ? 'story' : 'stories'}\n`);
  for (const r of reports) {
    const stage = r.artifacts.filter((a) => a.status === 'done').map((a) => a.id).pop() ?? 'inbox';
    console.log(`  ${r.storyId.padEnd(16)} ${stage.padEnd(9)} → ${r.next?.command ?? '/commit'} ${r.detail ?? ''}`.trimEnd());
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
  const coverage = acCoverage(story.text.plan);
  const closed = story.location === 'done';

  // Satisfaction per artifact. `context` is not done while unresolved markers
  // remain: /clarify's own contract is to leave zero, so a spec still carrying
  // them means clarification is unfinished, not that design may start.
  const satisfied = {
    spec: Boolean(story.files.spec),
    context: Boolean(story.files.context) && markers.length === 0,
    design: Boolean(story.files.design),
    plan: Boolean(story.files.plan),
    build: taskList.length > 0 && doneTasks.length === taskList.length,
    sync: closed,
  };

  const artifacts = PIPELINE.map((node) => {
    const missingDeps = node.requires.filter((dep) => !satisfied[dep]);
    const status = satisfied[node.id] ? 'done' : missingDeps.length ? 'blocked' : 'ready';
    const entry = {
      id: node.id,
      status,
      requires: node.requires,
      outputPath: node.file ? rel(join(story.dir, node.file)) : null,
    };
    if (missingDeps.length) entry.missingDeps = missingDeps;
    return entry;
  });

  const next = artifacts.find((a) => a.status !== 'done');
  const nextNode = next ? PIPELINE.find((n) => n.id === next.id) : null;

  // A pending artifact sitting BEHIND finished ones is a regression, not the next
  // step: something downstream was already built on top of it. Naming it matters —
  // re-running the stage would discard that work, and /hotfix is the way back in.
  const nextIndex = next ? artifacts.indexOf(next) : -1;
  const regression = nextIndex !== -1 && artifacts.slice(nextIndex + 1).some((a) => a.status === 'done');

  const warnings = [];
  if (markers.length) warnings.push(`${markers.length} unresolved [NEEDS CLARIFICATION] marker(s) in spec.md`);
  if (acs.length === 0 && story.files.spec) warnings.push('spec.md has no `### AC-N:` acceptance criteria');
  if (story.files.plan && !story.files.branch && !closed) warnings.push('no `.branch` marker — /prepare never ran');
  if (story.files.plan && traceability(story.text.plan) === null) {
    warnings.push('plan.md has no `### AC → Task traceability` table');
  }
  if (coverage?.some((r) => r.uncovered)) {
    warnings.push(`AC Coverage has ${coverage.filter((r) => r.uncovered).length} AC(s) marked ✗`);
  }
  if (satisfied.build && !coverage) warnings.push('every task is [X] but plan.md has no `## AC Coverage` section');
  if (regression) {
    warnings.push(`${next.id} is unfinished but later stages are done — re-running that stage would discard built work`);
  }

  return {
    storyId,
    root: profile.root,
    location: story.location,
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

  const glyph = { done: '✓', ready: '◑', blocked: '·' };
  const detail = {
    spec: report.counts.acceptanceCriteria ? `${report.counts.acceptanceCriteria} ACs` : '',
    context: '',
    design: report.docs.length ? `+ docs/ (${report.docs.join(', ')})` : '',
    plan: report.counts.tasks.total ? `${report.counts.tasks.total} tasks` : '',
    build: report.counts.tasks.total ? `${report.counts.tasks.done}/${report.counts.tasks.total} tasks` : '',
    sync: report.location === 'done' ? 'archived' : '',
  };

  console.log(`${report.storyId} · ${report.location}${report.branch ? ` · ${report.branch}` : ''}\n`);
  for (const a of report.artifacts) {
    const name = a.outputPath ? a.id.padEnd(9) : a.id.padEnd(9);
    const suffix = a.status === 'blocked' ? `blocked: needs ${a.missingDeps.join(', ')}` : detail[a.id] ?? '';
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
  const r = relative(profile.root, path);
  return r.startsWith('..') ? path : r.split('\\').join('/');
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
