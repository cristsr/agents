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

### AC → Task traceability

| AC | Covered by |
|----|-----------|
| AC-1 | Task 1 |

### File Tree

**catalog-ms**

```
└── catalog-ms/src/domain/zones/infrastructure/entry-points/dtos/filter-zones-by-type.dto.ts   (create)
```

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

**Resulting docs/file-tree.md** — same list as the header's `### File Tree`, from the
same PHASE 3.5 pass, rendered as a nested tree for review instead of a flat list:

```markdown
# spec-1933: File Tree (visual)

> For review only — the version `/sdd-build` and the validator check is the
> `### File Tree` section in `plan.md`. Regenerated together with it; never edited
> separately.

**catalog-ms**

```
catalog-ms
└── src
    └── domain
        └── zones
            └── infrastructure
                └── entry-points
                    └── dtos
                            filter-zones-by-type.dto.ts   (create)
```
```

**Output to the user (PHASE 4 close):**
> Plan saved to `work/active/spec-1933/plan.md`. Review the design sections and run it with `/build spec-1933`.
