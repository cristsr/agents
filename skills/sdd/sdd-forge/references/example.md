# sdd-forge — worked example

What a real run looks like: the three stages chained without pauses.
Read it when the shape of the output is in doubt; the rules themselves are in
`SKILL.md`.

## Examples

### Example 1: happy forge (full pipeline)

User says: "/sdd-forge spec-0006"

Actions:
1. Preflight: `spec.md`/`context.md`/`design.md` and the contract present; no
   `[NEEDS CLARIFICATION]` markers; no `plan.md` yet; `.branch` exists with
   `feat/SPEC-0006-forge-core` (created by `/sdd-prepare`) → on the working branch. OK.
2. Step 1: invokes the `plan` skill with spec-0006 → no questions (the branch name
   comes from `.branch`); generates `plan.md` with 12 tasks, `Task 0` first. Checks
   `[ -s plan.md ]` and `grep -c '^### Task 0'` → OK.
3. Step 2: invokes the `build` skill with spec-0006 → Task 0 verifies
   `feat/SPEC-0006-forge-core` is checked out (already, from `/sdd-prepare`), then the
   remaining 12 tasks run, all `[X]`, tests green. Doesn't stop at `/sdd-build`'s review;
   continues.
4. Step 3: invokes the `sync` skill with spec-0006 (gates already green, doesn't re-run
   them) → merges `<api-artifact>` into the module's canonical file, reconciles the
   model and the flows, and archives the story in `work/done/spec-0006/`.
5. Step 4: reports 12/12 + green + docs reconciled, and suggests `/commit spec-0006`.

### Example 2: aborts before build

User says: "/sdd-forge spec-0009"

Actions:
1. Preflight: `design.md` missing → **STOP**. "I couldn't find
   `work/active/spec-0009/design.md`. Run `/design spec-0009` first." It runs neither
   `/sdd-plan`, `/sdd-build` nor `/sdd-sync`.

### Example 3: red build → docs not reconciled

User says: "/sdd-forge spec-0007"

Actions:
1. Preflight OK. Step 1: plan with 9 tasks.
2. Step 2: `/sdd-build` fails on task 6 (a test that won't pass, unrecoverably).
   forge **aborts before `/sdd-sync`**: it reports the failing task; it doesn't reconcile
   docs or archive the story. The user fixes it (or `/sdd-hotfix`) and retries.

### Example 4: a `fast` story — the chain is two stages, not three

User says: "/sdd-forge spec-0011"

Actions:
1. Preflight: `spec.md` carries `tier: fast` (absent would mean `full`), so the rows for
   `context.md`, `design.md` and the API contract are skipped, and `plan.md` must be
   **absent** rather than merely unexecuted. No `[NEEDS CLARIFICATION]` markers — a fast
   story cannot carry one. `## Change Surface` is present with its `Confined to:` paths
   and its `Check:` command. `.branch` exists → on the working branch. OK.
2. Step 1 is **skipped entirely**: `/sdd-plan` is not invoked, so there is no plan to
   verify and no `Task 0` to look for. The scope contract it would have carried is the
   `## Change Surface` the spec already holds.
3. Step 2: invokes the `build` skill, which reads the single criterion, keeps the change
   inside the declared surface, runs the check named in `**Check:**`, runs the pre-close
   suite, and appends `## AC Coverage` to `spec.md` — the tier's close.
4. Step 3: invokes the `sync` skill. The gates it reads are the same two claims, from
   `spec.md` instead of a plan; there is no design delta to reconcile, so Steps 3 and 4
   there are skipped silently and the story is archived whole.
5. Step 4: reports the criterion closed with the command that closed it, and suggests
   `/commit spec-0011`.

> A `plan.md` in this story would have stopped the run at preflight: no stage of the
> `fast` tier reads one, so the file is either a leftover or the tier is wrong — and
> forge never corrects the tier, because the flow it is running is the developer's
> decision, not the orchestrator's.
