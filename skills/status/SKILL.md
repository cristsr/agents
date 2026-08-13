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

Read `.agents/profile.md` at the root of the current project before anything else. If it
doesn't exist, tell the user to copy `~/.agents/sdd-profile.template.md` to
`.agents/profile.md` and stop — without a profile you don't know this project's
conventions.

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
| A story id matching `STORY_ID_PATTERN` (or `STORY_ID_LEGACY_PREFIXES`), or no argument at all | With no argument, list every story under `WORKDIR_ACTIVE` — that's a valid invocation, not an error (Step 1) |
| The story's folder exists under `WORKDIR_ACTIVE` or `WORKDIR_DONE` | Report that no story carries that id, list the active ones, and stop. Don't create the folder |

**Produces** — a stage report in the chat: one line per artifact, plus one "Next step"
line naming the exact command to run. Nothing is handed to another skill — the user
runs the command the report names.

**Writes** — nothing. This skill creates, edits, moves and deletes no file, in the
story's workspace or anywhere else.

**Never**

- **Allowed:** existence checks (`ls`, `[ -f ]`, `[ -d ]`), reading the story's
  artifacts, counting markers inside them (`rg -c`).
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

## Step 1: Resolve the story

- With `spec-XXXX` → work on that story.
- Without a story → list ALL the active ones (the path resolves from `WORKDIR_ACTIVE`):

```bash
ls -d work/active/*/ 2>/dev/null
```

and show one line per story with its stage (Step 2 applied to each, without detail).

## Step 2: Build the stage report

For one story, check in order (paths resolve from `WORKDIR_ACTIVE`):

```bash
id="<story-id>"
# spec.md is the entry artifact; hu.md is its legacy name (items predating
# the rename). Either one counts as present.
{ [ -f "work/active/$id/spec.md" ] || [ -f "work/active/$id/hu.md" ]; } \
  && echo "spec.md: YES" || echo "spec.md: no"
for f in context.md design.md plan.md; do
  [ -f "work/active/$id/$f" ] && echo "$f:  YES" || echo "$f:  no"
done
[ -d "work/active/$id/docs" ] && echo "docs/: YES" || echo "docs/: no"
```

> **Legacy items.** Those closed before the rename use `hu.md` and an old ID prefix
> (`STORY_ID_LEGACY_PREFIXES` in the profile). They're read normally — never renamed,
> never reported as incomplete.

Possible stages:

| Last stage | Has | Missing / next step |
|---|---|---|
| `inbox` | nothing | `/spec <id>` |
| `spec` | spec.md | `/clarify` |
| `context` | + context.md | `/design` |
| `design` | + design.md (+ docs/) | `/plan` (after the design is approved) |
| `plan` | + plan.md | `/build` |
| `build` | plan.md with `[X]` tasks | count the `[X]`s: `rg -c '\[X\]' work/active/$id/plan.md` — if not all are done, `/build` resumes; if all are, `/sync` |
| `done` | folder under `WORKDIR_DONE` | `/commit` |

If there are `[NEEDS CLARIFICATION]` markers in spec.md, flag it: `/design` won't
proceed until they're resolved.

If the folder exists under `WORKDIR_DONE` (`work/done/spec-<number>/`), the story's
documentation is closed → report it and suggest `/commit`.

## Step 3: Report and stop

Concise format, one line per artifact + one "Next step" line. Don't execute anything
else — the skill is read-only. Suggest the exact command for the next step
(e.g. "Run `/build spec-0009` — it resumes from task 4 of 7."), and stop there: this
skill reports the command, the user decides whether to run it.

---

## Output language

This skill writes no artifacts. **Chat interaction follows the user's language**
(`OUTPUT_LANGUAGE` in the profile) — the report samples above are written in English;
render them in the user's language when that differs.
