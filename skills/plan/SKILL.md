---
name: plan
description: >
  Generates a detailed TDD implementation plan from the approved design artifacts
  (spec.md, context.md, design.md) and saves it to work/active/spec-<number>/plan.md.
  Use when the user says "/plan spec-XXXX", "generate the plan", "create the
  implementation plan", "plan the story", or has completed /design and wants TDD tasks.
  Do NOT use before /design is complete and approved.
  Do NOT use for executing tasks (use /build).
---

# plan

## Overview

Read the approved artifacts, determine implementation order from the sequence
diagram, and produce a complete TDD plan organized by <component>.

**The skill runs as two actors:**

- **The orchestrator** — this skill, running in the main agent. It owns the
  interactive gates (preconditions, the branch-name question, overwrite and
  escalation decisions), delegates the drafting to the `plan-generator`
  subagent, and closes with the summary. It reads artifacts only to check they
  exist; it does not load them.
- **The `plan-generator` subagent** — the heavy context work. It loads the
  design artifacts, the templates, and the project's best-practice skills
  (`stack.SKILLS` from the profile), and writes `plan.md`. It cannot ask the
  user anything: decisions it cannot make are reported back as escalations.

**Announce at start:** "Generating the implementation plan for spec-<number>."

**Output:** `work/active/spec-<number>/plan.md` — written by the
`plan-generator` subagent, verified by the orchestrator.

**Core principle:** the plan is written, not executed — every task is text `/build`
runs later, including the git commands in Task 0.

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

Any path, branch name, command or framework shown in this document is an example
resolution; the profile's value wins. The keys this skill reads are listed under
**Profile keys** in the `Contract` below.

---

## Contract

What this skill needs, what it guarantees to the next stage, and what it may not
do. **Check every `Requires` row before any other work** — a missing design
artifact stops the run at the start, not halfway through a written plan.

Two artifact names resolve from the profile (docs block) and are used throughout this
document:

- `<api-artifact>` = `docs/api.delta.yaml` if `API_CONTRACT_MODE = delta` (the
  default), otherwise `docs/api.yaml`.
- `<flow-artifact>` = `docs/diagram.md` if `DESIGN_OUTPUT_MODE = full` (the default),
  or every `docs/flows/*.md` if `full-flow` — in that mode each flow carries its own
  inline `sequenceDiagram` and there is no `diagram.md`.

**Requires**

| Condition | Check | If it fails |
|---|---|---|
| You are in the project's working directory | `pwd` == `WORKING_DIRECTORY` (absolute path, from the profile) | `cd` there before running anything |
| `spec.md` exists | `[ -f work/active/spec-<number>/spec.md ]` | Stop: "I couldn't find `work/active/spec-<number>/spec.md`. Run `/spec spec-<number>` first." |
| `context.md` exists | `[ -f work/active/spec-<number>/context.md ]` | Stop: "I couldn't find `work/active/spec-<number>/context.md`. Run `/clarify spec-<number>` first." |
| `design.md` exists | `[ -f work/active/spec-<number>/design.md ]` | Stop: "I couldn't find the complete design artifacts for spec-<number>. Run `/design spec-<number>` first." |
| The sequence diagram exists | `<flow-artifact>` is present under `work/active/spec-<number>/` | Same stop as `design.md` — the implementation order comes from it (drafting PHASE 2) |
| The API contract exists | `[ -f work/active/spec-<number>/docs/<api-artifact> ]` | Same stop as `design.md` — it is the source of truth for every DTO task |
| A declared data model has its file | `design.md` has a `## Data Modeling` section ⇒ `docs/data-model.md` exists | Stop: "`design.md` states there's a new data model but I couldn't find `docs/data-model.md`. Run `/design spec-<number>` again." |
| The working branch exists (prepare ran) | `[ -f work/active/spec-<number>/.branch ]` | Stop: "I couldn't find `work/active/spec-<number>/.branch`. Run `/prepare spec-<number>` first — it creates and checks out the working branch that Task 0 verifies." |
| No plan is already under execution | `plan.md` is absent, or present with **no** task marked `[X]` | Ask before overwriting — see `Escalates` |

**Produces** — this is what `/build` looks for

