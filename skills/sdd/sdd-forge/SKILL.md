---
name: sdd-forge
description: >
  Runs a story's implementation pipeline end to end: /sdd-plan, /sdd-build, then /sdd-sync in
  sequence, autonomously, without stopping between them — one command instead of
  three. Leaves built code with green tests and the module docs reconciled, ready
  to commit. Use when the user says "/sdd-forge spec-XXXX", "forge the story",
  "plan and build", "plan build and sync in one go", "run the whole pipeline at
  once", or wants to go from an approved design straight to built-and-documented
  in one shot. Do NOT use before /sdd-design is complete and approved (there is no plan
  input yet). Do NOT use to only plan (use /sdd-plan) or only build (use /sdd-build). Forge
  never runs git — it stops at /sdd-commit, so commits and the PR stay manual.
---

# forge

## Overview

Chains a story's implementation pipeline straight through and **without pausing**
between stages. It's a thin orchestrator — it reimplements nothing: it invokes the
`plan`, `build` and `sync` skills and consolidates the final report.

The story's **tier** — `spec.md` front matter, absent → `full` — decides which of those
stages exist, and forge runs exactly those, in order. `full` and `standard` run the
three: `/sdd-plan` → `/sdd-build` → `/sdd-sync`. `fast` runs the two: `/sdd-build` →
`/sdd-sync`, because that tier writes no `plan.md` and closes in `spec.md`.

Human review lands **at the end**, over already-built code and already-reconciled
documentation — right before `/sdd-commit`.

**Safety boundary:** forge goes as far as the documentation (docs-only). **It doesn't
touch git**: commits and the PR belong to `/sdd-commit`, which remains a manual step.
That's the checkpoint where the user reviews before anything enters the branch.

**Announce at start:** "Forging spec-<number>: /sdd-plan → /sdd-build → /sdd-sync without pauses." — in a `fast` story, announce the two stages it actually runs: "/sdd-build → /sdd-sync without pauses."

**Output:**
- `work/active/spec-<number>/plan.md` (produced by `/sdd-plan`) — in `full` and `standard`;
  a `fast` story has no plan.
- The implemented code with its tests green (produced by `/sdd-build`).
- Module docs reconciled and the story archived in `work/done/spec-<number>/`
  (produced by `/sdd-sync`).

**Core principle:** a single invocation replaces the stages the tier declares. The gates
belonging to `/sdd-plan`, `/sdd-build` and `/sdd-sync` are respected; forge only chains
them, **fails early** if an input is missing, and **stops at the edge of git** (it never
commits or pushes).

---

## Project profile (read first, always)

Read `.agents/profile.yaml` from the project root before anything else, as
`~/.agents/references/project-profile.md` describes: what a missing file means, how a
`null` key falls back, how a port resolves to an adapter, and why every path or command
shown here is only an example the profile overrides. The keys this skill reads are
listed under **Profile keys** in the `Contract` below.

---

## Contract

What this skill needs before chaining anything, what the chain leaves behind, and what
it may not do. Because the chain is autonomous — there is no review pause where the
user could correct course — **every `Requires` row is checked before generating
anything**, including the rows that belong to stages two and three. Dying on `/sdd-sync`'s
gate after `/sdd-build` already wrote code is exactly the failure this table prevents.

One artifact name resolves from the profile (docs block) and is used throughout this
document: `<api-artifact>` = `docs/api.delta.yaml` if `API_CONTRACT_MODE = delta` (the
default), otherwise `docs/api.yaml`.

**Requires** — the preflight; verified in this order, all of them, before Step 1

Read `spec.md`'s `tier` **first** (absent → `full`): the tier decides which stages exist
at all, so it is what makes a preflight row apply. Then read `build_mode` (absent →
`tdd`): the rows marked **(tdd only)** are skipped in the evidence carril, which has no
design artifacts by construction, and the `VERIFY` check in the row below replaces them.

