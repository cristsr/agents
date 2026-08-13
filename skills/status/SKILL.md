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

Before anything else, read `.agents/profile.md` (at the root of the current project):
it defines the story ID pattern and the artifact paths. If it doesn't exist, tell the
user to create it from the template and stop.

**CRITICAL — Working directory:** before running anything, verify you are in the project's working directory (`WORKING_DIRECTORY` from the profile — absolute path). If `pwd` doesn't match `WORKING_DIRECTORY`, `cd` there before continuing.

---

## Step 1: Resolve the story

- With `spec-XXXX` → work on that story.
- Without a story → list ALL the active ones:

```bash
ls -d work/active/*/ 2>/dev/null
```

and show one line per story with its stage (Step 2 applied to each, without detail).

## Step 2: Build the stage report

For one story, check in order:

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
| `done` | folder under `work/done/` | `/commit` |

If there are `[NEEDS CLARIFICATION]` markers in spec.md, flag it: `/design` won't
proceed until they're resolved.

If `work/done/<id>/` exists, the story is closed → report it and suggest `/commit`.

## Step 3: Report and stop

Concise format, one line per artifact + one "Next step" line. Don't execute anything
else — the skill is read-only. Suggest the exact command for the next step
(e.g. "Run `/build spec-0009` — it resumes from task 4 of 7.").

---

## CRITICAL: Output Language

This skill writes no artifacts. **Chat interaction follows the user's language**
(`OUTPUT_LANGUAGE` in the profile) — the report samples above are written in English;
render them in the user's language when that differs.
