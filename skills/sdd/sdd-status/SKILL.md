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
| `artifacts[]` | one entry per pipeline stage, **in dependency order**, each with `status` (`done` \| `ready` \| `blocked` \| `skipped`), `requires` and `missingDeps`. `skipped` is a stage an axis *removed* — never one still to write (Step 2) |
| `buildMode` | the story's carril (`tdd` \| `evidence`), from `spec.md`'s front matter |
| `tier` | the story's tier (`fast` \| `standard` \| `full`), from the same front matter. `full` whenever the field is absent, because the default is the absence of the field |
| `next` | the first artifact that is neither `done` nor `skipped`, and the exact command for it |
| `next.regression` | `true` when that pending stage sits *behind* finished ones |
| `counts` | ACs, `tasks: {done, total}`, pending `[NEEDS CLARIFICATION]` markers. `tasks` stays `0/0` in `fast`, which writes no plan — that is the tier, not a missing artifact |
| `docs`, `branch` | the contents of `docs/` and the `.branch` marker |
| `warnings[]` | already-worded findings — render them, don't re-derive them |

The two axes are reported side by side and answer different questions: `buildMode` says
how an AC is closed, `tier` says which stages exist at all. The header carries
`· <tier> tier` only when the tier is not `full` — absent means `full`, so the default
story gets no label — and `--all` tags each row with `(standard)` or `(fast)` for the
same reason. Relay that label when it is there: it explains every stage the report is
missing before the user counts them as gaps.

**The first `ready` entry is the artifact to write next.** Don't recompute the order,
don't second-guess `next.command`: this skill renders the answer, it doesn't derive it.

**A `skipped` stage is not a gap, and it is never the next step.** One of the two axes
removed it: the tier (`design` in `standard`; `context`, `clarify`, `route`, `design` and `plan` in `fast`)
or the `build_mode` (`design` in the `evidence` carril, which has no contract or diagram
to produce). Render the removal in the script's own words — *"not required in the
standard tier"*, *"not required in the fast tier"*, *"not required in evidence mode"* —
and never suggest that stage's command. The script picks the wording itself: the
`evidence` carril is named wherever it removes `design`, the tier otherwise.

Because `next` is the first artifact that is neither `done` nor `skipped`, a `fast`
story never reads as a broken `full` one: with `spec.md` finished the report points at
`/sdd-build`, not at the clarification pass or the plan that tier never runs.

> **Legacy items.** Those closed before the rename use `hu.md` and an old ID prefix
> (`STORY_ID_LEGACY_PREFIXES` in the profile). The script accepts both — they're read
> normally, never renamed, never reported as incomplete.

**Degrades** — exit code `2` means the script couldn't run (unknown id, no workspace):
report its message. If node is unavailable, fall back to checking the files by hand
(`[ -f work/active/<id>/spec.md ]`, … , `rg -c '\[X\]' plan.md`) and say the report is
the manual fallback. Read the front matter first: a `fast` story has no `plan.md` to
count, so its close is `## AC Coverage` in `spec.md` — never report that story as
incomplete for the plan it does not have.

## Step 2: Read the answer

The stages the script reports, and what each one means. The third column names the
command *and the tiers where that stage exists at all* — a stage outside the story's
tier is never `ready`, so it never carries a command in the report:

| Stage `ready` | Meaning | Command |
|---|---|---|
| `spec` | nothing written yet | `/sdd-spec <id>` (every tier) |
| `context` | spec.md exists, no `context.md` yet | `/sdd-scan` (`full`, `standard` — `fast` runs no survey) |
| `clarify` | `context.md` exists; `## Ambiguity Resolution` missing or markers left | `/sdd-clarify` (`full`, `standard`) |
| `route` | clarified; the decision log has no `**Tier ·` / `**Build mode ·` entries | `/sdd-route` — its review run (`full`, `standard`) |
| `design` | the story is routed | `/sdd-design` (`full` only, and not in the `evidence` carril) |
| `plan` | the stage before it is approved — design.md (+ docs/), or the routed story wherever there is no design | `/sdd-plan` (`full`, `standard`; it reads `context.md` whenever it has no design to read) |
| `build` | work is left to execute (tasks pending; in `fast`, `spec.md` finished with its criterion not yet closed) | `/sdd-build` (resumes at the first unchecked task; in `fast` it reads `spec.md` instead and writes the close) |
| `sync` | the build is closed (every task `[X]`; in `fast`, `## AC Coverage` in `spec.md` with no `✗`) | `/sdd-sync` (every tier) |
| — (all done) | folder under `WORKDIR_DONE` | `/sdd-commit` (every tier) |