- `work/active/spec-<number>/plan.md`, with the header of
  `references/plan-header-template.md` — written by the `plan-generator` subagent
- an `### AC → Task traceability` table in that header mapping **every** AC in
  `spec.md` to at least one task — `/build` stops at its own Step 1.3 if one is missing
- `Task 0` as the first task: verifies the working branch (created and checked out by
  `/prepare`) in every affected <component>, with the branch name read from
  `work/active/spec-<number>/.branch` (orchestrator step 3)
- `Task N` headings numbered sequentially, each with its TDD cycle, exact file paths
  and the expected output of every command; tasks belonging to independent groups
  carry a trailing `[P]` and the groups are named in the header's
  "Implementation groups" line
- a final task per affected <component> that calls the `TESTS.module` port
- no task marked `[X]` — those markers belong to `/build`

**Writes** — the orchestrator writes nothing itself; the `plan-generator` subagent
writes exactly one file:

- `work/active/spec-<number>/plan.md`

Not `spec.md`, `context.md`, `design.md` or anything under the story's `docs/`
(that's `/design` or `/refine`), not the project's source and test files (that's
`/build`), and not the unit's living docs (that's `/sync`).

**Never** — regardless of what the plan appears to need

- **Allowed (read-only):** reading any project file, `git branch --show-current`,
  `git status`.
- **Forbidden:** `git checkout`, `git checkout -b`, `git pull`, `git add`,
  `git commit`, `git push` and any other state-changing git command. The working
  branch is created by `/prepare` (recorded in `.branch`); `/plan` reads the name,
  `plan-generator` writes Task 0 as a verification, `/build` runs it.
- **Forbidden:** creating or editing source or test files. The code inside a task is
  plan content, not a file on disk.

**Escalates**

- A missing `.branch` marker — the working branch was never created: stop and ask the
  user to run `/prepare spec-<number>` first, which now owns the branch (its `Escalates`
  row holds the branch-name question).
- A `plan.md` that already has tasks marked `[X]`: report it and ask before
  regenerating, because a regeneration discards the execution state and any
  `## AC Coverage` `/build` wrote. A targeted fix on an already-built plan is
  `/hotfix spec-<number>`, not a full regeneration.
- A `plan.md` that exists without `[X]` markers: ask before overwriting it.
- An AC that cannot be mapped to any task with the design artifacts at hand
  (drafting PHASE 3.5): the `plan-generator` subagent reports `BLOCKED`, and the
  orchestrator asks — never save a plan with an uncovered AC.

**Degrades**

- `STACK_REFS` unset → the skill's local (generic) `references/`. When set, each
  `<STACK_REFS>/<file>` resolves across the listed packs most specific first, then to
  the same local `references/`.
- `TESTS.module` unbound → the <component>'s full suite (`TESTS.full`), both in
  each task's TDD steps and in the final task.
- `docs/rules.md` absent → skip the constitution check (drafting PHASE 1, step 6c).
- `stack.SKILLS` unset/empty → the `plan-generator` subagent loads only what the
  project's `conventions.md`/`CLAUDE.md` require.
- `DESIGN_OUTPUT_MODE = full-flow` → there is no `docs/diagram.md`; take the order
  from the `sequenceDiagram` inside each `docs/flows/*.md`.

**Reverting** — `plan.md` is the only file written, and it is restorable only once the
story workspace is tracked by git: `git checkout -- work/active/spec-<number>/plan.md`
brings back the committed version. Before the story's first commit there is nothing to
restore, which is exactly why regenerating over a plan with `[X]` tasks asks first.

**Profile keys**

- `STORY_ID_PATTERN`, `WORKDIR_ACTIVE` — the story's id and workspace, written
  throughout this document as `spec-<number>` and `work/active/spec-<number>/`
- `WORKING_DIRECTORY` — the first `Requires` row
- `BASE_BRANCH` — the base the working branch was cut from (what Task 0 must not
  be on); `STORY_KEY_PATTERN` moved to `/prepare`, which owns the branch name now
- `WORKDIR_ACTIVE` — where `.branch` lives (orchestrator step 3)
- `API_CONTRACT`, `API_CONTRACT_MODE`, `DESIGN_OUTPUT_MODE` — which design artifacts
  the `plan-generator` subagent reads, and which of them is the source of truth
  (drafting PHASE 1)
