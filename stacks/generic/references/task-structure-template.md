# Task Structure Template (generic — stack-agnostic)

Every task after Task 0 must follow this exact structure:

```markdown
### Task N: [Component name]

**Files:**
- Create: `<component>/<exact path>/<file>.<ext>`
- Modify: `<component>/<exact path>/<existing>.<ext>:123-145`
- Test: `<component>/<exact path>/<file>.<test-suffix>`

**Step 1: Write the failing test**

In `<component>/<path>/<file>.<test-suffix>`:

```<language>
describe('ClassName', () => {
  it('should [behavior]', async () => {
    // arrange
    const input = ...;
    // act
    const result = await service.method(input);
    // assert
    expect(result).toEqual(expected);
  });
});
```

**Step 2: Run it and confirm it fails**

> The command comes from the `TESTS.module` port — run it against the specific spec.

```bash
cd <component>
<TESTS.module adapter, against the spec>
cd ..
```
Expected: FAIL — "Cannot find module" or "X is not a function"

**Step 3: Implement the minimum code**

In `<component>/<path>/<file>.<ext>`:

```<language>
// minimum necessary name
```

**Step 4: Run it and confirm it passes**

```bash
<TESTS.module adapter, against the spec>
```
Expected: PASS
```

---

## Notes on task design

- Each task should represent a single cohesive component (service, repository, use case, port, adapter)
- Tasks should be ordered by dependency: define interfaces before implementations
- A task with more than 6 steps is likely too large — split it
- Always mock external dependencies, never use real services in unit tests

## `[P]` marker (parallel execution)

If PHASE 2 of `/plan` detected independent component groups, mark every task
header belonging to those groups with a trailing `[P]`:

```markdown
### Task 4: Request and response DTOs [P]
```

`[P]` means: this task has no dependency on tasks from a *different* `[P]`
group in the same plan. `/build` executes the groups concurrently, delegating
each one to its own `code-implementer` subagent (one subagent per group,
launched in parallel), and re-verifies each group's tests before marking its
tasks `[X]`. Tasks within the *same* group still execute in their written order.

Do not mark tasks `[P]` if there is any chance one group's code imports or
depends on the other's output.

## Language rules

- `Task N` and `Step N` are structural — `/build` parses them, always English.
  Task titles, step descriptions and expected outputs: `ARTIFACT_LANGUAGE`
  (profile, language block).
- Code, paths and commands: verbatim.
