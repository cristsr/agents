---
name: sdd-plan
description: >
  Generates a detailed implementation plan — TDD by default, or evidence-driven when
  spec.md declares build_mode: evidence — from the approved artifacts
  (spec.md, context.md, and design.md when the carril requires it) and saves it to
  work/active/spec-{number}/plan.md.
  Use when the user says "/sdd-plan spec-XXXX", "generate the plan", "create the
  implementation plan", "plan the story", or has completed /sdd-design and wants TDD tasks.
  Do NOT use before /sdd-design is complete and approved — except in the evidence carril,
  which has no design stage.
  Do NOT use for executing tasks (use /sdd-build).
---

# plan

## Overview

Read the approved artifacts, determine the implementation order, and produce a
complete plan organized by <component> — TDD tasks ordered by the sequence diagram in
the default carril, evidence tasks ordered by deliverable dependencies in the other.

**The skill runs in the main agent, start to finish** — it checks the preconditions,
loads the design artifacts and the project's best-practice skills, writes `plan.md`,
and verifies it against the artifact validator.

> **Why not a drafting subagent:** planning is one sequential actor's job, and this
> document is its instructions. A subagent would have to re-read this file cold on top
> of the same artifacts you already hold — paying the whole context twice over for work
> that has no parallelism to win back. Delegate for fan-out or for discardable bulk,
> never to move sequential work off your own desk. `/sdd-build` is where the fan-out
> actually lives: one `sdd-code-implementer` per independent `[P]` group.

**Announce at start:** "Generating the implementation plan for spec-<number>."

**Output:** `work/active/spec-<number>/plan.md`.

**Core principle:** the plan is written, not executed — every task is text `/sdd-build`
runs later, including the git commands in Task 0.

**Two carriles.** `spec.md`'s front matter declares the story's `build_mode`
(resolved by `/sdd-clarify`, absent means `tdd`), and it decides which artifacts are
required, how the implementation order is derived, which task template applies and
what closes an AC:

| | `tdd` (default) | `evidence` |
|---|---|---|
| Requires `design.md` + contract + diagram | yes | no |
| Order comes from | the sequence diagram | dependencies between deliverables |
| Task template | `task-structure-template.md` | `task-structure-evidence-template.md` |
| Verification port | `TESTS` | `VERIFY` |

Everything else is identical in both — Task 0, the AC → Task traceability table, the
`[P]` groups, and the refusal to save a plan with an uncovered AC.

---

## Project profile (read first, always)

Read `.agents/profile.yaml` from the project root before anything else, as
`~/.agents/references/project-profile.md` describes: what a missing file means, how a
`null` key falls back, how a port resolves to an adapter, and why every path or command
shown here is only an example the profile overrides. The keys this skill reads are
listed under **Profile keys** in the `Contract` below.

---

## Contract

What this skill needs, what it guarantees to the next stage, and what it may not
do. **Check every `Requires` row before any other work** — a missing design
artifact stops the run at the start, not halfway through a written plan.

Two artifact names resolve from the profile (docs block) and are used throughout this
document:

- `<api-artifact>` = `docs/api.delta.yaml` if `API_CONTRACT_MODE = delta` (the
  default), otherwise `docs/api.yaml`.
- `<flow-artifact>` = `docs/diagram.md` if `DOC_UNIT = story` (the default),
  or every `docs/flows/*.md` if `use-case` — in that mode each flow carries its own
  inline `sequenceDiagram` and there is no `diagram.md`.

**Requires**

The four rows marked **(tdd only)** are skipped when the story runs in
`build_mode: evidence` — that carril has no design artifacts to require. Everything
else is checked in both.