| Condition | Check | If it fails |
|---|---|---|
| You are in the project's working directory | `pwd` == `WORKING_DIRECTORY` (absolute path, from the profile) | `cd` there before running anything |
| `spec.md` exists | `[ -f work/active/spec-<number>/spec.md ]` | Stop: "I couldn't find `work/active/spec-<number>/spec.md`. Run `/spec spec-<number>` first." |
| `context.md` exists **(not `fast`)** | `[ -f work/active/spec-<number>/context.md ]` | Stop: "Run `/clarify spec-<number>` first." A `fast` story runs no clarification pass, so this row does not apply to it |
| `design.md` exists **(`full` + tdd only)** | `[ -f work/active/spec-<number>/design.md ]` | Stop: "Run `/design spec-<number>` first." Only `full` writes a design: `standard` and `fast` have none to require |
| The API contract exists **(`full` + tdd only)** | `[ -f work/active/spec-<number>/docs/<api-artifact> ]` | Same stop as `design.md` — `/sdd-plan` reads it as the source of truth for every DTO task |
| The build mode and the tier hold up | `node ~/.agents/scripts/validate-artifacts.mjs spec-<number>` reports no `build_mode` issue and no `tier` issue, and (for an `evidence` story) the `VERIFY` port resolves | Abort with the validator's message — forge runs unattended, so a carril or a tier that doesn't hold up must never reach `/sdd-plan` |
| No unresolved ambiguity | `spec.md` has zero `[NEEDS CLARIFICATION]` markers | Stop: "Resolve the ambiguities with `/clarify spec-<number>` before forging." Building on ambiguities produces incorrect DTOs |
| No plan is already under execution | `full` and `standard`: `plan.md` is absent, or present with **no** task marked `[X]`. `fast`: `plan.md` is **absent** | Stop and hand over: a plan with `[X]` tasks is `/build spec-<number>` to resume, or `/hotfix spec-<number>` for a targeted fix — never a re-forge, which would regenerate the plan and discard its execution state. In `fast` there is no plan to read: a file is a leftover no stage of that tier reads, or the tier is wrong |
| The working branch exists (prepare ran) | `[ -f work/active/spec-<number>/.branch ]` | Stop: "Run `/prepare spec-<number>` first — it creates and checks out the working branch that `/sdd-plan`'s Task 0 verifies (in `full` and `standard`) and `/sdd-build` requires." |
| The working tree is usable | `git status --porcelain` — and `git branch --show-current` | See "the branch" below |

**The branch.** By forge time the working branch must already exist: `/sdd-prepare`
created it and checked it out (recording it in `.branch`). So being on `BASE_BRANCH` at
forge time means `/sdd-prepare` never ran — forge stops and suggests it. It also stops
if the tree is dirty (uncommitted work would ride along).

In `full` and `standard` the guarantee forge hands to `/sdd-build` is the plan's opening
`Task 0`, which verifies the working branch; if `/sdd-plan` produced a plan without it,
that is a Step 1 abort (see Step 1). In `fast` the branch is guaranteed by `/sdd-prepare`
and checked by `/sdd-build`'s own preconditions — there is no `Task 0` to carry it, and
none is missing.

**Produces** — nothing of its own; each stage produces under its own Contract

- `work/active/spec-<number>/plan.md` with `Task 0` first and every task `[X]`, plus
  the `## AC Coverage` section with zero `✗` lines (from `/sdd-plan` and `/sdd-build`)
  — in `full` and `standard`. In `fast` the close travels in the artifact the tier kept:
  `spec.md`'s `## AC Coverage`, one line per AC and no `✗`, appended by `/sdd-build`,
  which is read before the workspace is archived
- the implemented code on the working branch, with the test suite green (from `/sdd-build`)
- the unit's living docs reconciled and the workspace moved to
  `work/done/spec-<number>/` (from `/sdd-sync`)
- a single consolidated report (Step 4) and the story sitting one manual step away
  from `/sdd-commit`

**Writes** — nothing. Forge is an orchestrator: every file on disk is written by
`/sdd-plan`, `/sdd-build` or `/sdd-sync` within their own `Writes` lists. Forge edits no artifact,
patches no code and fixes no failing stage by hand.

**Never**

- **Forbidden:** `git add`, `git commit`, `git push` and any other state-changing git
  command. The safety boundary is documentation: the chain stops at the edge of git so
  the user reviews before anything enters the branch.
- **Forbidden:** reimplementing a stage. If `/sdd-plan`, `/sdd-build` or `/sdd-sync` stops on its
  own gate, forge propagates the report as is and aborts — it never works around the
  gate, never continues to the next stage, and never masks the failure.
- **Forbidden:** adding, skipping or reordering a stage **relative to what the tier
  declares**. Forge runs the chain the story declares — three stages for `full` and
  `standard` (`/sdd-plan` → `/sdd-build` → `/sdd-sync`), two for `fast` (`/sdd-build` →
  `/sdd-sync`) — and it runs it in that order. It never drops a declared stage because the
  story looks small, never inserts one the tier omits, and never reorders them: `/sdd-sync`
  closes a build, and a build with no plan behind it is still a build. An unattended run
  does not improvise its flow.
