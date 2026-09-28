---
name: sdd-ready
description: >
  Takes a reviewed spec.md to a story ready for design, planning or building in
  one command: chains /sdd-route, /sdd-prepare, /sdd-scan, /sdd-clarify and the
  /sdd-route review, skipping the stages already done and stopping only where a
  stage needs the developer's answer. Implements nothing itself.
  Use when the user says "/sdd-ready spec-XXXX", "get the story ready", "take
  spec-XXXX up to the design", "run everything before the design", "déjala
  lista", "déjala lista para diseñar", or right after reviewing a new spec.md.
  Do NOT use to write the spec (use /sdd-spec), to run a single stage (use
  that stage's skill), or to plan, build and sync (use /sdd-forge).
---

# ready

## Overview

A thin orchestrator for the first half of the pipeline. It invokes the stage skills in
order and consolidates one report; every decision and every file belongs to the stage
that owns it.

```
spec.md (reviewed) → /sdd-route → /sdd-prepare → /sdd-scan → /sdd-clarify → /sdd-route
                     initial                                                  review
```

A `fast` story stops after `/sdd-prepare`: its tier has no survey and no clarification.

**Core principle:** chaining never changes what a stage decides. The stages keep their
own gates and their own questions; this skill only saves the developer from typing the
next command when no answer is needed.

**Unlike `/sdd-forge`, it is interactive.** The stages it chains ask questions — the
branch name, the components, the escalations, the evidence or lowering question — and
each question reaches the developer exactly as the stage asks it. `/sdd-forge` chains the
second half, which asks nothing.

**Announce at start:** "Getting spec-<number> ready: <the stages left, in order>."

**Output:** nothing of its own — `spec.md`, `.branch` and `context.md` as the stages
write them, and one consolidated report.

---

## Project profile (read first, always)

Read `.agents/profile.yaml` from the project root before anything else, as
`~/.agents/references/project-profile.md` describes. The keys this skill reads are
listed under **Profile keys** in the `Contract` below.

---

## Contract

**Requires**

| Condition | Check | If it fails |
|---|---|---|
| You are in the project's working directory | `pwd` == `WORKING_DIRECTORY` | `cd` there before running anything |
| An item id was given | the input carries an id matching `STORY_ID_PATTERN` | Ask: "Which item? (e.g. spec-1933)". Raw text is not an item — that's `/sdd-spec`, and its output is reviewed before this skill runs |
| `spec.md` exists with at least one AC | `[ -f work/active/spec-<number>/spec.md ]` | Stop: "Run `/sdd-spec spec-<number>` first, and review it." |
| The story is not past this half | `node ~/.agents/scripts/status.mjs spec-<number> --json` → `next.artifact` is not `design`, `plan`, `build` or `sync` | Stop and name the next command the report gives — nothing is left for this skill |

**Produces** — nothing of its own; each stage produces under its own `Contract`

- a story whose `/sdd-status` next step is `design`, `plan` or `build`
- one consolidated report (Step 3) and the one next command

**Writes** — nothing. Every file is written by a stage within its own `Writes` list.

**Never**

- write, patch or fix an artifact by hand — a stage that stops is reported, not worked
  around
- answer a stage's question for the developer, or skip one because a default looks
  obvious
- add, skip or reorder a stage relative to what the story's tier declares
- run git — the only git that happens is `/sdd-prepare`'s, under its own `Contract`
- continue into `/sdd-design`, `/sdd-plan` or `/sdd-build`

**Escalates** — nothing of its own. The questions are the stages'; they pass through
unchanged.

**Profile keys**

- `STORY_ID_PATTERN`, `WORKDIR_ACTIVE` — the item's id and workspace, written here as
  `spec-<number>` and `work/active/spec-<number>/`
- `WORKING_DIRECTORY` — the first `Requires` row
- `PREP_SKILL` — the skill that prepares the branch (`/sdd-prepare` by default)
- `OUTPUT_LANGUAGE` — see "Output language"

---

## Flow

### Step 1 — Where the story is

Decide the stages left, from disk — never from memory:

| The story has | Stages left |
|---|---|
| no `work/active/spec-<number>/.branch` | initial `/sdd-route`, `/sdd-prepare`, then the rest by tier |
| `.branch`, tier `fast` | none — stop and hand off (Step 3) |
| `.branch`, tier `standard`/`full` | from `status.mjs`'s `next.artifact`: `context` → `/sdd-scan`, `clarify` → `/sdd-clarify`, `route` → the `/sdd-route` review |

`/sdd-prepare` runs right after the initial `/sdd-route`, so a `.branch` marker means both
already ran. The tier is read from `spec.md`'s front matter after the initial route
(absent → `full`).

### Step 2 — Chain the stages

For each stage left, in order: announce it in one line, invoke the stage's skill with
`spec-<number>`, and let it run to its own end — including its questions.

After each stage, check its post-condition before the next one:

| Stage | Post-condition | Check |
|---|---|---|
| `/sdd-route` initial | the tier is valid | `node ~/.agents/scripts/validate-artifacts.mjs spec-<number>` exits `0` |
| `/sdd-prepare` | the working branch exists | `[ -f work/active/spec-<number>/.branch ]` |
| `/sdd-scan` | the survey exists | `[ -f work/active/spec-<number>/context.md ]` |
| `/sdd-clarify` | zero markers | `grep -c 'NEEDS CLARIFICATION' work/active/spec-<number>/spec.md` → `0` |
| `/sdd-route` review | the route is logged | `status.mjs` → `next.artifact` is `design`, `plan` or `build` |

- A stage that **stops on its own gate**, or a post-condition that fails → **stop the
  chain**. Report which stage stopped, its message verbatim, and the command that resumes
  once it's fixed: `/sdd-ready spec-<number>` again (Step 1 skips what's done).