| Condition | Check | If it fails |
|---|---|---|
| You are in the project's working directory | `pwd` == `WORKING_DIRECTORY` (absolute path, from the profile) | `cd` there before running anything |
| `spec.md` exists | `[ -f work/active/spec-<number>/spec.md ]` | Stop: "I couldn't find `work/active/spec-<number>/spec.md`. Run `/spec spec-<number>` first." |
| `context.md` exists | `[ -f work/active/spec-<number>/context.md ]` | Stop: "I couldn't find `work/active/spec-<number>/context.md`. Run `/clarify spec-<number>` first." |
| The build mode is valid and eligible | step 0 | Stop — see `Escalates` |
| `design.md` exists **(tdd only)** | `[ -f work/active/spec-<number>/design.md ]` | Stop: "I couldn't find the complete design artifacts for spec-<number>. Run `/design spec-<number>` first." |
| The sequence diagram exists **(tdd only)** | `<flow-artifact>` is present under `work/active/spec-<number>/` | Same stop as `design.md` — the implementation order comes from it (drafting PHASE 2) |
| The API contract exists **(tdd only)** | `[ -f work/active/spec-<number>/docs/<api-artifact> ]` | Same stop as `design.md` — it is the source of truth for every DTO task |
| A declared data model has its file **(tdd only)** | `design.md` has a `## Data Modeling` section ⇒ `docs/data-model.md` exists | Stop: "`design.md` states there's a new data model but I couldn't find `docs/data-model.md`. Run `/design spec-<number>` again." |
| `VERIFY` resolves to a usable adapter **(evidence only)** | the `VERIFY` port, resolved across packs + profile | Stop: "This story runs in `build_mode: evidence` but the `VERIFY` port is unbound — there is nothing to close its ACs with. Bind it in `.agents/profile.yaml`, or move the story back to `tdd`." |
| The working branch exists (prepare ran) | `[ -f work/active/spec-<number>/.branch ]` | Stop: "I couldn't find `work/active/spec-<number>/.branch`. Run `/prepare spec-<number>` first — it creates and checks out the working branch that Task 0 verifies." |
| No plan is already under execution | `plan.md` is absent, or present with **no** task marked `[X]` | Ask before overwriting — see `Escalates` |

**Produces** — this is what `/sdd-build` looks for

- `work/active/spec-<number>/plan.md`, with the header of
  `references/plan-header-template.md`
- an `### AC → Task traceability` table in that header mapping **every** AC in
  `spec.md` to at least one task — `/sdd-build` stops at its own Step 1.3 if one is missing
- `Task 0` as the first task: verifies the working branch (created and checked out by
  `/sdd-prepare`) in every affected <component>, with the branch name read from
  `work/active/spec-<number>/.branch` (step 3)
- `Task N` headings numbered sequentially, each with its verification cycle (TDD or
  evidence, per the carril), exact file paths
  and the expected output of every command; tasks belonging to independent groups
  carry a trailing `[P]` and the groups are named in the header's
  "Implementation groups" line
- no final "run the suite" task — `/sdd-build` closes with `TESTS.full` (Step 3.1)
- no task marked `[X]` — those markers belong to `/sdd-build`

**Writes** — exactly one file:

- `work/active/spec-<number>/plan.md`

Not `spec.md`, `context.md`, `design.md` or anything under the story's `docs/`
(that's `/sdd-design` or `/sdd-refine`), not the project's source and test files (that's
`/sdd-build`), and not the unit's living docs (that's `/sdd-sync`).

**Never** — regardless of what the plan appears to need

- **Allowed (read-only):** reading any project file, `git branch --show-current`,
  `git status`.
- **Forbidden:** `git checkout`, `git checkout -b`, `git pull`, `git add`,
  `git commit`, `git push` and any other state-changing git command. The working
  branch is created by `/sdd-prepare` (recorded in `.branch`); `/sdd-plan` reads the name,
  PHASE 2 writes Task 0 as a verification, `/sdd-build` runs it.
- **Forbidden:** creating or editing source or test files. The code inside a task is
  plan content, not a file on disk.

**Escalates**

- A missing `.branch` marker — the working branch was never created: stop and ask the
  user to run `/prepare spec-<number>` first, which now owns the branch (its `Escalates`
  row holds the branch-name question).
- A `plan.md` that already has tasks marked `[X]`: report it and ask before
  regenerating, because a regeneration discards the execution state and any
  `## AC Coverage` `/sdd-build` wrote. A targeted fix on an already-built plan is
  `/hotfix spec-<number>`, not a full regeneration.
- A `plan.md` that exists without `[X]` markers: ask before overwriting it.
- An AC that cannot be mapped to any task with the design artifacts at hand
  (drafting PHASE 3.5): stop and ask — never save a plan with an uncovered AC.
- A story claiming `build_mode: evidence` that does not hold up (step 0): an unknown
  mode value, a `type` outside `EVIDENCE_MODE_TYPES`, or a missing/empty
  `## Build Mode Rationale`. Stop and report which of the three failed — this is the
  guardrail's last mechanical line, and it is not negotiable at plan time. The fix is
  `/sdd-refine` on `spec.md`, or widening `EVIDENCE_MODE_TYPES` in the profile if the
  project's deliverables genuinely warrant it.