- **Forbidden:** changing the tier. The tier is the story's decision, and `/sdd-route`
  is the only skill that writes it — raising on evidence, lowering on the developer's
  answer. Forge may do neither —
  a chain that rewrote its own flow mid-run would invalidate every preflight row above it.

**Escalates** — the chain has no interaction point of its own. The branch name is
resolved once, by `/sdd-prepare`, before the chain starts.

- Every stop is an **abort**, not a question: a failed `Requires` row (including a
  missing `.branch`), a `/sdd-plan` that stopped on a gate, a red build, or a `/sdd-sync`
  clash. Forge reports and ends the run; it does not ask whether to continue anyway. A
  tier that no longer matches the chain — a `plan.md` sitting in a `fast` story, a
  `design.md` in a `standard` one — is that same class of abort: forge hands the decision
  back, it does not resolve it.

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
- `DOC_UNIT` — what Step 3 reports `/sdd-sync` reconciled
- `PREP_SKILL` — the skill suggested when the base isn't fresh (`/sdd-prepare` by default)
- `VERIFY` (port) — the preflight row for an `evidence` story checks that it resolves
  before `/sdd-plan` is invoked. The other ports named under `Degrades` belong to the
  stages, not to forge: it relays their notes, it never calls them
- `ARTIFACT_LANGUAGE`, `OUTPUT_LANGUAGE`, `IDENTIFIER_LANGUAGE` — see "Output language"

---

## Step 1: Run /sdd-plan

**Skipped entirely in `fast`.** That tier writes no `plan.md`, so there is nothing for
this step to produce and no post-condition below to check: `/sdd-build` reads `spec.md`'s
`## Change Surface` for its scope and the single criterion for its work. What forge owes
the close there is the gate, not the artifact — a valid `## AC Coverage` in `spec.md` by
the end of the run (see Step 3 and Step 4). Go straight to Step 2.

In `full` and `standard`, invoke the `plan` skill with `spec-<number>` and wait for it to
finish. It must leave `work/active/spec-<number>/plan.md`.

Verify it was produced, isn't empty, and opens with `Task 0`: **both post-conditions hold
only when this step ran** — they describe a plan, and only these two tiers have one.

```bash
[ -s work/active/spec-<number>/plan.md ] && echo OK || echo "PLAN FAILED"
grep -c '^### Task 0' work/active/spec-<number>/plan.md
```

- If `/sdd-plan` stopped on its own (some gate unmet, including a missing `.branch`) or
  `plan.md` came out empty → **abort forge: do NOT run `/sdd-build`.** Report why `/sdd-plan`
  stopped and what to do to resolve it. Never build on a nonexistent or partial plan.
- If the count of `Task 0` is `0` → **abort**: "The plan has no `Task 0`, so nothing
  verifies the working branch `/sdd-prepare` created and `/sdd-build`'s branch gate stays
  open." Regenerate with `/plan spec-<number>`. This is the one structural check forge
  owns: Task 0 is what closes `/sdd-build`'s branch gate.

## Step 2: Run /sdd-build

Invoke the `build` skill with `spec-<number>`. In `full` and `standard`, with `plan.md`
present and non-empty, `/sdd-build` executes **all** the plan's tasks autonomously and
marks each one `[X]` on completion. In `fast` there is no plan: it executes the single
criterion `spec.md` declares and appends `## AC Coverage` to `spec.md` — the section that
closes the story.

- Don't interrupt between tasks — that's `/sdd-build`'s semantics. In `fast` the same
  applies to the one criterion: forge doesn't split it into stages the tier doesn't have.
- The branch gate is `/sdd-build`'s own in every tier, and forge inherits it instead of
  duplicating it. In `full` and `standard` Task 0 verifies the working branch and is the
  first thing it executes; in `fast` the preconditions it checks at Step 0 are the only
  branch gate there is, and they already see a branch `/sdd-prepare` created.
- **Within the chain, don't stop at the review pause `/sdd-build` normally closes with.**
  If `/sdd-build` finished every task with the tests **green**, continue straight to
  Step 3 (`/sdd-sync`). Human review comes at the end of the pipeline, before `/sdd-commit`,
  not between build and sync.
- If a `/sdd-build` run fails unrecoverably, it stops and reports; forge **aborts before
  `/sdd-sync`** and propagates that report as is, without masking it. The story is never
  closed on top of a broken build.

## Step 3: Run /sdd-sync

With the build green, invoke the `sync` skill with `spec-<number>`. `/sdd-sync` reconciles
the design delta per the profile's modes: the contract is merged if
`API_CONTRACT_MODE = delta`, the flows are replaced if `DOC_UNIT = use-case`,
Markdown diagrams are copied if `full`; it stacks decisions, and archives the story
under `work/done/`.

