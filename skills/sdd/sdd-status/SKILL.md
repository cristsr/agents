---
name: sdd-status
description: >
  Diagnoses where a story is in the SDD pipeline: which artifacts exist
  (spec.md, context.md, design.md, plan.md), how many plan tasks are done, and
  what the next step is. Also lists active and done stories. Use when the user
  says "/sdd-status", "/sdd-status spec-XXXX", "what stage is it in", "where did we
  leave off", "what's missing to move forward", "story status", or after an
  interrupted session to resume work. Read-only — never writes or mutates anything.
---

# status

## Overview

Reads (read-only) the story's folder and reports its stage in the pipeline without
executing anything. Useful for resuming interrupted sessions and for deciding which
command comes next.

**Announce at start:** "Status of spec-<number>: ..."

---

## Project profile (read first, always)

Read `.agents/profile.yaml` from the project root before anything else, as
`~/.agents/references/project-profile.md` describes: what a missing file means, how a
`null` key falls back, how a port resolves to an adapter, and why every path or command
shown here is only an example the profile overrides. The keys this skill reads are
listed under **Profile keys** in the `Contract` below.

---

## Contract

A read-only diagnosis: it has an input contract and no output artifact, so most rows
are short. What matters here is the last two.

**Requires**

| Condition | If it fails |
|---|---|
| `pwd` == `WORKING_DIRECTORY` (absolute path, from the profile) | `cd` there before running anything |
| A story id matching `STORY_ID_PATTERN` (or `STORY_ID_LEGACY_PREFIXES`), or no argument at all | With no argument, the script lists every story under `WORKDIR_ACTIVE` — that's a valid invocation, not an error (Step 1) |
| `node` on PATH, for `~/.agents/scripts/status.mjs` | Fall back to checking the files by hand and say so (Step 1, **Degrades**) |
| The story's folder exists under `WORKDIR_ACTIVE` or `WORKDIR_DONE` | Report that no story carries that id, list the active ones, and stop. Don't create the folder |

**Produces** — a stage report in the chat: one line per artifact, plus one "Next step"
line naming the exact command to run. Nothing is handed to another skill — the user
runs the command the report names.

**Writes** — nothing. This skill creates, edits, moves and deletes no file, in the
story's workspace or anywhere else.

**Never**

- **Allowed:** running `~/.agents/scripts/status.mjs` (read-only), existence checks
  (`ls`, `[ -f ]`, `[ -d ]`), reading the story's artifacts, counting markers inside
  them (`rg -c`).
- **Forbidden:** any write, move, rename or delete; any state-changing git command;
  and invoking the next pipeline skill on the user's behalf. It reports the command,
  it doesn't run it.

**Profile keys**

- `STORY_ID_PATTERN`, `STORY_ID_LEGACY_PREFIXES` — the ids it accepts, current and
  legacy (see the note in Step 2)
- `WORKDIR_ACTIVE`, `WORKDIR_DONE` — where it looks, written throughout this document
  as `work/active/spec-<number>/` and `work/done/spec-<number>/`
- `WORKING_DIRECTORY` — the gate in `Requires`
- `OUTPUT_LANGUAGE` — see "Output language"

---

## Step 1: Compute the stage

The stage is **computed, not inferred**. Run the script — it reads the profile,
resolves the workspace, and returns the pipeline as a dependency graph with each
artifact's status already decided:

```bash
node ~/.agents/scripts/status.mjs <story-id> --json
```

Without a story id (or with `--all`) it reports every active story instead — that's a
valid invocation, not an error.

The payload:

| Field | What it holds |
|---|---|
| `artifacts[]` | one entry per pipeline stage, **in dependency order**, each with `status` (`done` \| `ready` \| `blocked` \| `skipped`), `requires` and `missingDeps` |
| `buildMode` | the story's carril (`tdd` \| `evidence`), from `spec.md`'s front matter |
| `next` | the first artifact that is neither `done` nor `skipped`, and the exact command for it |
| `next.regression` | `true` when that pending stage sits *behind* finished ones |
| `counts` | ACs, `tasks: {done, total}`, pending `[NEEDS CLARIFICATION]` markers |
| `docs`, `branch` | the contents of `docs/` and the `.branch` marker |
| `warnings[]` | already-worded findings — render them, don't re-derive them |

**The first `ready` entry is the artifact to write next.** Don't recompute the order,
don't second-guess `next.command`: this skill renders the answer, it doesn't derive it.

A `skipped` stage is not a gap. In `build_mode: evidence` the `design` stage is
skipped by construction — that carril has no contract or diagram to produce — so
report it as "not required in this carril" and never suggest `/sdd-design` for it.

> **Legacy items.** Those closed before the rename use `hu.md` and an old ID prefix
> (`STORY_ID_LEGACY_PREFIXES` in the profile). The script accepts both — they're read
> normally, never renamed, never reported as incomplete.