**Degrades**

- `STACK_REFS` unset → the skill's local (generic) `references/`. When set, each
  `<STACK_REFS>/<file>` resolves across the listed packs most specific first, then to
  the same local `references/`.
- `TESTS.module` unbound → the <component>'s full suite (`TESTS.full`), both in
  each task's TDD cycle.
- `VERIFY.run` unbound with `build_mode: evidence` → **not a degradation, a stop**
  (`Requires`). A carril whose only verification is a check cannot fall back to no
  check; that is exactly the escape hatch the mode is designed not to be.
  `VERIFY.full` unbound alone → `/sdd-build` closes with `VERIFY.run` once per
  deliverable.
- `docs/rules.md` absent → skip the constitution check (drafting PHASE 1, step 6c).
- `stack.SKILLS` unset/empty → load only what the project's
  `conventions.md`/`CLAUDE.md` require.
- `DOC_UNIT = use-case` → there is no `docs/diagram.md`; take the order
  from the `sequenceDiagram` inside each `docs/flows/*.md`.

**Reverting** — `plan.md` is the only file written, and it is restorable only once the
story workspace is tracked by git: `git checkout -- work/active/spec-<number>/plan.md`
brings back the committed version. Before the story's first commit there is nothing to
restore, which is exactly why regenerating over a plan with `[X]` tasks asks first.

**Profile keys**

- `STORY_ID_PATTERN`, `WORKDIR_ACTIVE` — the story's id and workspace, written
  throughout this document as `spec-<number>` and `work/active/spec-<number>/`;
  `.branch` lives there too (step 3)
- `WORKING_DIRECTORY` — the first `Requires` row
- `BASE_BRANCH` — the base the working branch was cut from (what Task 0 must not
  be on); `STORY_KEY_PATTERN` moved to `/sdd-prepare`, which owns the branch name now
- `DOCS_ARCHITECTURE` — where the testing and conventions docs live, applied to every
  task's shape (drafting PHASE 1, steps 7-8)
- `API_CONTRACT`, `API_CONTRACT_MODE`, `DOC_UNIT` — which design artifacts
  drafting PHASE 1 reads, and which of them is the source of truth
- `TEST_FRAMEWORK` — the shape of the test files, for the TDD cycle in every task
  (`tdd` carril only)
- `ITEM_TYPES`, `EVIDENCE_MODE_TYPES` (items block) — the eligibility check in
  step 0
- `STACK_REFS` and the stack block (`COMPONENT_TERM`, `LANGUAGE`, `FRAMEWORK`, `ORM`,
  `MIGRATIONS`, `MODULE_ROOT`) — the task templates (resolved across the listed packs,
  most specific first, generic fallback) and the header's `Stack` line
- `SKILLS` (stack block) — the best-practice skills to load before drafting
  (drafting PHASE 1, step 11b)
- `ARTIFACT_LANGUAGE`, `OUTPUT_LANGUAGE`, `IDENTIFIER_LANGUAGE` — see "Output language"

---

## Flow

Run these seven steps. Step 4 is the drafting PHASEs documented below (PHASE 1-3.5);
you execute them yourself, in this same session.

### Step 0 — Read the build mode, and re-check its guardrail

Read `spec.md`'s front matter. No `build_mode` field → `tdd`; run everything below
unchanged. `build_mode: evidence` → verify the three conditions **before** any other
precondition, because they decide which of the others apply:

1. The value is exactly `evidence` (any other non-`tdd` value is an error, never a
   synonym).
2. The item's `type` is in `EVIDENCE_MODE_TYPES` (items block; default
   `[debt, chore, incident]`).
3. `spec.md` carries a non-empty `## Build Mode Rationale`.

The mechanical form of all three, plus the rest of the artifact contract:

```bash
node ~/.agents/scripts/validate-artifacts.mjs spec-<number>
```

Exit `1` on a `build_mode` issue → stop and quote it verbatim (`Escalates`). Exit `2`
(no `node`) → check the three by eye and say the gate ran manually.

**Why /sdd-plan re-checks what /sdd-clarify already decided:** `/sdd-clarify` may not have run
(the field can be hand-written), and this is the last gate before an entire plan gets
written against the wrong carril. It costs one command.

