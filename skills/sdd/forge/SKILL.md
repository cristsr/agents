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

Read `.agents/profile.yaml` at the root of the current project before anything else.
If it doesn't exist, tell the user to run `/bootstrap` and stop — without a profile you
don't know this project's conventions. The file is a YAML map of named blocks; a key
holding `null` is not configured, so use the fallback this skill declares for it —
never a guessed value.

Tools come from the profile's `ports` block: this skill names the capability it
needs — a port — and the block says which command, agent or MCP tool provides it
here. Run the first adapter that resolves; when one resolves and then fails, report
that failure instead of trying the next. A port with no usable adapter is **unbound**
— see the `Degrades` row below.

Any path, branch name or command shown in this document is an example resolution; the
profile's value wins. The keys this skill reads are listed under **Profile keys** in
the `Contract` below.

---

## Contract

What this skill needs before chaining anything, what the chain leaves behind, and what
it may not do. Because the chain is autonomous — there is no review pause where the
user could correct course — **every `Requires` row is checked before generating
anything**, including the rows that belong to stages two and three. Dying on `/sync`'s
gate after `/build` already wrote code is exactly the failure this table prevents.

One artifact name resolves from the profile (docs block) and is used throughout this
document: `<api-artifact>` = `docs/api.delta.yaml` if `API_CONTRACT_MODE = delta` (the
default), otherwise `docs/api.yaml`.

**Requires** — the preflight; verified in this order, all of them, before Step 1

Read `spec.md`'s `build_mode` first (absent → `tdd`): the rows marked **(tdd only)**
are skipped in the evidence carril, which has no design artifacts by construction, and
the **(evidence only)** row replaces them.

| Condition | Check | If it fails |
|---|---|---|
| You are in the project's working directory | `pwd` == `WORKING_DIRECTORY` (absolute path, from the profile) | `cd` there before running anything |
| `spec.md` exists | `[ -f work/active/spec-<number>/spec.md ]` | Stop: "I couldn't find `work/active/spec-<number>/spec.md`. Run `/spec spec-<number>` first." |
| `context.md` exists | `[ -f work/active/spec-<number>/context.md ]` | Stop: "Run `/clarify spec-<number>` first." |
| `design.md` exists **(tdd only)** | `[ -f work/active/spec-<number>/design.md ]` | Stop: "Run `/design spec-<number>` first." |
| The API contract exists **(tdd only)** | `[ -f work/active/spec-<number>/docs/<api-artifact> ]` | Same stop as `design.md` — `/plan` reads it as the source of truth for every DTO task |
| The build mode holds up **(evidence only)** | `node ~/.agents/scripts/validate-artifacts.mjs spec-<number>` reports no `build_mode` issue, and the `VERIFY` port resolves | Abort with the validator's message — forge runs unattended, so a carril that doesn't hold up must never reach `/plan` |
| No unresolved ambiguity | `spec.md` has zero `[NEEDS CLARIFICATION]` markers | Stop: "Resolve the ambiguities with `/clarify spec-<number>` before forging." Building on ambiguities produces incorrect DTOs |
| No plan is already under execution | `plan.md` is absent, or present with **no** task marked `[X]` | Stop and hand over: a plan with `[X]` tasks is `/build spec-<number>` to resume, or `/hotfix spec-<number>` for a targeted fix — never a re-forge, which would regenerate the plan and discard its execution state |
| The working branch exists (prepare ran) | `[ -f work/active/spec-<number>/.branch ]` | Stop: "Run `/prepare spec-<number>` first — it creates and checks out the working branch that `/plan`'s Task 0 verifies and `/build` requires." |
| The working tree is usable | `git status --porcelain` — and `git branch --show-current` | See "the branch" below |

**The branch.** By forge time the working branch must already exist: `/prepare`
created it and checked it out (recording it in `.branch`), and `/plan`'s `Task 0`
only verifies it. So being on `BASE_BRANCH` at forge time means `/prepare` never ran —
forge stops and suggests it. It also stops if the tree is dirty (uncommitted work would
ride along). What forge *does* guarantee before handing over to `/build` is that the
plan opens with a `Task 0` verifying the working branch; if `/plan` produced a plan
without it, that is a Step 1 abort (see Step 1).

**Produces** — nothing of its own; each stage produces under its own Contract

- `work/active/spec-<number>/plan.md` with `Task 0` first and every task `[X]`, plus
  the `## AC Coverage` section with zero `✗` lines (from `/plan` and `/build`)
- the implemented code on the working branch, with the test suite green (from `/build`)
- the unit's living docs reconciled and the workspace moved to
  `work/done/spec-<number>/` (from `/sync`)
- a single consolidated report (Step 4) and the story sitting one manual step away
  from `/commit`

**Writes** — nothing. Forge is an orchestrator: every file on disk is written by
`/plan`, `/build` or `/sync` within their own `Writes` lists. Forge edits no artifact,
patches no code and fixes no failing stage by hand.

**Never**

- **Forbidden:** `git add`, `git commit`, `git push` and any other state-changing git
  command. The safety boundary is documentation: the chain stops at the edge of git so
  the user reviews before anything enters the branch.
- **Forbidden:** reimplementing a stage. If `/plan`, `/build` or `/sync` stops on its
  own gate, forge propagates the report as is and aborts — it never works around the
  gate, never continues to the next stage, and never masks the failure.
- **Forbidden:** skipping a stage. The chain is always the three, in order.

**Escalates** — the chain has no interaction point of its own. The branch name is
resolved once, by `/prepare`, before the chain starts.