- `TEST_FRAMEWORK` — the shape of the test files, for the TDD cycle in
  every task and the final task
- `STACK_REFS` and the stack block (`COMPONENT_TERM`, `LANGUAGE`, `FRAMEWORK`, `ORM`,
  `MIGRATIONS`, `MODULE_ROOT`) — the task templates (resolved across the listed packs,
  most specific first, generic fallback) and the header's `Stack` line
- `SKILLS` (stack block) — the best-practice skills the orchestrator passes to the
  `plan-generator` subagent to load (drafting PHASE 1, step 11b)
- `ARTIFACT_LANGUAGE`, `OUTPUT_LANGUAGE`, `IDENTIFIER_LANGUAGE` — see "Output language"

---

## Orchestrator flow

Run these six steps. The drafting PHASEs below (PHASE 1-3.5) are executed by the
`plan-generator` subagent, which reads this document — the orchestrator does not
perform them itself.

### Step 1 — Preconditions (Requires)

Check every `Requires` row above. Any failure → stop with the listed message.
Also read `docs/rules.md` existence only if you need it for the delegation prompt.

### Step 2 — Overwrite gate

- If `work/active/spec-<number>/plan.md` exists with any task marked `[X]`:
  report it and ask before regenerating — a regeneration discards the execution
  state and any `## AC Coverage` `/build` wrote.
- If it exists without `[X]` markers: ask before overwriting it.

### Step 3 — Read the working branch name

`/prepare` created the working branch and recorded its name. Read it — never ask,
never invent:

```bash
cat work/active/spec-<number>/.branch
```

Expected: the working branch name (e.g. `feat/SPEC-1933-filter-zones-by-service-type`).
If the file is missing → stop: "I couldn't find `work/active/spec-<number>/.branch`.
Run `/prepare spec-<number>` first."

### Step 4 — Delegate the drafting

Spawn the `plan-generator` subagent (`subagent_type: "plan-generator"` in opencode,
the same agent in Claude Code). Pass a self-contained prompt with:

- the story id and the absolute path to `work/active/spec-<number>/`
- the working branch name (read from `.branch` in step 3), to be written literally
  into Task 0
- the absolute path to the project's `.agents/profile.yaml`
- the profile's `stack.SKILLS` list (or `none` if unset/empty)
- a pointer that it must read `~/.agents/skills/plan/SKILL.md` (this document)
  and follow the drafting PHASEs below, and that any decision it cannot make is
  reported back as an escalation — never silently guessed

The `plan-generator` subagent's own prompt already encodes the drafting contract
(load artifacts, apply `stack.SKILLS`, PHASE 3.5 traceability, `BLOCKED` on an
unmappable AC, report format) — do not repeat it, just supply the inputs and read
the report.

### Step 5 — Handle the report

- **Status `BLOCKED`** → the subagent named an AC (or field mismatch) it could not
  resolve. Do not save anything: show the escalation to the user and ask how to
  proceed. Options: fix the design artifact first (`/refine`), or instruct a
  specific mapping. Never accept a plan with an uncovered AC.
- **Status `DONE`** → verify lightly before closing:
  - `plan.md` exists at `work/active/spec-<number>/plan.md`
  - its header carries the `### AC → Task traceability` table covering every AC
    of `spec.md`
  - no task is marked `[X]`
  - Task 0's commands contain the branch name from `.branch` and verify it
    (they do not create it)
  Any deviation → report it and re-delegate or fix manually before closing.

### Step 6 — Close

Show the summary (PHASE 4 below) and stop. Do not start executing.

---

## Drafting PHASE 1: Load artifacts

*Executed by the `plan-generator` subagent.*

1. Read `work/active/spec-<number>/spec.md` — extract:
   - All acceptance criteria — these drive the test cases
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
    and the generated tasks MUST respect them; `/design` already validated the
    Quality Gates, so here just avoid producing tasks that violate an Article:

    ```bash
    [ -s docs/rules.md ] && echo "FOUND" || echo "NONE"
    ```