### Step 1 — Preconditions (Requires)

Check every `Requires` row above, skipping the four marked **(tdd only)** when step 0
resolved the mode to `evidence`, and adding the `VERIFY` row in that case. Any failure
→ stop with the listed message.

### Step 2 — Overwrite gate

- If `work/active/spec-<number>/plan.md` exists with any task marked `[X]`:
  report it and ask before regenerating — a regeneration discards the execution
  state and any `## AC Coverage` `/sdd-build` wrote.
- If it exists without `[X]` markers: ask before overwriting it.

### Step 3 — Read the working branch name

`/sdd-prepare` created the working branch and recorded its name. Read it — never ask,
never invent:

```bash
cat work/active/spec-<number>/.branch
```

Expected: the working branch name (e.g. `feat/SPEC-1933-filter-zones-by-service-type`).
If the file is missing → stop: "I couldn't find `work/active/spec-<number>/.branch`.
Run `/prepare spec-<number>` first."

### Step 4 — Draft the plan (PHASE 1-3.5)

Run the drafting PHASEs below, carrying in what the earlier steps resolved:

- the working branch name from step 3, written **literally** into Task 0
- **the build mode from step 0** (`tdd` or `evidence`) and, when it is `evidence`,
  the `VERIFY.run` / `VERIFY.full` adapters resolved once there and written into the
  tasks — don't re-resolve the port per task
- the profile's `stack.SKILLS` best-practice skills, loaded at PHASE 1 step 11b

### Step 5 — Verify what you wrote

- **An AC you could not map** (PHASE 3.5) → do not save anything: show the escalation
  to the user and ask how to proceed. Options: fix the design artifact first
  (`/sdd-refine`), or instruct a specific mapping. Never accept a plan with an uncovered
  AC.
- **A plan written** → verify before closing, against the file on disk. Run the
  artifact check first — it covers the traceability table, Task 0's position and the
  task numbering mechanically:

  ```bash
  node ~/.agents/scripts/validate-artifacts.mjs spec-<number>
  ```

  Exit `0` → then confirm by eye the two things a script cannot know:
  - no task is marked `[X]`
  - Task 0's commands contain the branch name from `.branch` and verify it
    (they do not create it)

  Exit `1` → report the issues it lists, verbatim, and fix them before closing;
  an uncovered AC is never accepted. Exit `2` (no `node`) → run the whole list by
  hand, including the traceability table against `spec.md`'s ACs, and say the check
  was manual.

### Step 6 — Close

Show the summary (PHASE 4 below) and stop. Do not start executing.

---

## Drafting PHASE 1: Load artifacts

*Run inline, in the main agent.*

> **In `build_mode: evidence`, steps 3-6 do not apply** — there is no `design.md`, no
> API contract, no sequence diagram and no data model to read. Read `spec.md` (1),
> `context.md` (2), the constitution (6c), the conventions (7-8), the header template
> (9), and take the task shape from
> `<STACK_REFS>/references/task-structure-evidence-template.md` instead of step 10;
> skip step 11 (there are no DTOs to map). Steps 6b and 11b apply in both carriles.

1. Read `work/active/spec-<number>/spec.md` — extract:

   - All acceptance criteria — these drive the test cases
   - Each AC's `#### Scenario:` blocks — a scenario is already a test case: its
     `**WHEN**` is the arrange+act and its `**THEN**` the assertion, with the real
     values `/sdd-clarify` settled. Write the test from the scenario rather than
     re-deriving one from the AC's prose, and give the test a name that traces back
     to it. An AC with several scenarios needs several test cases
   - Business rules and edge cases