- After the initial `/sdd-route`, re-read the tier: `fast` ends the chain after
  `/sdd-prepare`.
- Don't render each stage's own handoff line as a next step — within the chain, the next
  step is the next stage. Keep the stage's summary for Step 3.

### Step 3 — Consolidated report

One summary, in this order:

1. **Route:** the tier and the build mode, and whether the review raised the tier (say
   it — the developer may have read the initial one).
2. **Branch:** the working branch `/sdd-prepare` recorded.
3. **Survey:** components surveyed and gaps found — or "no survey in the `fast` tier".
4. **Clarification:** decisions taken autonomously, consulted, and the low-confidence
   ones first.
5. **Next** — exactly one command:

| `tier` | `build_mode` | Next |
|---|---|---|
| `full` | `tdd` | `/sdd-design spec-<number>`, then `/sdd-forge spec-<number>` |
| `full` | `evidence` | `/sdd-forge spec-<number>` |
| `standard` | either | `/sdd-forge spec-<number>` |
| `fast` | either | `/sdd-forge spec-<number>` (or `/sdd-build spec-<number>` alone) |

Stop — don't start the next stage.

---

## Output language

**Conversational output** follows `~/.agents/references/chat-conventions.md` — the six
blocks (announce, progress, question, summary, stop, handoff). Each stage's questions
keep the stage's own wording; the progress line per stage and the consolidated summary
are this skill's.

---

## Common Issues

The ones that **stop** the chain. Every other failure mode is in
`references/common-issues.md`.

| Issue | Cause | Resolution |
|---|---|---|
| A stage stopped on its own gate | Its `Requires` failed, or it hit a stop | Report it verbatim; fix what it names; run `/sdd-ready spec-<number>` again |
| The working tree is dirty at `/sdd-prepare` | Uncommitted work would ride into the new branch | The chain stops with prepare; commit or stash, then re-run |
| Clarification left markers | The run was interrupted | Re-run: Step 1 resumes at `/sdd-clarify` |
| The story is already past this half | Design, plan or build is next | Nothing to chain — run the command `/sdd-status` names |

---

## Example

A worked run — a `standard` story raised to `full` by the review, and a `fast` one that
stops after `/sdd-prepare` — is in `references/example.md`.
