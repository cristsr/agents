# Plan Header Template

Every plan MUST start with this exact header structure:

```markdown
# spec-<number>: [Feature Name] — Implementation Plan

**Story:** `work/active/spec-<number>/`
**Microservice(s):** `<service-name>`
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

> When executing this plan, ask the user for the branch name before continuing.

**Ask:** "What's the branch name? (e.g. feat/<story-key>-description or fix/<story-key>-description,
where `<story-key>` follows `STORY_KEY_PATTERN` from the profile)"

**Steps:**

**Step 1: Verify the base is fresh (read-only)**

```bash
git -C <microservice> branch --show-current   # expected: develop
git -C <microservice> status --porcelain      # expected: empty (clean working tree)
```
Expected: on `develop`, up to date and with no uncommitted changes. Preparing the base
(`checkout develop` + `pull`) is `/prepare`'s job, not this plan's. If it isn't on an
up-to-date `develop` or the working tree is dirty → stop and recommend
`/prepare <microservice>` before creating the branch.

**Step 2: Create the working branch**

```bash
git -C <microservice> checkout -b <branch-name-given-by-the-user>
```
Expected: new branch created and active, starting from an up-to-date `develop`.
```

## Language rules

- `Task 0` and the task numbering are structural — `/build` and `/hotfix` locate tasks
  by that name, always English.
- Task titles and prose: `ARTIFACT_LANGUAGE` (profile, section 5 — falls back to
  `OUTPUT_LANGUAGE`).
- Branch names, paths and commands: verbatim. The branch description stays English —
  it ends up in git history.
