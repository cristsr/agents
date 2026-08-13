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

Read the three approved artifacts, determine implementation order from the
sequence diagram, and produce a complete TDD plan organized by microservice.

**Announce at start:** "Generating the implementation plan for spec-<number>."

**Output:** `work/active/spec-<number>/plan.md`

---

## Project profile (read first, always)

Before anything else, read `.agents/profile.md` (at the root of the current project): it defines the artifact
paths, the output language, the **target stack** (framework, ORM, DTO style) and the
**test framework** that anchors the TDD cycle. If it doesn't exist, tell the user to
create it from the template and stop.

**CRITICAL — Working directory:** before running anything, verify you are in the project's working directory (`WORKING_DIRECTORY` from the profile — absolute path). If `pwd` doesn't match `WORKING_DIRECTORY`, `cd` there before continuing.

**The literals in this document are only an example resolution**.
The real values come from the `profile.md` of the project you're working on — if they differ, the profile wins:

| In this document | Key in profile.md |
|---|---|
| `spec-<number>` | `STORY_ID_PATTERN` |
| `work/active/spec-<number>/` | `WORKDIR_ACTIVE` |
| microservice | `COMPONENT_TERM` |
| `develop` | `BASE_BRANCH` |
| `feat/<story-key>-…` | `STORY_KEY_PATTERN` |
| Jest / `*.spec.ts` | `TEST_FRAMEWORK` |
| NestJS · DTOs · OpenAPI→DTO | section 7 "Stack and architecture" + `API_CONTRACT` + `<STACK_REFS>` |

---

## CRITICAL: Verify inputs exist

Extract the story number from user input. Then verify:

`<api-artifact>` = `docs/api.delta.yaml` if `API_CONTRACT_MODE = delta` (the profile
default, section 8), otherwise `docs/api.yaml`.

```bash
[ -f work/active/spec-<number>/spec.md ]          || echo "MISSING: spec.md"
[ -f work/active/spec-<number>/context.md ]      || echo "MISSING: context.md"
[ -f work/active/spec-<number>/design.md ]       || echo "MISSING: design.md"
[ -f work/active/spec-<number>/docs/diagram.md ] || echo "MISSING: docs/diagram.md"
[ -f work/active/spec-<number>/docs/<api-artifact> ] || echo "MISSING: docs/<api-artifact>"
```

- If `spec.md` missing → stop:
  "I couldn't find `work/active/spec-<number>/spec.md`.
  Run `/spec spec-<number>` first."

- If `context.md` missing → stop:
  "I couldn't find `work/active/spec-<number>/context.md`.
  Run `/clarify spec-<number>` first."

- If `design.md`, `docs/diagram.md` or `<api-artifact>` are missing → stop:
  "I couldn't find the complete design artifacts for spec-<number>.
  Run `/design spec-<number>` first."

- If `design.md` contains a `## Data Modeling` section but
  `docs/data-model.md` does not exist → stop:
  "`design.md` states there's a new data model but I couldn't find
  `docs/data-model.md`. Run `/design spec-<number>` again."

---

## PHASE 1: Load artifacts

1. Read `work/active/spec-<number>/spec.md` — extract:
   - All acceptance criteria — these drive the test cases
   - Business rules and edge cases

2. Read `work/active/spec-<number>/context.md` — extract:
   - Affected microservices
   - Existing module paths per microservice
   - Injection patterns (how use cases are registered)
   - Existing DTOs available for reuse
   - Current providers in each module.ts

3. Read `work/active/spec-<number>/design.md` — extract:
   - Endpoint table per microservice (business description)
   - Whether `## Data Modeling` is present (signals a new/changed table
     exists — the actual entity/SQL lives in `docs/data-model.md`)

4. Read `work/active/spec-<number>/docs/diagram.md` — the sequence diagram
   determines microservice implementation order (PHASE 2).

5. Read `work/active/spec-<number>/docs/<api-artifact>` (resolved by
   `API_CONTRACT_MODE`: `api.delta.yaml` if `delta`, `api.yaml` if `full`) —
   this is the **source of truth** for DTOs, never `design.md`:
   - Every path + operation → the endpoint a controller task must expose
   - Every schema in `components.schemas` → one DTO class, field-by-field
   - Every response code + description → the HTTP response cases a task must test

6. If `design.md` has a data model section, read
   `work/active/spec-<number>/docs/data-model.md` — this is the **source of
   truth** for the entity/migration task, never `design.md`:
   - Every entity field + type → the `@Column` definition and SQL column
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
    the API contract schema fields to the project's DTO style for the DTO task(s).

