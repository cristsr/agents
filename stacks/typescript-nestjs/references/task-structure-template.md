# Task Structure Template

Every task after Task 0 must follow this exact structure:

```markdown
### Task N: [Component name]

**Files:**
- Create: `<component>/src/exact/path/to/file.ts`
- Modify: `<component>/src/exact/path/to/existing.ts:123-145`
- Test: `<component>/src/exact/path/to/file.spec.ts`

**Step 1: Write the failing test**

In `<component>/src/path/to/file.spec.ts`:

```typescript
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

> Command from the profile: `MODULE_TEST_CMD` (section 10 — default `npx jest
> src/modules/<module>/ --no-coverage`); here it runs against the specific spec.

```bash
cd <component>
npx jest src/path/to/file.spec.ts --no-coverage
cd ..
```
Expected: FAIL — "Cannot find module" or "X is not a function"

**Step 3: Implement the minimum code**

In `<component>/src/path/to/file.ts`:

```typescript
// minimum necessary name
```

**Step 4: Run it and confirm it passes**

```bash
npx jest src/path/to/file.spec.ts --no-coverage
```
Expected: PASS
---

## Notes on task design

- Each task should represent a single cohesive component (service, repository, use case, port, adapter)
- Tasks should be ordered by dependency: define interfaces before implementations
- A task with more than 6 steps is likely too large — split it
- Always mock external dependencies, never use real services in unit tests

## `[P]` marker (parallel execution)

If PHASE 2 of `/plan` detected independent microservice groups, mark every task
header belonging to those groups with a trailing `[P]`:

```markdown
### Task 4: Request and response DTOs [P]
```

`[P]` means: this task has no dependency on tasks from a *different* `[P]`
group in the same plan. `/build` may batch the file operations (Edit/Write)
and test runs of tasks from different `[P]` groups using parallel tool calls
within the same response, instead of strictly one-at-a-time. Tasks within the
*same* group still execute in their written order.

Do not mark tasks `[P]` if there is any chance one group's code imports or
depends on the other's output.

## Language rules

- `Task N` and `Step N` are structural — `/build` parses them, always English.
  Task titles, step descriptions and expected outputs: `ARTIFACT_LANGUAGE`
  (profile, section 5).
- Code, paths and commands: verbatim.
