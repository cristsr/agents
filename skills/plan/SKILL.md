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

**Announce at start:** "Generating the implementation plan for spec-<number>."

**Output:** `work/active/spec-<number>/plan.md`

**Core principle:** the plan is written, not executed — every task is text `/build`
runs later, including the git commands in Task 0.

---

## Project profile (read first, always)

Read `.agents/profile.md` at the root of the current project before anything else. If it
doesn't exist, tell the user to copy `~/.agents/sdd-profile.template.md` to
`.agents/profile.md` and stop — without a profile you don't know this project's
conventions.

Any path, branch name, command or framework shown in this document is an example
resolution; the profile's value wins. The keys this skill reads are listed under
**Profile keys** in the `Contract` below.

---

## Contract

What this skill needs, what it guarantees to the next stage, and what it may not
do. **Check every `Requires` row before any other work** — a missing design
artifact stops the run at the start, not halfway through a written plan.

Two artifact names resolve from the profile (section 8) and are used throughout this
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
| The sequence diagram exists | `<flow-artifact>` is present under `work/active/spec-<number>/` | Same stop as `design.md` — the implementation order comes from it (PHASE 2) |
| The API contract exists | `[ -f work/active/spec-<number>/docs/<api-artifact> ]` | Same stop as `design.md` — it is the source of truth for every DTO task |
| A declared data model has its file | `design.md` has a `## Data Modeling` section ⇒ `docs/data-model.md` exists | Stop: "`design.md` states there's a new data model but I couldn't find `docs/data-model.md`. Run `/design spec-<number>` again." |
| No plan is already under execution | `plan.md` is absent, or present with **no** task marked `[X]` | Ask before overwriting — see `Escalates` |

**Produces** — this is what `/build` looks for

- `work/active/spec-<number>/plan.md`, with the header of
  `references/plan-header-template.md`
- an `### AC → Task traceability` table in that header mapping **every** AC in
  `spec.md` to at least one task — `/build` stops at its own Step 1.3 if one is missing
- `Task 0` as the first task: creates the working branch off `BASE_BRANCH` in every
  affected <component>, with the branch name already resolved (PHASE 3)
- `Task N` headings numbered sequentially, each with its TDD cycle, exact file paths
  and the expected output of every command; tasks belonging to independent groups
  carry a trailing `[P]` and the groups are named in the header's
  "Implementation groups" line
- a final task per affected <component> that runs `MODULE_TEST_CMD`
- no task marked `[X]` — those markers belong to `/build`

**Writes** — nothing outside this list

- `work/active/spec-<number>/plan.md`

Not `spec.md`, `context.md`, `design.md` or anything under the story's `docs/`
(that's `/design` or `/refine`), not the project's source and test files (that's
`/build`), and not the unit's living docs (that's `/sync`).

**Never** — regardless of what the plan appears to need

- **Allowed (read-only):** reading any project file, `git branch --show-current`,
  `git status`.
- **Forbidden:** `git checkout`, `git checkout -b`, `git pull`, `git add`,
  `git commit`, `git push` and any other state-changing git command. The branch
  creation lives *inside Task 0 as text*; `/plan` writes it, `/build` runs it.
- **Forbidden:** creating or editing source or test files. The code inside a task is
  plan content, not a file on disk.

**Escalates**

- The branch name for Task 0 — always asked, never invented (PHASE 3).
- A `plan.md` that already has tasks marked `[X]`: report it and ask before
  regenerating, because a regeneration discards the execution state and any
  `## AC Coverage` `/build` wrote. A targeted fix on an already-built plan is
  `/hotfix spec-<number>`, not a full regeneration.
- An AC that cannot be mapped to any task with the design artifacts at hand
  (PHASE 3.5): ask — never save a plan with an uncovered AC.

**Degrades**

- `STACK_REFS` unset → the skill's local (generic) `references/`.
- `MODULE_TEST_CMD` at `—` → the <component>'s full suite (`FULL_TEST_CMD`), both in
  each task's TDD steps and in the final task.
- `docs/rules.md` absent → skip the constitution check (PHASE 1, step 6c).
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
- `BASE_BRANCH`, `STORY_KEY_PATTERN` — Task 0's branch and its name
- `API_CONTRACT`, `API_CONTRACT_MODE`, `DESIGN_OUTPUT_MODE` — which design artifacts
  to read, and which of them is the source of truth (PHASE 1)
- `TEST_FRAMEWORK`, `MODULE_TEST_CMD` (`FULL_TEST_CMD` as fallback) — the TDD cycle in
  every task and the final task
- `STACK_REFS` and section 7 (`COMPONENT_TERM`, `LANGUAGE`, `FRAMEWORK`, `ORM`,
  `MIGRATIONS`, `DTO_STYLE`, `MODULE_ROOT`) — the task templates and the header's
  `Stack` line