- Every stop is an **abort**, not a question: a failed `Requires` row (including a
  missing `.branch`), a `/plan` that stopped on a gate, a red build, or a `/sync`
  clash. Forge reports and ends the run; it does not ask whether to continue anyway.

**Degrades** — none of its own. Each stage degrades per its own Contract
(`TESTS`, `API_CLIENT_EXPORT`, `CI_GATES`, `CONTRACT_DIFF`, `DIAGRAM_CHECK`
unbound); forge carries whatever note the stage emitted into the
Step 4 report instead of swallowing it.

**Profile keys**

- `STORY_ID_PATTERN`, `WORKDIR_ACTIVE`, `WORKDIR_DONE` — the story's id and its
  workspace before and after the close, written throughout this document as
  `spec-<number>`, `work/active/spec-<number>/` and `work/done/spec-<number>/`
- `WORKING_DIRECTORY`, `BASE_BRANCH` — the location and branch rows in `Requires`
- `API_CONTRACT_MODE` — which contract artifact the preflight looks for
- `DESIGN_OUTPUT_MODE` — what Step 3 reports `/sync` reconciled
- `PREP_SKILL` — the skill suggested when the base isn't fresh (`/prepare` by default)
- `ARTIFACT_LANGUAGE`, `OUTPUT_LANGUAGE`, `IDENTIFIER_LANGUAGE` — see "Output language"

---

## Step 1: Run /plan

Invoke the `plan` skill with `spec-<number>` and wait for it to finish. It must leave
`work/active/spec-<number>/plan.md`.

Verify it was produced, isn't empty, and opens with `Task 0`:

```bash
[ -s work/active/spec-<number>/plan.md ] && echo OK || echo "PLAN FAILED"
grep -c '^### Task 0' work/active/spec-<number>/plan.md
```

- If `/plan` stopped on its own (some gate unmet, including a missing `.branch`) or
  `plan.md` came out empty → **abort forge: do NOT run `/build`.** Report why `/plan`
  stopped and what to do to resolve it. Never build on a nonexistent or partial plan.
- If the count of `Task 0` is `0` → **abort**: "The plan has no `Task 0`, so nothing
  verifies the working branch `/prepare` created and `/build`'s branch gate stays
  open." Regenerate with `/plan spec-<number>`. This is the one structural check forge
  owns: Task 0 is what closes `/build`'s branch gate.

## Step 2: Run /build

With `plan.md` present and non-empty, invoke the `build` skill with `spec-<number>`.
`/build` executes **all** the plan's tasks autonomously and marks each one `[X]` on
completion.

- Don't interrupt between tasks — that's `/build`'s semantics.
- If the run is still on `BASE_BRANCH`, `/build`'s own branch gate lets it through
  precisely because `Task 0` is pending, and Task 0 is the first thing it executes.
  `/build` re-checks the branch right after Task 0 and stops there if it's still on
  the base — forge doesn't duplicate that check, it inherits it.
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
`API_CONTRACT_MODE = delta`, the flows are replaced if `DESIGN_OUTPUT_MODE = full-flow`,
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
| Dirty working tree at preflight | uncommitted work would ride into the new branch | STOP; commit or stash it, then forge |
| `plan.md` already has `[X]` tasks | the story was built (or partly built) before | Don't re-forge — `/build` resumes it, `/hotfix` fixes it |
| Empty `plan.md` after `/plan` | `/plan` stopped on a gate | Abort forge; resolve what `/plan` reported (e.g. `/clarify`) and retry |
| `plan.md` without `Task 0` | the plan was written or edited by hand | Abort; regenerate with `/plan` — nothing would create the working branch |
| `spec.md` with `[NEEDS CLARIFICATION]` | unresolved ambiguities | STOP; `/clarify spec-<number>` before forging |
| A test fails at the end | implementation defect | `/build` stops; forge **aborts before `/sync`**. Fix the code, or `/hotfix` if it's a spec gap |
| `/sync` reports a duplicate flow | the design gave a different name to an existing flow | forge stops after the build; fix the design with `/refine` and retry `/sync` |

## Examples

### Example 1: happy forge (full pipeline)

User says: "/forge spec-0006"

Actions:
1. Preflight: `spec.md`/`context.md`/`design.md` and the contract present; no
   `[NEEDS CLARIFICATION]` markers; no `plan.md` yet; `.branch` exists with
   `feat/SPEC-0006-forge-core` (created by `/prepare`) → on the working branch. OK.
2. Step 1: invokes the `plan` skill with spec-0006 → no questions (the branch name
   comes from `.branch`); generates `plan.md` with 12 tasks, `Task 0` first. Checks
   `[ -s plan.md ]` and `grep -c '^### Task 0'` → OK.
3. Step 2: invokes the `build` skill with spec-0006 → Task 0 verifies
   `feat/SPEC-0006-forge-core` is checked out (already, from `/prepare`), then the
   remaining 12 tasks run, all `[X]`, tests green. Doesn't stop at `/build`'s review;
   continues.
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

## Output language
**Conversational output** follows `~/.agents/references/chat-conventions.md` - the six blocks (announce, progress, question, summary, stop, handoff).

**Forge produces no artifacts of its own** — they come from `/plan`, `/build` and
`/sync`, each of which already resolves `ARTIFACT_LANGUAGE` (profile, language block).
Don't override it from here. Structural names those stages write (`Task N`,
`## AC Coverage`) stay English, as do paths and identifiers (`IDENTIFIER_LANGUAGE`).

**Chat interaction follows the user's language** (`OUTPUT_LANGUAGE` in the profile).
The consolidated report samples in this document are written in English; render them
in the user's language when that differs. Frontmatter, field names, paths and code are
always English.