2. Read `work/active/spec-<number>/context.md` — extract:
   - Affected <component>s
   - Existing module paths per <component> (under `MODULE_ROOT`)
   - Injection patterns (how use cases are registered — read them from the code, and
     from the framework skill's references for the binding syntax, e.g. the `nestjs`
     skill's `references/nestjs-binding.md`)
   - Existing DTOs available for reuse
   - Current providers in each module registration file

3. Read `work/active/spec-<number>/design.md` — extract:
   - Endpoint table per <component> (business description)
   - Whether `## Data Modeling` is present (signals a new/changed table
     exists — the actual entity/SQL lives in `docs/data-model.md`)

4. Read `<flow-artifact>` — the sequence diagram determines the <component>
   implementation order (PHASE 2).

5. Read `work/active/spec-<number>/docs/<api-artifact>` — written in `API_CONTRACT`
   (e.g. OpenAPI 3.1), this is the **source of truth** for DTOs, never `design.md`:
   - Every path + operation → the endpoint a controller task must expose
   - Every schema in `components.schemas` → one DTO class, field-by-field
   - Every response code + description → the HTTP response cases a task must test

6. If `design.md` has a data model section, read
   `work/active/spec-<number>/docs/data-model.md` — this is the **source of
   truth** for the entity/migration task, never `design.md`:
   - Every entity field + type → the `ORM` column definition and the SQL column
   - Every SQL column → must match the entity field name/type exactly

6b. If `work/active/spec-<number>/docs/research.md` exists, read it — the chosen
    options and their rationale constrain how tasks should implement each
    decision (do not re-litigate a decision already recorded there).

6c. Read the project constitution if it exists — its Articles are non-negotiable
    and the generated tasks MUST respect them; `/sdd-design` already validated the
    Quality Gates, so here just avoid producing tasks that violate an Article:

    ```bash
    [ -s docs/rules.md ] && echo "FOUND" || echo "NONE"
    ```

7. Read the testing doc under `DOCS_ARCHITECTURE` (e.g. `docs/architecture/testing.md`)
   — apply TDD task format and test commands
   throughout (in the evidence carril, take from it only what applies: the project's
   conventions for naming and running checks, not the red-first cycle).
8. Read the conventions doc under `DOCS_ARCHITECTURE` (e.g.
   `docs/architecture/conventions.md`) — apply naming conventions throughout.
9. Consult `references/plan-header-template.md` — required header format.
10. Consult `<STACK_REFS>/references/task-structure-template.md` (if no pack in
    `STACK_REFS` provides it: the local `references/task-structure-template.md` —
    generic) — required task format.
11. Consult `<STACK_REFS>/references/openapi-to-dto-mapping.md` (if no pack in
    `STACK_REFS` provides it: the local `references/openapi-to-dto-mapping.md` —
    generic) — exact mapping from the API contract schema fields for the DTO task(s).
11b. Load each skill in the profile's `stack.SKILLS`
     with the Skill tool before writing code blocks, and apply its rules to the
     task text. Load by name; a name that doesn't exist is reported under
     Unknowns, not fatal. When the list is empty, apply only what steps 7-8
     require.

---

## Drafting PHASE 2: Determine implementation order

*Run inline, in the main agent.*

### In `build_mode: evidence` — order by what validates what

There is no sequence diagram. The order comes from the dependencies between the
deliverables themselves, and the rule is: **whatever other artifacts are validated
against comes first.** A catalog before the file that declares entries against it; a
schema before the documents it validates; a template before the skill that cites it.

Derive them from `context.md`'s inventory and from the ACs, and write the ordered list
down before any task. Getting this backwards produces a plan whose middle tasks fail
their own check for a reason that has nothing to do with their content.

Independent groups work the same as below: two deliverables with no validation
relationship between them can be `[P]`.

Then skip the rest of this phase.

### In `build_mode: tdd` — order by the call chain

Read the sequence diagram in `<flow-artifact>`.

Identify the call chain:
- Which <component> initiates the flow (usually the BFF or the entry service)
- Which <component> provides the core data
- Which <component>s are in between

**Implementation order rule:**
Implement from the data provider outward to the consumer.
Example: if a BFF calls `capabilities-ms`, implement `capabilities-ms` first,
then the BFF.

Record the ordered list of <component>s before writing any tasks.

### Detect independent groups (parallelizable)

Parallelism is the plan's main lever on wall-clock time, so look for it in **every**
plan, not only the multi-<component> ones. The unit is the task, not the <component>:
two slices inside one module run in parallel just as well when they share nothing.

Partition the tasks into groups by what they actually share. Two tasks belong to
different groups when **all** of these hold:

- neither writes a file the other writes — a shared `*.module.ts`, barrel or config
  file puts them in the same group
- neither imports, extends or validates against a symbol the other creates
- neither's <component> calls the other's in the sequence diagram, directly or
  transitively

Whatever the groups depend on is a task **outside** all of them, executed first: Task 0
and the shared foundation (entity, migration, a port several slices inject).

Record the groups — PHASE 3 marks their tasks `[P]` and names them in the header. One
group is the normal outcome for a small story; never looking is leaving wall clock on
the table.

---

## Drafting PHASE 3: Generate plan.md

*Run inline, in the main agent.*

### Header

Consult `references/plan-header-template.md` for the exact header structure.

### Task 0 — Verify the working branch (always first)

The working branch was created and checked out by `/sdd-prepare`, and its name is read
from `work/active/spec-<number>/.branch` (step 3). Write that name
literally into the task — `/sdd-build` executes the plan without stopping, so the task
must not have to ask.

Include, for each affected <component>, a step that verifies the working branch is
checked out and that the base is not checked out instead:

```bash
git -C <component> branch --show-current   # expected: <branch-name>, not BASE_BRANCH
git -C <component> status --porcelain      # expected: empty (clean working tree)
```

Expected: on `<branch-name>`, clean working tree. Task 0 must be re-runnable:
running it when the working branch is already checked out passes without changes.

Note: refreshing the base branch is `/sdd-prepare`'s job and must have run before this
plan. Task 0 does not pull, rebase or create branches — it only verifies.

### Tasks in `build_mode: evidence`

One task per **run of the check**, in the order fixed in PHASE 2, following
`<STACK_REFS>/references/task-structure-evidence-template.md` (the generic pack
carries it; a specific pack may override it). Deliverables the same command validates
in one pass share a task — three entries in one catalog is one task, not three. Each
task fixes the deliverable's shape (the sections, keys and values the check reads,
verbatim) and closes with the `VERIFY.run` command and its **verbatim** expected
output.