- `ARTIFACT_LANGUAGE`, `OUTPUT_LANGUAGE`, `IDENTIFIER_LANGUAGE` — see "Output language"

---

## PHASE 1: Load artifacts

1. Read `work/active/spec-<number>/spec.md` — extract:
   - All acceptance criteria — these drive the test cases
   - Business rules and edge cases

2. Read `work/active/spec-<number>/context.md` — extract:
   - Affected <component>s
   - Existing module paths per <component> (under `MODULE_ROOT`)
   - Injection patterns (how use cases are registered, per `DI_TOKENS`)
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
10. Consult `<STACK_REFS>/references/task-structure-template.md` (default if `STACK_REFS`
    isn't defined: the local `references/task-structure-template.md` — generic)
    — required task format.
11. Consult `<STACK_REFS>/references/openapi-to-dto-mapping.md` (default: the local
    `references/openapi-to-dto-mapping.md` — generic) — exact mapping from
    the API contract schema fields to the project's `DTO_STYLE` for the DTO task(s).

---

## PHASE 2: Determine implementation order

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

## PHASE 3: Generate plan.md

### Header

Consult `references/plan-header-template.md` for the exact header structure.

### Task 0 — Prepare branches (always first)

Ask the user for the branch name before writing the task, and write the resolved
name into it — `/build` executes the plan without stopping, so it must not have to
ask:

> "What's the branch name? Use English for the description.
> (e.g. `feat/<story-key>-short-english-description` or
> `fix/<story-key>-short-english-description`, where `<story-key>` follows
> `STORY_KEY_PATTERN` from the profile)"

Include, for each affected <component>, a step that branches **explicitly off
`BASE_BRANCH`** (e.g. `develop`) rather than off whatever happens to be checked out:

```bash
git -C <component> checkout -b <branch-name> BASE_BRANCH
```

Task 0 must be re-runnable: if the working branch already exists and is checked out
(the developer created it by hand, or `/forge` did), the task verifies it and skips
the creation instead of failing.

Note: refreshing the base branch (`checkout` + `pull` of `BASE_BRANCH`) is the
dedicated `/prepare` skill's job. Task 0 assumes each affected <component> already
sits on an up-to-date `BASE_BRANCH`. Do not add checkout/pull steps for the base
here; if the base looks stale, recommend `/prepare`.

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
  executed using parallel tool calls.

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

Always include as the last task, per affected <component>: run `MODULE_TEST_CMD`
(profile, section 10 — a typical resolution is
`npx jest src/modules/<module>/ --no-coverage`, run from that <component>'s
directory and returning afterwards).

Expected: PASS — every test in the module passing.

If `MODULE_TEST_CMD` is `—` → use `FULL_TEST_CMD` for that <component> instead.

---

## PHASE 3.5: Verify traceability (Analyze)

Before saving, run this consistency check across the three artifacts —
do NOT skip it even if the plan "looks complete":

1. **AC → Task coverage:** for every AC in `spec.md`, list which Task(s)
   exercise it (via the test written in that task). Build the table:

   | AC | Covered by |
   |----|-----------|
   | AC-1 | Task 2, Task 5 |

   If any AC has zero tasks mapped → add the missing task now, before
   saving. Never save a plan with an uncovered AC. This table is a contract with
   `/build`, which refuses to start when an AC is missing from it.

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

## PHASE 4: Save and hand off

After saving `work/active/spec-<number>/plan.md`:

1. Show a brief summary:
   - Total tasks generated
   - Affected <component>s in implementation order
   - Whether it includes an entity + migration
   - Scope estimate (number of files to create/modify)

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
| `MODULE_TEST_CMD` is `—` | Project without a per-module command | Write the TDD steps and the final task against `FULL_TEST_CMD` |

---

## Example

**Input:** `/plan spec-1933` with a design.md defining an endpoint in `catalog-ms`.

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

**Output to the user:**
> Plan saved to `work/active/spec-1933/plan.md`. Review the design sections and run it with `/build spec-1933`.

---

## Output language

**Artifact prose follows `ARTIFACT_LANGUAGE`** (profile, section 5 — falls back to
`OUTPUT_LANGUAGE` if the project doesn't declare it): the task titles, the step
descriptions, the expected outputs and the AC → Task table of `plan.md`. Never
translate them to English on your own.

Three things stay in English regardless of that key: the **task markers**
(`Task 0`, `Task N` — `/build` and `/hotfix` locate them by name), the **identifiers**
(paths, classes, commands, `IDENTIFIER_LANGUAGE`) and the **branch description** asked
for in Task 0, since it ends up in git history.

**Chat interaction follows the user's language** (`OUTPUT_LANGUAGE` in the profile).
The message samples in this document are written in English; render them in the
user's language when that differs.
