# Task Structure Template (generic — stack-agnostic)

A task is a **vertical slice**: the whole path that closes one behavior, from its
entry point down to the deepest new thing it needs. Not one task per layer.

Every task after Task 0 follows this structure:

```markdown
### Task N: [Behavior this slice closes]

**Files:**

- Create: `<component>/<exact path>/<file>.<ext>`
- Modify: `<component>/<exact path>/<existing>.<ext>`
- Test: `<component>/<exact path>/<file>.<test-suffix>`

**Contract:**

- `<Symbol>.<method>(<args>): <return>` — <what it does>
- depends on `<PortName>.<method>` (injected)
- throws `<ErrorName>` when <condition>

**Cases:**

- <input or state> → <expected result>
- <input or state> → <expected result>

**Cycle:** write the cases as failing tests → implement → green.

**Verify:** `<TESTS.module adapter, against this slice's specs>` → PASS (<N> tests)
```

---

## What the plan fixes, and what it leaves to the build

The plan fixes **what cannot be inferred**. The build writes **what follows from it**.

Write verbatim — these are requirements, not scaffolding:

- Signatures, symbol names, and the names of the ports and errors involved
- Field names and types taken from the API contract or the data model
- Any literal the requirement itself pins: an enum's members, a SQL migration, a
  regex, a status code, a config key
- The expected output of a command, when a task ends in one

Do **not** write: method bodies, test bodies, imports, class boilerplate, mock setup.
Those follow from the contract and the cases, and writing them here means writing the
feature twice — once as prose no one can execute, once as code.

A task is under-specified when two competent implementations of it would disagree on
something a caller can observe. That is the line — not "does it contain code".

---

## Granularity

- **One task = one verifiable behavior**, end to end. A use case with its port, its
  DTO, its adapter and its wiring is *one* task, because one test run proves it.
- **A shared foundation is its own task, first.** An entity, a migration, or a port
  that several slices depend on is written once, before them.
- **Split by behavior, never by layer.** If a task touches more than ~6 files or
  closes more than 2 ACs, there is a second behavior hiding in it.
- Order by dependency: whatever the others build on comes first.
- Mock external dependencies; never a real service in a unit test.

Every task ends in exactly one verification run. That count is the plan's time
budget — halving the tasks halves the wall clock.

## `[P]` marker (parallel execution)

Mark a task `[P]` when it shares no file and no new symbol with the tasks of another
group in the same plan:

```markdown
### Task 4: Reject an expired token [P]
```

`/sdd-build` runs the groups concurrently, one `sdd-code-implementer` subagent each,
and re-verifies every group before marking its tasks `[X]`. Tasks inside a group keep
their written order.

Do not mark `[P]` when one group imports, extends or validates against another's
output.

## Language rules

- `Task N` is structural — `/sdd-build` parses it, always English. Task titles, the
  contract lines, the cases and the expected outputs: `ARTIFACT_LANGUAGE` (profile,
  language block).
- Paths, symbols and commands: verbatim.
- The code a task **produces** — its symbols, comments and test names — follows
  `IDENTIFIER_LANGUAGE` (profile, language block). The plan names the symbols, so
  this is where the codebase's language is decided.

## Formatting

Keep the artifact readable — the redaction is prose, not a dump:

- A blank line **after every heading** and **before and after every list and code
  fence**.
- **One idea per bullet**, and never a bullet longer than ~3 lines.
- Break walls of text: no more than ~4 consecutive bullets or bold-label lines
  without a blank line between them.
