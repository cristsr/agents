---
name: forge
description: >
  Runs a story's implementation pipeline end to end: /plan, /build, then /sync in
  sequence, autonomously, without stopping between them — one command instead of
  three. Leaves built code with green tests and the module docs reconciled, ready
  to commit. Use when the user says "/forge spec-XXXX", "forge the story",
  "plan and build", "plan build and sync in one go", "run the whole pipeline at
  once", or wants to go from an approved design straight to built-and-documented
  in one shot. Do NOT use before /design is complete and approved (there is no plan
  input yet). Do NOT use to only plan (use /plan) or only build (use /build). Forge
  never runs git — it stops at /commit, so commits and the PR stay manual.
---

# forge

## Overview

Chains a story's implementation pipeline: `/plan` → `/build` → `/sync`, straight
through and **without pausing** between stages. It's a thin orchestrator — it
reimplements nothing: it invokes the `plan`, `build` and `sync` skills in order and
consolidates the final report. Human review lands **at the end**, over already-built
code and already-reconciled documentation — right before `/commit`.

**Safety boundary:** forge goes as far as the documentation (docs-only). **It doesn't
touch git**: commits and the PR belong to `/commit`, which remains a manual step.
That's the checkpoint where the user reviews before anything enters the branch.

**Announce at start:** "Forging spec-<number>: /plan → /build → /sync without pauses."

**Output:**
- `work/active/spec-<number>/plan.md` (produced by `/plan`).
- The implemented code with its tests green (produced by `/build`).
- Module docs reconciled and the story archived in `work/done/spec-<number>/`
  (produced by `/sync`).

**Core principle:** a single invocation replaces three. The gates belonging to
`/plan`, `/build` and `/sync` are respected; forge only chains them, **fails early**
if an input is missing, and **stops at the edge of git** (it never commits or pushes).

---

## Project profile (read first, always)

Before anything else, read `.agents/profile.md` (root of the current project): it
defines the story ID pattern, the artifact paths, the base branch and the output
language. If it doesn't exist, tell the user to create it from the template and stop.

**CRITICAL — Working directory:** before running anything, verify you are in the project's working directory (`WORKING_DIRECTORY` from the profile — absolute path). If `pwd` doesn't match `WORKING_DIRECTORY`, `cd` there before continuing.

**The literals in this document are only an example resolution.** The real values come
from the project's `profile.md` — if they differ, the profile wins:

| In this document | Key in profile.md |
|---|---|
| `spec-<number>` | `STORY_ID_PATTERN` |
| `work/active/spec-<number>/` | `WORKDIR_ACTIVE` |
| `develop` | `BASE_BRANCH` |
| interaction language | `OUTPUT_LANGUAGE` |

---

## CRITICAL: Preflight — verify EVERYTHING before starting

Because the chain is autonomous (there's no pause where the user could correct
course), validate the inputs of **every stage** BEFORE generating anything — so you
don't produce a `plan.md` only to then die on a `/build` or `/sync` gate.

Extract the story number. `<api-artifact>` = `docs/api.delta.yaml` if
`API_CONTRACT_MODE = delta` (default), otherwise `docs/api.yaml`. Verify, in order:

1. **`/plan` inputs** (approved design artifacts):

   ```bash
   [ -f work/active/spec-<number>/spec.md ]      || echo "MISSING: spec.md"
   [ -f work/active/spec-<number>/context.md ] || echo "MISSING: context.md"
   [ -f work/active/spec-<number>/design.md ]  || echo "MISSING: design.md"
   [ -f work/active/spec-<number>/docs/<api-artifact> ] || echo "MISSING: docs/<api-artifact>"
   ```

   If any is missing → **STOP** with the instruction of what to run first
   (`/spec`, `/clarify` or `/design`, depending on which is missing). Don't continue.

2. **`/build`'s branch guard** (the profile's base branch):

   ```bash
   git branch --show-current
   ```

   If the result is `main`, `master` or `BASE_BRANCH` (`develop`) → **STOP**:
   "You're on the base branch. Switch to the working branch before forging."
   If the working branch is behind the remote or the base isn't fresh →
   suggest `/prepare spec-<number>` first (a fresh base is a build prerequisite).

3. **Ambiguity:** if `spec.md` has unresolved `[NEEDS CLARIFICATION]` markers →
   **STOP**: "Resolve the ambiguities with `/clarify spec-<number>` before forging."
   (Building on ambiguities produces incorrect DTOs.)

Only if all three checks pass, continue to Step 1.

---

## Step 1: Run /plan

Invoke the `plan` skill with `spec-<number>` and wait for it to finish. It must leave
`work/active/spec-<number>/plan.md`.

Verify it was produced and isn't empty:

```bash
[ -s work/active/spec-<number>/plan.md ] && echo OK || echo "PLAN FAILED"
```

- If `/plan` stopped on its own (some gate unmet) or `plan.md` came out empty →
  **abort forge: do NOT run `/build`.** Report why `/plan` stopped and what to do to
  resolve it. Never build on a nonexistent or partial plan.

## Step 2: Run /build