The template's rules are binding, not stylistic: a check that cannot fail is not a
check, a modification of something already covered opens with a baseline run, and a
task verified only by "the reviewer reads it" does not belong in this carril.

Write no final "run the checks" task: `/sdd-build` closes the run with `VERIFY.full`
(or `VERIFY.run` per deliverable when `full` is unbound). Then skip the rest of this
phase.

### Tasks per <component> (in sequence diagram order) — `build_mode: tdd`

For EACH <component>, in the order determined in PHASE 2, write one task per
**behavior**, following `<STACK_REFS>/references/task-structure-template.md`.

A task is a vertical slice: the entry point, the use case, the port, the DTOs, the
adapter method and the wiring that a single test run proves together. Not one task per
layer — a plan that splits a behavior into a DTO task, a port task and a use-case task
pays three test runs for one behavior and gains nothing, because none of the three is
independently verifiable.

Derive the slices from the sequence diagram: each request it traces from entry point
to response is one slice. An AC that adds a case to an existing slice (a validation,
an error path) is a **case inside that task**, not a task of its own.

Two things come out of a slice and become their own task, placed before it:

- **The shared foundation** — the entity and its migration (fields exactly as
  `docs/data-model.md` has them, never invented), or a port several slices inject.
  Written once.
- **A second behavior** hiding in an oversized task — split by what it does, never by
  where its files live.

**Multi-<component> plans:**
- Clearly mark which <component> each task belongs to
- Use the <component> name as a section header between groups
- Tasks for the second <component> only start after the first one's tasks are
  complete, UNLESS the two belong to different independent groups detected in
  PHASE 2 — in that case, mark every task header in both groups with a trailing
  `[P]` (e.g. `### Task 3: Request DTOs [P]`) to signal `/sdd-build` they can be
  executed in parallel, one `sdd-code-implementer` subagent per group.

### Task format

Consult `references/task-structure-template.md` for the exact format.

Each task MUST have:
- Exact file paths (absolute from the repo root)
- The contract: signatures, injected ports, error classes, and every field name and
  type taken verbatim from `<api-artifact>` or `docs/data-model.md`
- The cases its tests must cover, one line each
- The TDD cycle in `TEST_FRAMEWORK` (cases as failing tests → implement → green) and
  **one** verification run, with its expected output
- One mock per external dependency

Method bodies, test bodies and boilerplate are **not** written here — they follow from
the contract and the cases. Writing them means writing the feature twice: once as
prose nothing can execute, once as code. The line is in the template's § "What the
plan fixes, and what it leaves to the build": a task is under-specified when two
competent implementations would disagree on something a caller can observe, not when
it lacks code.

