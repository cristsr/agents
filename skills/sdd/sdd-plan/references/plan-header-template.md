# Plan Header Template

Every plan MUST start with this exact header structure:

```markdown
# spec-<number>: [Feature Name] — Implementation Plan

**Story:** `work/active/spec-<number>/`

**<Component>(s):** `<component-name>`  ← the term comes from `COMPONENT_TERM`

**Goal:** [One sentence describing what this builds]

**Architecture:** [2-3 sentences about the approach and the patterns used]

**Stack:** <language> · <framework> · <ORM> · <DB> · <test framework>  ← from the profile's stack block

**Implementation groups:** [Always present — it is the unit `/sdd-build` executes.
Name each group and its tasks. E.g. "Group A: Tasks 1-3, catalog-ms ∥ Group B:
Tasks 4-5, users-ms (no dependency on A)". A plan with a single group says so:
"Group A: Tasks 1-4, catalog-ms".]

### AC → Task traceability

| AC | Covered by |
|----|-----------|
| AC-1 | Task N |
| AC-2 | Task N, Task M |

### File Tree

Consolidated from every task's `**Files:**` lines — regenerate it if a task's Files
change, never hand-edit it independently of the tasks.

**<component-1>**

```
├── <component-1>/<path-1>                                    (create)
├── <component-1>/<path-2>                                    (modify)
├── <component-1>/<path-3>                                    (delete)
└── <component-1>/<path-4>                                    (test)
```

---
```

Every AC in `spec.md` must appear at least once in that table. If any is missing, add
the corresponding task before saving the plan (PHASE 3.5). That rule is for you, not
for the plan: it stays here, out of the artifact.

The File Tree is built the same way, from the same pass over every task (PHASE 3.5):
a bold `**<component>**` label followed by one fenced, tree-connector-prefixed block
— every leaf line carries the file's **complete path exactly as its task's
`**Files:**` line wrote it** (`<component>/<exact path>/<file>.<ext>`), never
abbreviated to a basename and never split across the component name and the rest of
the path. That is what keeps the section mechanically checkable: a task's path is
looked up as a plain substring of the tree, so a leaf that only carried the tail of
the path (with the component folded into a parent tree node) would never match. A
file that more than one task touches keeps a single entry, deduped by path. The four
tags — `(create)` / `(modify)` / `(delete)` / `(test)` — are fixed English words
mirroring the task template's own `Create:`/`Modify:`/`Delete:`/`Test:` labels; they
are structural, like `Task N`, and are never translated by `ARTIFACT_LANGUAGE`. Skip
a component's block entirely only if that component genuinely has no file changes.

---

## Task 0 — Always the first task after the header

Resolve the branch name before writing this task: it is recorded in
`work/active/spec-<number>/.branch`. Write it **literally** into the commands — the
plan runs without stopping, so it must not have to ask, and the artifact says which
branch it is, never who resolved it.

```markdown
### Task 0: Verify the working branch

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

- `Task 0` and the task numbering are structural — `/sdd-build` and `/sdd-hotfix` locate tasks
  by that name, always English.
- Task titles and prose: `ARTIFACT_LANGUAGE` (profile, language block — falls back to
  `OUTPUT_LANGUAGE`).
- Branch names, paths and commands: verbatim. The branch description stays English —
  it ends up in git history.
- **The artifact never names the pipeline.** This template's `<!-- -->` comments and
  `[bracketed]` notes are instructions to whoever fills it in, not content: they don't
  reach the artifact. Neither does the skill, PHASE or Step that produced a line —
  what is written down is the decision, not who made it.

---

## docs/file-tree.md — the visual companion

`work/active/spec-<number>/docs/file-tree.md`, written alongside `plan.md` from the
same PHASE 3.5 pass that consolidates the `### File Tree` block above. Same source
list, two renderings: the header's block is flat and full-path-per-leaf so the
validator can find any task's path as a plain substring; this file is a nested
directory tree — folders as parent nodes, files as their children — for a human to
skim the shape of the change at a glance. **Never parsed by the validator or by any
skill** — regenerate it whenever the header's `### File Tree` regenerates, and never
hand-edit it independently of the tasks.

Required header, to disambiguate it from the plan's own `### File Tree` section:

```markdown
# spec-<number>: File Tree (visual)

> For review only — the version `/sdd-build` and the validator check is the
> `### File Tree` section in `plan.md`. Regenerated together with it; never edited
> separately.

**<component-1>**

```
<component-1>
└── src
    └── domain
        └── <feature>
                <file-1>.ts   (create)
                <file-2>.ts   (modify)
```
```

- One `**<component>**` label per affected `<component>`, same set as the header's
  File Tree — skip a component's block only if it has no file changes.
- Tree-connector nesting (`├──`, `└──`, `│`) follows the directory structure itself,
  not a flat list of full paths: a shared folder appears once as a parent node, its
  files hang from it. This is the opposite shape from the header's block on purpose —
  that one needs every leaf to carry its complete path as a contiguous string;
  this one needs a human to recognize the folder layout.
- The same four tags — `(create)` / `(modify)` / `(delete)` / `(test)` — mark each
  file leaf, fixed English words like in the header's block.
- Because indentation carries meaning here and nowhere else in the plan's artifacts,
  formatting drift (an inconsistent connector width, a missing `│` continuation) only
  costs readability — it is never mechanically checked, so it can never fail a build.