7. Read `docs/architecture/testing.md` — apply TDD task format and test commands throughout.
8. Read `docs/architecture/conventions.md` — apply naming conventions throughout.
9. Consult `references/plan-header-template.md` — required header format.
10. Consult `<STACK_REFS>/references/task-structure-template.md` (if no pack in
    `STACK_REFS` provides it: the local `references/task-structure-template.md` —
    generic) — required task format.
11. Consult `<STACK_REFS>/references/openapi-to-dto-mapping.md` (if no pack in
    `STACK_REFS` provides it: the local `references/openapi-to-dto-mapping.md` —
    generic) — exact mapping from the API contract schema fields for the DTO task(s).
11b. Load each skill in the profile's `stack.SKILLS` (passed by the orchestrator)
     with the Skill tool before writing code blocks, and apply its rules to the
     task text. Load by name; a name that doesn't exist is reported under
     Unknowns, not fatal. When the list is empty, apply only what steps 7-8
     require.

---

## Drafting PHASE 2: Determine implementation order

*Executed by the `plan-generator` subagent.*

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

If 3+ <component>s are affected, check whether any of them have **no call
relationship** with each other in the sequence diagram (neither calls the
other, directly or transitively). Group those into independent groups —
e.g. "Group A: catalog-ms → gateway-ms" and "Group B: users-ms" when
`users-ms` doesn't interact with the other two.

If only 1-2 <component>s are affected, or all of them are connected in a
single call chain, skip this — there is nothing to parallelize.

Record the groups (if any) — they are used in PHASE 3 to mark tasks `[P]`
and in the header template.

---

## Drafting PHASE 3: Generate plan.md

*Executed by the `plan-generator` subagent.*

### Header

Consult `references/plan-header-template.md` for the exact header structure.

### Task 0 — Verify the working branch (always first)

The working branch was created and checked out by `/prepare`, and its name is read
from `work/active/spec-<number>/.branch` (orchestrator step 3). Write that name
literally into the task — `/build` executes the plan without stopping, so the task
must not have to ask.

Include, for each affected <component>, a step that verifies the working branch is
checked out and that the base is not checked out instead:

```bash
git -C <component> branch --show-current   # expected: <branch-name>, not BASE_BRANCH
git -C <component> status --porcelain      # expected: empty (clean working tree)
```

Expected: on `<branch-name>`, clean working tree. Task 0 must be re-runnable:
running it when the working branch is already checked out passes without changes.

Note: refreshing the base branch is `/prepare`'s job and must have run before this
plan. Task 0 does not pull, rebase or create branches — it only verifies.

### Tasks per <component> (in sequence diagram order)

For EACH <component>, in the order determined in PHASE 2,
generate tasks following this order when applicable:

```
Task N   — Entity (per `ORM`) + migration (per `MIGRATIONS`)
           (only if design.md has a data model section — use the exact
           entity/SQL from docs/data-model.md, never invent fields)

Task N+1 — Request and response DTOs
           (use exact field names and types from <api-artifact>)

Task N+2 — Domain port (abstract class)
           (add new method signatures to the existing abstract service)

Task N+3 — Use case
           (new use case class with an execute() method)

Task N+4 — Repository / adapter
           (implement the new method in the existing repository)

Task N+5 — Controller + module registration
           (add endpoint + register the use case in the module providers)
```

**Multi-<component> plans:**
- Clearly mark which <component> each task belongs to
- Use the <component> name as a section header between groups
- Tasks for the second <component> only start after the first one's tasks are
  complete, UNLESS the two belong to different independent groups detected in
  PHASE 2 — in that case, mark every task header in both groups with a trailing
  `[P]` (e.g. `### Task 3: Request DTOs [P]`) to signal `/build` they can be
  executed in parallel, one `code-implementer` subagent per group.

### Task format

Consult `references/task-structure-template.md` for the exact format.

Each task MUST have:
- Exact file paths (absolute from the repo root)
- Complete `LANGUAGE` code — never "add validation here"
- TDD cycle in `TEST_FRAMEWORK`: test fails → implement → test passes
- Expected output for every bash command
- One mock per external dependency

**Tests must cover:**
- Each acceptance criterion from spec.md → at least one test case
- Edge cases mentioned in spec.md
- Error scenarios (invalid input, DB failure, etc.)

### Final task — Run the affected module's suite

