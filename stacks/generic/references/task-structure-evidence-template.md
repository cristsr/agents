# Task Structure Template — `build_mode: evidence` (generic — stack-agnostic)

The task shape for a story whose acceptance criteria are closed with **executable
evidence** instead of a test written red-first: a validator over an artifact, a linter
over a config file, a migration dry-run, a docs link check.

Everything that makes this carril trustworthy is kept: exact paths, one verification
command per task, and the expected output written down verbatim. What changes is the
direction of the cycle — the change comes first, the check confirms it.

Every task after Task 0 follows this structure:

```markdown
### Task N: [Deliverable name]

**Files:**

- Create: `<exact path>/<file>.<ext>`
- Modify: `<exact path>/<existing>.<ext>`

**Shape:**

- <the sections, keys or entries the deliverable must contain>
- <the values the check reads, verbatim — key names, enum members, ids>
- <the invariant that makes it correct>

**Baseline:** `<VERIFY.run adapter, against the target>` → PASS

> ONLY when the task modifies something already covered by the check. Skip it for a
> file being created — there is nothing to baseline.

**Verify:** `<VERIFY.run adapter, against the target>`
Expected: `<the exact output line that proves it, verbatim>`
```

---

## What the plan fixes, and what it leaves to the build

The plan fixes **what the check reads and what the requirement pins**. The build
writes the deliverable that satisfies it.

Write verbatim: section headings the validator looks for, key names, enum members,
ids, paths, and the expected output line. Those are the requirement.

Do not transcribe the deliverable's prose. A plan that contains the finished document
has written it twice — once where nothing can validate it, once where something can.

A task is under-specified when the check could pass on a deliverable that misses the
point. That is the line — not "does it contain the full text".

## The rule that replaces red-green

In TDD the failing test proves the test is real. Here nothing proves the check is
real, so the plan has to make that explicit instead:

- **The check must be able to fail.** A command that passes no matter what the file
  says is not evidence. If `VERIFY.run` cannot distinguish the deliverable being right
  from being wrong, the task needs a different check — not a softer expectation.
- **Expected output is quoted verbatim**, not summarized. "Expected: PASS" alone is
  not evidence; `OK: 43 profile keys, no issues.` is.
- **Baseline before a modification.** Without it, a red at Verify is ambiguous: it may
  have been red before the task started.
- **One check per task**, against the narrowest target the port allows — the same
  reason `TESTS.module` is the TDD hot path.

## Granularity

- **One task = one run of the check.** Deliverables that the *same* command validates
  in one pass belong in the same task: three entries in one catalog is one task, not
  three, because one run proves all of them.
- **Split when the check differs**, or when one deliverable validates against
  another's output — that dependency also fixes the order.
- Order by dependency: **whatever other artifacts validate against comes first.** A
  catalog before the file declaring entries against it; a schema before the documents
  it validates.
- A task whose only verification is "the reviewer reads it" does not belong in this
  carril — either find the check, or the story is `build_mode: tdd`.

Every task ends in exactly one verification run. That count is the plan's time budget.

## `[P]` marker (parallel execution)

Identical to the TDD template: mark every task header in an independent group with a
trailing `[P]`, and `/sdd-build` runs one `sdd-code-implementer` subagent per group,
re-verifying each group before marking `[X]`.

```markdown
### Task 4: Port catalog entry [P]
```

Do not mark tasks `[P]` when one group's deliverable is validated against another's.

## Language rules

- `Task N` is structural — `/sdd-build` parses it, always English. Task titles, the
  shape lines and the expected outputs: `ARTIFACT_LANGUAGE` (profile, language block).
- Paths, keys and commands: verbatim.
- Whatever a task **produces** in the repository — symbols, comments, the names of the
  checks — follows `IDENTIFIER_LANGUAGE` (profile, language block).