**The code inside a task carries no reference to this story.** A task is written
against an AC and the traceability table records that; the code it dictates must
not — no `AC-<n>`, `spec-<number>`, `Task <n>` or `work/active/…` in a comment, a
test name or a TODO. This is the one rule where you are the last line of defense:
`sdd-code-implementer` writes the symbols and names this task fixes, so an `// AC-3`
written here lands in the repository and outlives the workspace `/sdd-sync` archives.
Write the rule the AC states ("settled entries only"), which survives the
renumbering `/sdd-refine` and `/sdd-hotfix` do. Comment only what the code cannot say
about itself, in `IDENTIFIER_LANGUAGE` like every other symbol.

The same reasoning governs **where** a comment sits: on the structure (class,
function, module, interface, enum), never on one of its properties. A task that
writes an entity or a DTO with a loose `//` per field is writing the names badly —
`amount` with "in cents" beside it is `amountInCents`. Spend the line on the name,
which every caller reads, instead of on a comment only this file sees. Two things
stay: contract metadata (`@ApiProperty({ description })`, an OpenAPI `description`),
which is not a comment; and property documentation in a project whose convention is
to document properties (JSDoc/TSDoc, docstrings) — there the standard wins, and
`context.md` tells you which one the codebase already follows.

Full rule: the `design-principles` skill, § "Comments"; `/sdd-build` checks the diff
for artifact references before closing.

**Tests must cover:**
- Each acceptance criterion from spec.md → at least one test case
- Edge cases mentioned in spec.md
- Error scenarios (invalid input, DB failure, etc.)

### No final "run the suite" task

Don't write one. Every task already ends green on its own module, and `/sdd-build`
closes the run with `TESTS.full` per affected <component> (its Step 3.1, degrading to
`TESTS.module` per module when `full` is unbound). A task that re-runs the same suite
buys no coverage and costs a full run — the one thing this plan is optimizing for.

---

## Drafting PHASE 3.5: Verify traceability

*Run inline, in the main agent, before writing plan.md.*

Before saving, run this consistency check across the three artifacts —
do NOT skip it even if the plan "looks complete".

> **Check 1 runs in both carriles — it is the contract itself.** Checks 2-4 read the
> API contract and the data model, so they apply only in `build_mode: tdd`. In
> `evidence`, replace them with a single equivalent: **every task names a `VERIFY`
> command and a verbatim expected output**, and every AC in the table is closed by at
> least one of those commands. An AC whose only "verification" is a human reading the
> result is not covered — report `BLOCKED`.

1. **AC → Task coverage:** for every AC in `spec.md`, list which Task(s)
   exercise it (via the test written in that task). Build the table:

   | AC | Covered by |
   |----|-----------|
   | AC-1 | Task 2, Task 5 |

   If any AC has zero tasks mapped → add the missing task now, before
   saving. If an AC genuinely cannot be mapped with the artifacts at hand, do
   **not** save the plan: stop and ask the user, naming the AC.
   This table is a contract with `/sdd-build`, which refuses to start
   when an AC is missing from it.

2. **DTO field consistency:** every field name a task's contract declares
   must match exactly (name and type, per `references/openapi-to-dto-mapping.md`)
   the field defined in `<api-artifact>`'s `components.schemas`. If a
   mismatch is found, fix the task — the API contract is the source of truth,
   never invent a different name in the plan.

3. **Endpoint coverage:** every path + operation in `<api-artifact>` must
   have a corresponding controller task. Every response code documented
   in the contract must have a corresponding test case in some task.

4. **Entity field consistency:** if `docs/data-model.md` exists, verify every
   field appears in the entity task and the migration task with the same
   name and type as `docs/data-model.md` — that file is the source of truth,
   never invent a different name in the plan.

Include the AC → Task table in the plan header (see
`references/plan-header-template.md`).

---

## PHASE 4: Close

After step 5's verification passes:

1. Show a brief summary:
   - Total tasks generated
   - The build mode the plan was written for, and the check backing it when it is
     `evidence` (the resolved `VERIFY` adapter)
   - Affected <component>s in implementation order
   - Whether it includes an entity + migration
   - Scope estimate (number of files to create/modify)
   - Skills loaded from `stack.SKILLS`

2. Say:
   "Plan saved to `work/active/spec-<number>/plan.md`.
   Review the design sections first and when you're ready
   run it with `/build spec-<number>`."

3. Stop — do not start executing.

---

## Common Issues