Always include as the last task, per affected <component>: call the `TESTS.module`
port, from that <component>'s directory and returning afterwards. Write the task
against the port, not against a command — the adapter is the profile's business.

Expected: PASS — every test in the module passing.

If `TESTS.module` is unbound → use `TESTS.full` for that <component> instead.

---

## Drafting PHASE 3.5: Verify traceability

*Executed by the `plan-generator` subagent before writing plan.md.*

Before saving, run this consistency check across the three artifacts —
do NOT skip it even if the plan "looks complete":

1. **AC → Task coverage:** for every AC in `spec.md`, list which Task(s)
   exercise it (via the test written in that task). Build the table:

   | AC | Covered by |
   |----|-----------|
   | AC-1 | Task 2, Task 5 |

   If any AC has zero tasks mapped → add the missing task now, before
   saving. If an AC genuinely cannot be mapped with the artifacts at hand, do
   **not** save the plan: report `BLOCKED` naming the AC (the orchestrator asks
   the user). This table is a contract with `/build`, which refuses to start
   when an AC is missing from it.

2. **DTO field consistency:** every field name used in a task's DTO code
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

## PHASE 4: Close (orchestrator)

After the delegation returns `DONE` and step 5's verification passes:

1. Show a brief summary:
   - Total tasks generated
   - Affected <component>s in implementation order
   - Whether it includes an entity + migration
   - Scope estimate (number of files to create/modify)
   - Skills the `plan-generator` subagent loaded (from its report)

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
| No `docs/diagram.md` in the story | `DESIGN_OUTPUT_MODE = full-flow` | Not a gap: read the inline `sequenceDiagram` of each `docs/flows/*.md` |
| Undefined field in a test | Incomplete design | Use only fields confirmed in `<api-artifact>` / `docs/data-model.md` |
| Use case not registered in the module | Task omitted | Always include the module registration step |
| A test with no AC behind it | Invented test | Every test must map to an AC in spec.md |
| Relative path in imports | Convention violated | Follow `docs/architecture/conventions.md` |
| `plan.md` already has `[X]` tasks | `/build` already ran on this story | Ask before regenerating — a targeted fix is `/hotfix spec-<number>` |
| `TESTS.module` unbound | Project without a per-module command | Write the TDD steps and the final task against `TESTS.full` |
| `.branch` missing at Requires | `/prepare` never ran | Stop and ask the user to run `/prepare spec-<number>` first — Task 0 verifies the branch, it doesn't create it |
| Subagent reports `BLOCKED` | An AC cannot be mapped with the artifacts at hand | Show the escalation to the user and ask; `/refine` the design or instruct the mapping — never save a plan with an uncovered AC |
| The written plan lacks the traceability table or has `[X]` | `plan-generator` deviated from PHASE 3.5 | Report it, re-delegate or fix manually before closing |

---

## Example

**Input:** `/plan spec-1933` with a design.md defining an endpoint in `catalog-ms`.

**Delegation:** the orchestrator reads the branch name from `work/active/spec-1933/.branch`
(recorded by `/prepare`), then spawns `plan-generator` with the workspace, branch name,
profile path and `stack.SKILLS`.

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

**Output to the user (orchestrator close):**
> Plan saved to `work/active/spec-1933/plan.md`. Review the design sections and run it with `/build spec-1933`.

---

## Output language
**Conversational output** follows `~/.agents/references/chat-conventions.md` - the six blocks (announce, progress, question, summary, stop, handoff).

**Artifact prose follows `ARTIFACT_LANGUAGE`** (profile, language block — falls back to
`OUTPUT_LANGUAGE` if the project doesn't declare it): the task titles, the step
descriptions, the expected outputs and the AC → Task table of `plan.md`. Never
translate them to English on your own.

Three things stay in English regardless of that key: the **task markers**
(`Task 0`, `Task N` — `/build` and `/hotfix` locate them by name), the **identifiers**
(paths, classes, commands, `IDENTIFIER_LANGUAGE`) and the **branch description** asked
for in orchestrator step 3, since it ends up in git history.

**Chat interaction follows the user's language** (`OUTPUT_LANGUAGE` in the profile).
The message samples in this document are written in English; render them in the
user's language when that differs.
