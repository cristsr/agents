# Plan Header Template

Every plan MUST start with this exact header structure:

```markdown
# spec-<number>: [Feature Name] — Implementation Plan

**Story:** `work/active/spec-<number>/`
**<Component>(s):** `<component-name>`  ← the term comes from `COMPONENT_TERM`
**Goal:** [One sentence describing what this builds]
**Architecture:** [2-3 sentences about the approach and the patterns used]
**Stack:** <language> · <framework> · <ORM> · <DB> · <test framework>  ← from profile section 7
**Implementation groups:** [Only include this line if PHASE 2 detected independent
groups. E.g. "Group A: catalog-ms, gateway-ms (sequential) ∥
Group B: users-ms (parallel, no dependency on Group A)". Omit the whole line
if there is only one group.]

### AC → Task traceability

| AC | Covered by |
|----|-----------|
| AC-1 | Task N |
| AC-2 | Task N, Task M |

> Every AC in `spec.md` must appear at least once in this table. If any is missing,
> add the corresponding task before saving the plan (see PHASE 3.5).

---
```

---

## Task 0 — Always the first task after the header

```markdown
### Task 0: Prepare the working branch

> The branch name is resolved when the plan is written (PHASE 3), never at execution
> time — `/build` runs the plan without stopping, so it must not have to ask.
> Write the resolved name literally into the commands below.

**Steps:**

**Step 1: Verify the base is fresh (read-only)**

```bash
git -C <component> branch --show-current   # expected: BASE_BRANCH (e.g. develop)
git -C <component> status --porcelain      # expected: empty (clean working tree)
```
Expected: on `BASE_BRANCH`, up to date and with no uncommitted changes. Refreshing the
base (`checkout` + `pull` of `BASE_BRANCH`) is `/prepare`'s job, not this plan's. If it
isn't on an up-to-date `BASE_BRANCH` or the working tree is dirty → stop and recommend
`/prepare <component>` before creating the branch.

If the working branch already exists and is checked out (created by hand, or by
`/forge`), verify it and skip Step 2 — Task 0 is re-runnable.

**Step 2: Create the working branch**

```bash
git -C <component> checkout -b <branch-name> BASE_BRANCH
```
Expected: new branch created and active, starting **explicitly** from `BASE_BRANCH`
rather than from whatever happened to be checked out.
```

## Language rules

- `Task 0` and the task numbering are structural — `/build` and `/hotfix` locate tasks
  by that name, always English.
- Task titles and prose: `ARTIFACT_LANGUAGE` (profile, section 5 — falls back to
  `OUTPUT_LANGUAGE`).
- Branch names, paths and commands: verbatim. The branch description stays English —
  it ends up in git history.
