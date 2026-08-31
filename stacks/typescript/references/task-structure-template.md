# Task Structure Template (typescript)

A task is a **vertical slice**: the whole path that closes one behavior, from its
entry point down to the deepest new thing it needs. Not one task per layer.

Every task after Task 0 follows this structure:

```markdown
### Task N: [Behavior this slice closes]

**Files:**

- Create: `<component>/src/modules/<module>/application/<name>.use-case.ts`
- Modify: `<component>/src/modules/<module>/<module>.module.ts`
- Delete: `<component>/src/modules/<module>/application/<obsolete>.use-case.ts`
- Test: `<component>/src/modules/<module>/application/<name>.use-case.spec.ts`

**Contract:**

- `<Name>UseCase.execute(dto: <Name>Dto): Promise<<Result>>`
- injects `<Name>RepositoryPort` (abstract class token)
- throws `<Name>NotFoundError` when the repository returns empty

**Cases:**

- a matching record exists → returns it mapped to `<Result>`
- no match → throws `<Name>NotFoundError`
- the repository rejects → the error propagates unwrapped

**Cycle:** write the cases as failing tests → implement → green.

**Verify:** `npx jest src/modules/<module>/ --no-coverage` → PASS (3 tests)
```

> The command above is this pack's default `TESTS.module` adapter (`ports.yaml`).
> If the profile binds a different one, that one wins.

---

## What the plan fixes, and what it leaves to the build

The plan fixes **what cannot be inferred**. The build writes **what follows from it**.

Write verbatim — these are requirements, not scaffolding:

- Signatures, class and symbol names, the injection token, the error classes
- Field names and types taken from `<api-artifact>` or `docs/data-model.md`
- Any literal the requirement pins: enum members, the migration SQL, a regex, an
  HTTP status, an env key
- The expected output of a command, when a task ends in one

Do **not** write: method bodies, `describe`/`it` bodies, imports, decorators,
constructor boilerplate, `jest.fn()` mock setup. Those follow from the contract and
the cases, and writing them here means writing the feature twice — once as prose no
one can execute, once as code.

A file this task removes is a `Delete:` line, never an implicit consequence of a
`Modify:` note elsewhere — the file tree consolidated in the plan header (see
`plan-header-template.md`) is only as accurate as the `Files:` blocks it reads.

A task is under-specified when two competent implementations of it would disagree on
something a caller can observe. That is the line — not "does it contain code".

---

## Granularity

- **One task = one verifiable behavior**, end to end. The use case, its port, its
  DTOs, the repository method and the controller wiring are *one* task — one
  `jest` run proves the whole slice.
- **A shared foundation is its own task, first.** The entity and its migration, or a
  port several slices inject, is written once, before them.
- **Split by behavior, never by layer.** If a task touches more than ~6 files or
  closes more than 2 ACs, there is a second behavior hiding in it.
- Order by dependency: whatever the others build on comes first.
- Mock every injected port with `jest.fn()`; never a real service in a unit test.

Every task ends in exactly one `jest` run. That count is the plan's time budget —
Jest's startup dominates a module suite, so halving the tasks halves the wall clock.

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
output — two tasks editing the same `*.module.ts` are never parallel.

## Language rules

- `Task N` is structural — `/sdd-build` parses it, always English. Task titles, the
  contract lines, the cases and the expected outputs: `ARTIFACT_LANGUAGE` (profile,
  language block).
- Paths, symbols and commands: verbatim.
- The code a task **produces** — its symbols, comments and test names — follows
  `IDENTIFIER_LANGUAGE` (profile, language block). The plan names the symbols, so
  this is where the codebase's language is decided.
