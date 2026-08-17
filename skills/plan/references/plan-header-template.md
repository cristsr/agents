# Plan Header Template

Every plan MUST start with this exact header structure:

```markdown
# spec-<number>: [Feature Name] — Implementation Plan

**Story:** `work/active/spec-<number>/`

**<Component>(s):** `<component-name>`  ← the term comes from `COMPONENT_TERM`

**Goal:** [One sentence describing what this builds]

**Architecture:** [2-3 sentences about the approach and the patterns used]

**Stack:** <language> · <framework> · <ORM> · <DB> · <test framework>  ← from the profile's stack block

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
### Task 0: Verify the working branch

> The branch name was resolved by `/prepare` and recorded in
> `work/active/spec-<number>/.branch` — write it literally into the commands below.
> The plan runs without stopping, so it must not have to ask.

**Steps:**

**Step 1: Verify the working branch is checked out**

```bash
git -C <component> branch --show-current   # expected: <branch-name>, not BASE_BRANCH
git -C <component> status --porcelain      # expected: empty (clean working tree)
```

Expected: on `<branch-name>`, clean working tree. Re-runnable: running it when the
working branch is already checked out passes without changes.
```

## Formatting

Keep the artifact readable — a blank line **after every heading**, **between every
bold-label line** in the header, and **before and after every list, table and code
fence**. One idea per bullet; never a bullet longer than ~3 lines.

## Language rules

- `Task 0` and the task numbering are structural — `/build` and `/hotfix` locate tasks
  by that name, always English.
- Task titles and prose: `ARTIFACT_LANGUAGE` (profile, language block — falls back to
  `OUTPUT_LANGUAGE`).
- Branch names, paths and commands: verbatim. The branch description stays English —
  it ends up in git history.
