# sdd-plan — worked example

What a real run looks like: a written plan.md and its first tasks.
Read it when the shape of the output is in doubt; the rules themselves are in
`SKILL.md`.

## Example

**Input:** `/plan spec-1933` with a design.md defining an endpoint in `catalog-ms`.

**Step 3:** reads the branch name from `work/active/spec-1933/.branch` (recorded by
`/sdd-prepare`); **step 4** drafts against the design artifacts with `stack.SKILLS` loaded.

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

**Output to the user (PHASE 4 close):**
> Plan saved to `work/active/spec-1933/plan.md`. Review the design sections and run it with `/build spec-1933`.