| Issue | Cause | Resolution |
|-------|-------|------------|
| Service order unclear | Ambiguous sequence diagram | Read the whole diagram, infer from arrow direction |
| No `docs/diagram.md` in the story | `DOC_UNIT = use-case` | Not a gap: read the inline `sequenceDiagram` of each `docs/flows/*.md` |
| Undefined field in a test | Incomplete design | Use only fields confirmed in `<api-artifact>` / `docs/data-model.md` |
| Use case not registered in the module | Task omitted | Always include the module registration step |
| A test with no AC behind it | Invented test | Every test must map to an AC in spec.md |
| Relative path in imports | Convention violated | Follow the conventions doc under `DOCS_ARCHITECTURE` |
| `plan.md` already has `[X]` tasks | `/sdd-build` already ran on this story | Ask before regenerating — a targeted fix is `/hotfix spec-<number>` |
| `TESTS.module` unbound | Project without a per-module command | Write each task's TDD cycle against `TESTS.full` |
| `build_mode: evidence` with an ineligible `type` | The allowlist was never widened, or the field was hand-written | Stop at step 0 and quote the validator. Widening `EVIDENCE_MODE_TYPES` is the developer's call — never write the plan against the guardrail |
| `build_mode: evidence` with `VERIFY` unbound | The project declared the mode but bound no check | Stop: bind the port, or move the story back to `tdd`. Never plan tasks whose verification is a human reading them |
| An `evidence` story that ALSO has design artifacts | `/sdd-design` ran before the mode was decided | Not an error: the artifacts are extra context. Plan against the evidence carril anyway — the mode in `spec.md` wins |
| No `design.md` and the mode is `tdd` | `/sdd-design` never ran | Stop as always — in `tdd` the design is the input, and `evidence` is not the way around that |
| `.branch` missing at Requires | `/sdd-prepare` never ran | Stop and ask the user to run `/prepare spec-<number>` first — Task 0 verifies the branch, it doesn't create it |
| An AC cannot be mapped with the artifacts at hand | The design leaves it uncovered | Show the escalation to the user and ask; `/sdd-refine` the design or instruct the mapping — never save a plan with an uncovered AC |
| The written plan lacks the traceability table or has `[X]` | PHASE 3.5 was skipped or cut short | Fix it before closing — step 5's validator catches both |

---

## Example

**Input:** `/plan spec-1933` with a design.md defining an endpoint in `catalog-ms`.

**Step 3:** reads the branch name from `work/active/spec-1933/.branch` (recorded by
`/sdd-prepare`); **step 4** drafts against the design artifacts with `stack.SKILLS` loaded.

**Resulting plan.md (fragment):**

```markdown
# spec-1933: Filter zones by service type — Implementation Plan

**Story:** `work/active/spec-1933/`
**Microservice(s):** `catalog-ms`
**Goal:** Expose an endpoint that filters zones by service type.

---

### Task 0: Prepare the working branch
...

### Task 1: Request and response DTOs

**Files:**
- Create: `catalog-ms/src/domain/zones/infrastructure/entry-points/dtos/filter-zones-by-type.dto.ts`
- Test: (no unit test for pure DTOs)

**Step 1: Create FilterZonesByTypeRequestDto**
...
```

**Output to the user (PHASE 4 close):**
> Plan saved to `work/active/spec-1933/plan.md`. Review the design sections and run it with `/build spec-1933`.

---

## Output language
**Conversational output** follows `~/.agents/references/chat-conventions.md` - the six blocks (announce, progress, question, summary, stop, handoff).

**Artifact prose follows `ARTIFACT_LANGUAGE`** (profile, language block — falls back to
`OUTPUT_LANGUAGE` if the project doesn't declare it): the task titles, the step
descriptions, the expected outputs and the AC → Task table of `plan.md`. Never
translate them to English on your own.

Two things stay in English regardless of every language key: the **task markers**
(`Task 0`, `Task N` — `/sdd-build` and `/sdd-hotfix` locate them by name) and the **branch
description** asked for in step 3, since it ends up in git history.

Everything the plan writes as code — paths, class and method names, commands, and
the code, comments and test names inside each task — follows `IDENTIFIER_LANGUAGE`
(profile, language block). That axis is not a synonym for English: read the key and
write what it says, since `sdd-code-implementer` transcribes a task's code verbatim.

**Chat interaction follows the user's language** (`OUTPUT_LANGUAGE` in the profile).
The message samples in this document are written in English; render them in the
user's language when that differs.
