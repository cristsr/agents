# Task Structure Template — `build_mode: evidence` (generic — stack-agnostic)

The task shape for a story whose acceptance criteria are closed with **executable
evidence** instead of a test written red-first: a validator over an artifact, a linter
over a config file, a migration dry-run, a docs link check.

Everything that makes the TDD template trustworthy is kept: exact paths, complete
content (never "add the section here"), one verification command per task, and the
expected output written down. What changes is only the direction of the cycle — the
change comes first, the check confirms it.

Every task after Task 0 must follow this exact structure:

```markdown
### Task N: [Deliverable name]

**Files:**
- Create: `<exact path>/<file>.<ext>`
- Modify: `<exact path>/<existing>.<ext>:123-145`

**Step 1: Baseline — confirm the check is green before touching anything**

> ONLY when the task modifies something that already exists and is already covered
> by the check (a refactor, a config edit, a doc rewrite). Skip this step entirely
> for a file being created — there is nothing to baseline.
> The command comes from the `VERIFY.run` port, with `<target>` substituted.

```bash
<VERIFY.run adapter, against the target>
```
Expected: PASS — recorded so a later red is unambiguously caused by this task.

**Step 2: Write the change**

In `<path>/<file>.<ext>`:

```<language|markdown|yaml>
<the complete content — the full section, the full block, the full file.
 Never a description of what to write.>
```

**Step 3: Verify**

```bash
<VERIFY.run adapter, against the target>
```
Expected: PASS — `<the exact output line that proves it, verbatim>`
```

---

## The rule that replaces red-green

In TDD the failing test proves the test is real. Here nothing proves the check is
real, so the plan has to make that explicit instead:

- **The check must be able to fail.** A command that passes no matter what the file
  says is not evidence. If `VERIFY.run` cannot distinguish the deliverable being right
  from being wrong, the task needs a different check — not a softer expectation.
- **Expected output is quoted verbatim**, not summarized. "Expected: PASS" alone is
  not evidence; `OK: 43 profile keys, no issues.` is.
- **Baseline before a modification.** Without it, a red at Step 3 is ambiguous: it may
  have been red before the task started.
- **One check per task**, against the narrowest target the port allows — the same
  reason `TESTS.module` is the TDD hot path.

## Notes on task design

- Each task should represent a single cohesive deliverable (one document, one config
  file, one migration, one coherent section of an artifact)
- Tasks are ordered by dependency: **whatever other artifacts validate against comes
  first**. A catalog before the file that declares entries against it; a schema before
  the documents it validates
- A task with more than 6 steps is likely too large — split it
- A task whose only verification is "the reviewer reads it" is not a task in this
  mode: either find the check, or the story belongs in `build_mode: tdd`

## `[P]` marker (parallel execution)

Identical to the TDD template: if PHASE 2 of `/plan` detected independent groups, mark
every task header in those groups with a trailing `[P]`, and `/build` runs one
`code-implementer` subagent per group, re-verifying each group before marking `[X]`.

```markdown
### Task 4: Port catalog entry [P]
```

Do not mark tasks `[P]` when one group's deliverable is validated against another's.

## Language rules

- `Task N` and `Step N` are structural — `/build` parses them, always English.
  Task titles, step descriptions and expected outputs: `ARTIFACT_LANGUAGE`
  (profile, language block).
- Content, paths and commands: verbatim.