The sequence each tier actually runs, so the report is read against the right one:

- `full` — `/sdd-spec` → `/sdd-route` → `/sdd-prepare` → `/sdd-scan` → `/sdd-clarify`
  → `/sdd-route` → `/sdd-design` → `/sdd-plan` → `/sdd-build` → `/sdd-sync` →
  `/sdd-commit`; the `evidence` carril drops `/sdd-design`.
- `standard` — the same without `/sdd-design`.
- `fast` — `/sdd-spec` → `/sdd-route` → `/sdd-prepare` → `/sdd-build` → `/sdd-sync` →
  `/sdd-commit`: no `/sdd-scan`, no `/sdd-clarify`, no `/sdd-design` and no `/sdd-plan`.

The first `/sdd-route` (the initial run, right after `/sdd-spec`) is not a stage the
script reports: when both axes keep their defaults it leaves nothing on disk to read.

**`/sdd-prepare` is missing from that table on purpose — it is orthogonal to the stages,
and the report has to say so anyway.** It doesn't produce an artifact the script reads
as a stage; it leaves `.branch`, which `/sdd-plan` requires and `/sdd-build` re-checks. So
whenever `branch` is `null` and the story has a `spec.md`, name it alongside whatever
stage command applies:

> "Next: `/sdd-scan <id>` — and `/sdd-prepare <id>` at some point before `/sdd-plan`, which
> stops without the `.branch` marker."

Relaying only the stage command sends the user to a stop that `/sdd-status` could see
coming: the script already reports `branch`, and warns explicitly once `plan.md`
exists without it.

In `fast` there is no `/sdd-plan` for the marker to gate, so name `/sdd-prepare`
alongside the build instead: that skill is the only stage between the specification and
the build, and what reads `.branch` there is the branch gate of `/sdd-build`.

Three cases deserve a sentence of their own in the report rather than a bare command:

- **Pending markers.** `counts.clarificationMarkers > 0` holds `clarify` open even
  when later artifacts exist — `/sdd-design` won't proceed until they're resolved, and
  in a `standard` story (which has no design) the stage it holds back is `/sdd-plan`.
- **A reduced tier.** A `tier` other than `full` is why stages are missing: `standard`
  has no design, `fast` has no context, no design and no plan. State the tier before
  listing what the story lacks, so its shape is not read as unfinished work.
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

The 2 that **interrupt a run** — it stops, or the call goes back to the user.
Every other failure mode is in `references/common-issues.md`, with its cause and
resolution.

| Issue | Cause | Resolution |
|-------|-------|------------|
| `node` is not on PATH | The script can't run | Check the artifacts by hand (`[ -f ... ]`, `rg -c '\[X\]' plan.md` — or `## AC Coverage` in `spec.md` when the story is `fast` and has no plan) and say the report was manual — see `Degrades` |
| No story carries that id | Typo, or the id uses a legacy prefix | The script reads `STORY_ID_LEGACY_PREFIXES` too. List the active stories and ask which one — never create the folder |

---

## Example

A full worked run — a report and the next step it names — is in
`references/example.md`. Read it when the shape of the output is in doubt.

---

## Output language
**Conversational output** follows `~/.agents/references/chat-conventions.md` - the six blocks (announce, progress, question, summary, stop, handoff).

This skill writes no artifacts. **Chat interaction follows the user's language**
(`OUTPUT_LANGUAGE` in the profile) — the report samples above are written in English;
render them in the user's language when that differs.