---

## PHASE 2: Determine implementation order

Read the sequence diagram in `design.md`.

Identify the call chain:
- Which microservice initiates the flow (usually BFF or scheduling-ms)
- Which microservice provides the core data (usually capabilities-ms)
- Which microservices are in between

**Implementation order rule:**
Implement from the data provider outward to the consumer.
Example: if BFF calls capabilities-ms, implement capabilities-ms first,
then BFF.

Record the ordered list of microservices before writing any tasks.

### Detect independent groups (parallelizable)

If 3+ microservices are affected, check whether any of them have **no call
relationship** with each other in the sequence diagram (neither calls the
other, directly or transitively). Group those into independent groups —
e.g. "Group A: catalog-ms → gateway-ms" and "Group B:
users-ms" when users-ms doesn't interact with the other two.

If only 1-2 microservices are affected, or all of them are connected in a
single call chain, skip this — there is nothing to parallelize.

Record the groups (if any) — they are used in PHASE 3 to mark tasks `[P]`
and in the header template.

---

## PHASE 3: Generate plan.md

Consult `references/plan-header-template.md` for the exact header structure.

### Header

Consult `references/plan-header-template.md` for the exact header structure.

### Task 0 — Prepare branches (always first)

Create git branch preparation for ALL affected microservices.
Ask the user for the branch name before continuing:

> "What's the branch name? Use English for the description.
> (e.g. feat/<story-key>-short-english-description or fix/<story-key>-short-english-description,
> where `<story-key>` follows `STORY_KEY_PATTERN` from the profile)"

Include steps for each affected microservice:
```bash
git -C <microservice> checkout -b <branch-name>
```

Note: preparing the base branch (`git checkout develop` + `git pull`) is done by
the dedicated `/prepare` skill, not by `/scan`. Task 0 assumes each affected
microservice is already on an up-to-date `develop` — if the developer skipped
`/prepare`, the branch is created off whatever is currently checked out. Do not add
checkout/pull-of-develop steps here; if the base looks stale, recommend `/prepare`.

### Tasks per microservice (in sequence diagram order)

For EACH microservice, in the order determined in PHASE 2,
generate tasks following this order when applicable:

```
Task N   — TypeORM entity + SQL migration
           (only if design.md has a data model section — use the exact
           entity/SQL from docs/data-model.md, never invent fields)

Task N+1 — Request and response DTOs
           (use exact field names and types from design.md)

Task N+2 — Domain port (abstract class)
           (add new method signatures to the existing abstract service)

Task N+3 — Use case
           (new use case class with an execute() method)

Task N+4 — Repository / adapter
           (implement the new method in the existing repository)

Task N+5 — Controller + module registration
           (add endpoint + register the use case in the module providers)
```

**CRITICAL for multi-service plans:**
- Clearly mark which microservice each task belongs to
- Use the microservice name as a section header between groups
- Tasks for service-2 only start after service-1's tasks are complete,
  UNLESS service-1 and service-2 belong to different independent groups
  detected in PHASE 2 — in that case, mark every task header in both
  groups with a trailing `[P]` (e.g. `### Task 3: Request DTOs [P]`)
  to signal `/build` they can be executed using parallel tool calls.

### Task format

Consult `references/task-structure-template.md` for the exact format.

Each task MUST have:
- Exact file paths (absolute from monorepo root)
- Complete TypeScript code — never "add validation here"
- TDD cycle: test fails → implement → test passes
- Expected output for every bash command
- One mock per external dependency

**Tests must cover:**
- Each acceptance criterion from spec.md → at least one test case
- Edge cases mentioned in spec.md
- Error scenarios (invalid input, DB failure, etc.)

### Final task — Run full test suite

Always include as the last task — the profile's `MODULE_TEST_CMD` (section 10 — default):

```bash
cd <microservice>
npx jest src/modules/<module>/ --no-coverage
cd ..
```

Expected: PASS — every test in the module passing.

If multiple microservices: run for each one.

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
   saving. Never save a plan with an uncovered AC.

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
   - Affected microservices in implementation order
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
| Undefined field in a test | Incomplete design.md | Use only fields confirmed in design.md |
| Use case not registered in the module | Task omitted | Always include the module.ts registration step |
| A test with no AC behind it | Invented test | Every test must map to an AC in spec.md |
| Relative path in imports | Convention violated | Use absolute paths from src/ |

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

## CRITICAL: Output Language

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