**Degrades** — exit code `2` means the script couldn't run (unknown id, no workspace):
report its message. If node is unavailable, fall back to checking the files by hand
(`[ -f work/active/<id>/spec.md ]`, … , `rg -c '\[X\]' plan.md`) and say the report is
the manual fallback.

## Step 2: Read the answer

The stages the script reports, and what each one means:

| Stage `ready` | Meaning | Command |
|---|---|---|
| `spec` | nothing written yet | `/spec <id>` |
| `context` | spec.md exists (or still carries markers) | `/sdd-clarify` |
| `design` | context.md is clean | `/sdd-design` |
| `plan` | design.md (+ docs/) approved | `/sdd-plan` |
| `build` | plan.md written, tasks pending | `/sdd-build` (resumes at the first unchecked task) |
| `sync` | every task `[X]` | `/sdd-sync` |
| — (all done) | folder under `WORKDIR_DONE` | `/sdd-commit` |

**`/sdd-prepare` is missing from that table on purpose — it is orthogonal to the stages,
and the report has to say so anyway.** It doesn't produce an artifact the script reads
as a stage; it leaves `.branch`, which `/sdd-plan` requires and `/sdd-build` re-checks. So
whenever `branch` is `null` and the story has a `spec.md`, name it alongside whatever
stage command applies:

> "Next: `/clarify <id>` — and `/prepare <id>` at some point before `/sdd-plan`, which
> stops without the `.branch` marker."

Relaying only the stage command sends the user to a stop that `/sdd-status` could see
coming: the script already reports `branch`, and warns explicitly once `plan.md`
exists without it.

Two cases deserve a sentence of their own in the report rather than a bare command:

- **Pending markers.** `counts.clarificationMarkers > 0` holds `context` open even
  when later artifacts exist — `/sdd-design` won't proceed until they're resolved.
- **Regression.** `next.regression` means a finished stage sits on top of an
  unfinished one. Re-running that stage would discard built work, so the script
  points at `/sdd-hotfix` instead. Say why, don't just relay the command.

## Step 3: Report and stop

Concise format, one line per artifact + one "Next step" line. Don't execute anything
else — the skill is read-only. Suggest the exact command for the next step
(e.g. "Run `/build spec-0009` — it resumes from task 4 of 7."), and stop there: this
skill reports the command, the user decides whether to run it.

Render every entry in `warnings[]`; they're already worded and each one names a real
inconsistency. If the report is clean but the user is about to move to the next stage,
`node ~/.agents/scripts/validate-artifacts.mjs <story-id>` checks that the artifacts
also hold their **shape**, not just their presence — this skill never runs it on its
own, it names it.

---

## Common Issues

| Issue | Cause | Resolution |
|-------|-------|------------|
| `node` is not on PATH | The script can't run | Check the artifacts by hand (`[ -f ... ]`, `rg -c '\[X\]' plan.md`) and say the report was manual — see `Degrades` |
| No story carries that id | Typo, or the id uses a legacy prefix | The script reads `STORY_ID_LEGACY_PREFIXES` too. List the active stories and ask which one — never create the folder |
| The report suggests `/sdd-design` on an `evidence` story | The carril was read but not applied | `design` is `skipped` there, not missing: report "not required in this carril" and point at `/sdd-plan` |
| Everything looks done but the folder is still under `WORKDIR_ACTIVE` | `/sdd-sync` never ran | The next step is `/sdd-sync`, not `/sdd-commit` — `/sdd-commit` works on the archived story |
| `next.regression` came back | A finished stage sits on top of an unfinished one | Say why before relaying the command: re-running that stage would discard built work, which is why the script points at `/sdd-hotfix` |
| A stage is `ready` but `branch` is `null` | `/sdd-prepare` never ran | Name `/sdd-prepare` alongside the stage command — `/sdd-plan` stops without `.branch` |

---

## Example

**Input:** `/status spec-0042`

**Flow:** runs `status.mjs spec-0042 --json` and reads the answer. Nothing is written.

**Output:**
> `spec-0042` · active · `feat/SPEC-0042-transfer-projector`
> - spec.md ✓ · context.md ✓ · design.md ✓ · plan.md ✓ (7/11 tasks)
> - Stage: **build** — 4 tasks pending, resumes at Task 8.
> - Next: `/build spec-0042`

**Input:** `/sdd-status` — with no id.

**Output:** one line per active story with its stage, then the same for `WORKDIR_DONE`.
No "next step" line: with several stories open, the command belongs to whichever one
the user picks.

---

## Output language
**Conversational output** follows `~/.agents/references/chat-conventions.md` - the six blocks (announce, progress, question, summary, stop, handoff).

This skill writes no artifacts. **Chat interaction follows the user's language**
(`OUTPUT_LANGUAGE` in the profile) — the report samples above are written in English;
render them in the user's language when that differs.
