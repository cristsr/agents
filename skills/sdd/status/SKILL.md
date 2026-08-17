---
name: status
description: >
  Diagnoses where a story is in the SDD pipeline: which artifacts exist
  (spec.md, context.md, design.md, plan.md), how many plan tasks are done, and
  what the next step is. Also lists active and done stories. Use when the user
  says "/status", "/status spec-XXXX", "what stage is it in", "where did we
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

Read `.agents/profile.yaml` at the root of the current project before anything else.
If it doesn't exist, tell the user to run `/bootstrap` and stop — without a profile you
don't know this project's conventions. The file is a YAML map of named blocks; a key
holding `null` is not configured, so use the fallback this skill declares for it —
never a guessed value.

Any path or id shown in this document is an example resolution; the profile's value
wins. The keys this skill reads are listed under **Profile keys** in the `Contract`
below.

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
report it as "not required in this carril" and never suggest `/design` for it.

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
| `context` | spec.md exists (or still carries markers) | `/clarify` |
| `design` | context.md is clean | `/design` |
| `plan` | design.md (+ docs/) approved | `/plan` |
| `build` | plan.md written, tasks pending | `/build` (resumes at the first unchecked task) |
| `sync` | every task `[X]` | `/sync` |
| — (all done) | folder under `WORKDIR_DONE` | `/commit` |

Two cases deserve a sentence of their own in the report rather than a bare command:

- **Pending markers.** `counts.clarificationMarkers > 0` holds `context` open even
  when later artifacts exist — `/design` won't proceed until they're resolved.
- **Regression.** `next.regression` means a finished stage sits on top of an
  unfinished one. Re-running that stage would discard built work, so the script
  points at `/hotfix` instead. Say why, don't just relay the command.

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

## Output language
**Conversational output** follows `~/.agents/references/chat-conventions.md` - the six blocks (announce, progress, question, summary, stop, handoff).

This skill writes no artifacts. **Chat interaction follows the user's language**
(`OUTPUT_LANGUAGE` in the profile) — the report samples above are written in English;
render them in the user's language when that differs.