With `plan.md` present and non-empty, invoke the `build` skill with `spec-<number>`.
`/build` executes **all** the plan's tasks autonomously and marks each one `[X]` on
completion.

- Don't interrupt between tasks — that's `/build`'s semantics.
- **Within the chain, don't stop at the review pause `/build` normally closes with.**
  If `/build` finished every task with the tests **green**, continue straight to
  Step 3 (`/sync`). Human review comes at the end of the pipeline, before `/commit`,
  not between build and sync.
- If a task fails unrecoverably, `/build` stops and reports; forge **aborts before
  `/sync`** and propagates that report as is, without masking it. Documentation is
  never reconciled on top of a broken build.

## Step 3: Run /sync

With the build green, invoke the `sync` skill with `spec-<number>`. `/sync` reconciles
the design delta per the profile's modes: the contract is merged if
`API_CONTRACT_MODE = delta`, the model is reconciled if `DESIGN_OUTPUT_MODE = delta`,
Markdown diagrams are copied if `full`; it stacks decisions, and archives the story
under `work/done/`.

- `/build` already ran the tests green: tell `/sync` the gates already passed so it
  **doesn't ask for them again** (its Step 2 asks before re-running lint/test/build;
  in the chain it's skipped because they just passed).
- `/sync` is **docs-only**: it doesn't touch git. If `/sync` stops on its own gate
  (e.g. something doesn't reconcile, or it detects a duplicate flow), forge propagates
  the report and **stops here** — it doesn't force the close.

## Step 4: End-to-end report

When it finishes, consolidate into a single summary:

1. **Plan:** how many tasks `/plan` generated.
2. **Build:** how many ended up `[X]` and the test result (green/red).
3. **Sync:** what was reconciled (contract/`<api-artifact>` · model · diagrams, per the
   profile's modes) and that the story was archived in `work/done/spec-<number>/`.
4. **Final state** of the story.
5. **Next step — the edge of git (manual):** "All forged and documented. Review the
   changes; once they're OK, `/commit spec-<number>` groups the commits and leaves the
   PR drafted."

Stop — forge doesn't touch git. Grouping/executing commits and drafting the PR belong
to `/commit`.

---

## Common Issues

| Issue | Cause | Resolution |
|---|---|---|
| `design.md` missing at preflight | `/design` never ran or wasn't approved | STOP; run `/design spec-<number>` first |
| Base branch | you're on `develop`/`main`/`master` | Switch to the working branch before forging |
| Empty `plan.md` after `/plan` | `/plan` stopped on a gate | Abort forge; resolve what `/plan` reported (e.g. `/clarify`) and retry |
| `spec.md` with `[NEEDS CLARIFICATION]` | unresolved ambiguities | STOP; `/clarify spec-<number>` before forging |
| A test fails at the end | implementation defect | `/build` stops; forge **aborts before `/sync`**. Fix the code, or `/hotfix` if it's a spec gap |
| `/sync` reports a duplicate flow | the design gave a different name to an existing flow | forge stops after the build; fix the design with `/refine` and retry `/sync` |

## Examples

### Example 1: happy forge (full pipeline)

User says: "/forge spec-0006"

Actions:
1. Preflight: `spec.md`/`context.md`/`design.md` present; branch `feat/core` (not the
   base); no `[NEEDS CLARIFICATION]` markers. OK.
2. Step 1: invokes the `plan` skill with spec-0006 → generates `plan.md` with 12 tasks.
   Check `[ -s plan.md ]` → OK.
3. Step 2: invokes the `build` skill with spec-0006 → executes the 12 tasks, all `[X]`,
   tests green. Doesn't stop at `/build`'s review; continues.
4. Step 3: invokes the `sync` skill with spec-0006 (gates already green, doesn't re-run
   them) → merges `<api-artifact>` into the module's canonical file, reconciles the
   model and the flows, and archives the story in `work/done/spec-0006/`.
5. Step 4: reports 12/12 + green + docs reconciled, and suggests `/commit spec-0006`.

### Example 2: aborts before build

User says: "/forge spec-0009"

Actions:
1. Preflight: `design.md` missing → **STOP**. "I couldn't find
   `work/active/spec-0009/design.md`. Run `/design spec-0009` first." It runs neither
   `/plan`, `/build` nor `/sync`.

### Example 3: red build → docs not reconciled

User says: "/forge spec-0007"

Actions:
1. Preflight OK. Step 1: plan with 9 tasks.
2. Step 2: `/build` fails on task 6 (a test that won't pass, unrecoverably).
   forge **aborts before `/sync`**: it reports the failing task; it doesn't reconcile
   docs or archive the story. The user fixes it (or `/hotfix`) and retries.

---

## CRITICAL: Output Language

**Forge produces no artifacts of its own** — they come from `/plan`, `/build` and
`/sync`, each of which already resolves `ARTIFACT_LANGUAGE` (profile, section 5).
Don't override it from here.

**Chat interaction follows the user's language** (`OUTPUT_LANGUAGE` in the profile).
The consolidated report samples in this document are written in English; render them
in the user's language when that differs. Frontmatter, field names, paths and code are
always English.