In a tier that produced no design — `standard` and `fast` — there is no delta to
reconcile and none of that runs: sync stacks no decisions from a `design.md` that does
not exist, promotes nothing, and goes to the archive. Only `full` hands it documentation.
What sync owes every tier is the close itself: the `## AC Coverage` gate — in `plan.md`
for `full` and `standard`, in `spec.md` for `fast` — and the archive.

- `/sdd-build` already ran the tests green: tell `/sdd-sync` the gates already passed so it
  **doesn't ask for them again** (its Step 2 asks before re-running lint/test/build;
  in the chain it's skipped because they just passed).
- `/sdd-sync` is **docs-only**: it doesn't touch git. If `/sdd-sync` stops on its own gate
  (e.g. something doesn't reconcile, or it detects a duplicate flow), forge propagates
  the report and **stops here** — it doesn't force the close.

## Step 4: End-to-end report

When it finishes, consolidate into a single summary:

1. **Plan:** how many tasks `/sdd-plan` generated — in `full` and `standard`. In `fast`
   the stage did not run: report the tier and the criterion's `## Change Surface` instead
   (what the change was confined to, and the check that proves it), never a task count
   there is no plan to back.
2. **Build:** how many ended up `[X]` and the test result (green/red) — in `fast`, that
   the single criterion is closed and which check proved it.
3. **Sync:** what was reconciled (contract/`<api-artifact>` · model · diagrams, per the
   profile's modes — or "no design artifacts in this tier") and that the story was
   archived in `work/done/spec-<number>/`.
4. **Final state** of the story.
5. **The close**, naming the artifact it lives in: `plan.md`'s `## AC Coverage` for `full`
   and `standard`, `spec.md`'s for `fast`.
6. **Next step — the edge of git (manual):** "All forged and documented. Review the
   changes; once they're OK, `/commit spec-<number>` groups the commits and leaves the
   PR drafted."

Stop — forge doesn't touch git. Grouping/executing commits and drafting the PR belong
to `/sdd-commit`.

---

## Common Issues

The 7 that **interrupt a run** — it stops, or the call goes back to the user.
Every other failure mode is in `references/common-issues.md`, with its cause and
resolution.

| Issue | Cause | Resolution |
|---|---|---|
| `design.md` missing at preflight | `/sdd-design` never ran or wasn't approved in a `full` story | STOP; run `/design spec-<number>` first |
| Dirty working tree at preflight | uncommitted work would ride into the new branch | STOP; commit or stash it, then forge |
| `plan.md` already has `[X]` tasks | the story was built (or partly built) before | Don't re-forge — `/sdd-build` resumes it, `/sdd-hotfix` fixes it |
| A `fast` story carries a `plan.md` | the flow declares no plan for that tier, so the file is either a leftover from an earlier stage or the tier is wrong | STOP; don't build against it. The close belongs to `## AC Coverage` in `spec.md`: either drop the file, or — if the change really needs a plan — the story is not `fast`. Forge doesn't touch the tier: `/sdd-refine` on `spec.md` raises it — and the passes that tier declares then run, `/sdd-clarify` for `standard` and `/sdd-design` for `full` — while the developer decides any other change |
| Empty `plan.md` after `/sdd-plan` | `/sdd-plan` stopped on a gate | Abort forge; resolve what `/sdd-plan` reported (e.g. `/sdd-clarify`) and retry |
| `plan.md` without `Task 0` | the plan was written or edited by hand | Abort; regenerate with `/sdd-plan` — nothing would create the working branch |
| `spec.md` with `[NEEDS CLARIFICATION]` | unresolved ambiguities | STOP; `/clarify spec-<number>` before forging |

---

## Example

A worked run of the whole chain — the stages chained without pauses — is in
`references/example.md`. Read it when the shape of the output is in doubt.

---

## Output language
**Conversational output** follows `~/.agents/references/chat-conventions.md` - the six blocks (announce, progress, question, summary, stop, handoff).

**Forge produces no artifacts of its own** — they come from `/sdd-plan`, `/sdd-build` and
`/sdd-sync`, each of which already resolves `ARTIFACT_LANGUAGE` (profile, language block).
Don't override it from here. Structural names those stages write (`Task N`,
`## AC Coverage`) stay English; paths, identifiers and the code `/sdd-build` writes
follow `IDENTIFIER_LANGUAGE` (profile, language block), resolved by each stage —
don't override that from here either.
