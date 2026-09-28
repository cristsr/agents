# sdd-build — worked example

What a real run looks like: a run executing a group and closing out.
Read it when the shape of the output is in doubt; the rules themselves are in
`SKILL.md`.

**The run below is `full`** — it starts at `[Task 0]` and executes a `[P]` group. A
`standard` story has no groups, and a `fast` story has neither: it writes no
`plan.md`, so its close lives in `spec.md`.

## Example

**Input:** `/sdd-build spec-1933`

**During execution — output per group:**

```
Executing plan spec-1933.

[Task 0] Verify the working branch...
  ✓ on feat/SPEC-1933-filter-zones-by-service-type, clean tree
→ Marking Task 0 as [X]

[Group A: catalog-ms] Tasks 1-3
  ✓ Tests written: 3 specs, 8 cases
  ✓ <TESTS.module> → FAIL (8 failing, as expected)
  ✓ Task 1 implemented → PASS (3 tests)
  ✓ Task 2 implemented → PASS (2 tests)
  ✓ Task 3 implemented → PASS (3 tests)
→ Marking Tasks 1-3 as [X]
```

**plan.md after Group A goes green:**
```markdown
### Task 1: Filter zones by service type [P] [X]
```

**Final output:**
> All tasks completed. Review the changes and tell me if anything needs adjusting.
> Once they're OK, the next step is `/sdd-sync spec-<number>` to close out the module's
> documentation (and then `/sdd-commit spec-<number>` for the commits and the PR).
