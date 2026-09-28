# Strategy — `tier: full`, `build_mode: tdd`

## Contents

- Order: the call chain
- Independent groups (`[P]`)
- Tasks: vertical slices per component
- Checks against the contract and the data model

The default and fullest strategy: the design exists, so the order comes from the
sequence diagram and the contract is the source of truth for every field.

## Order: the call chain

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

## Independent groups (`[P]`)

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

Record the groups — the tasks section marks their tasks `[P]` and names them in the header. One
group is the normal outcome for a small story; never looking is leaving wall clock on
the table.

## Tasks: vertical slices per component

For EACH <component>, in the order determined in the order section, write one task per
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
  the order section — in that case, mark every task header in both groups with a trailing
  `[P]` (e.g. `### Task 3: Request DTOs [P]`) to signal `/sdd-build` they can be
  executed in parallel, one `sdd-code-implementer` subagent per group.

## Checks against the contract and the data model

Run them with the traceability check (Step 5 of `SKILL.md`), before saving:

- **DTO field consistency:** every field name a task's contract declares
   must match exactly (name and type, per the `api-contract` artifact contract's
   `openapi-to-dto-mapping.md`)
   the field defined in `<api-artifact>`'s `components.schemas`. If a
   mismatch is found, fix the task — the API contract is the source of truth,
   never invent a different name in the plan.

- **Endpoint coverage:** every path + operation in `<api-artifact>` must
   have a corresponding controller task. Every response code documented
   in the contract must have a corresponding test case in some task.

- **Entity field consistency:** if `docs/data-model.md` exists, verify every
   field appears in the entity task and the migration task with the same
   name and type as `docs/data-model.md` — that file is the source of truth,
   never invent a different name in the plan.
