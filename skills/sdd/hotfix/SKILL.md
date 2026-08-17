---
name: hotfix
description: >
  Fixes a post-build defect that originated from an ambiguity or a
  clarification gap in spec.md — corrects or adds the affected AC and applies
  the fix as a single targeted task on plan.md and the already-built code,
  without regenerating the full plan or re-running /build from scratch.
  Use when the user says "/hotfix spec-XXXX", "this came out wrong because it
  wasn't clarified properly", "there's a post-build bug from an ambiguous AC",
  "I need to fix something that's already been built", "I found a case that
  wasn't covered", or reports a defect in already-built code that traces back
  to a missing/ambiguous AC.
  Do NOT use for artifacts that haven't been built yet (use /refine).
  Do NOT use for defects unrelated to spec ambiguity — fix those directly
  in the code without going through this flow.
---

# hotfix

## Overview

Bridge between `/refine` (which corrects artifacts) and `/build` (which executes
plans) for a specific case: **the code already exists**, `plan.md` already has `[X]`
tasks, and the defect is due to `spec.md` not having clarified an AC properly (or
missing one entirely).

Instead of re-running `/plan` (which would regenerate the whole plan, losing the
existing `[X]`s) or `/refine` (which touches neither code nor plan.md), this skill:
1. Corrects/adds the AC in `spec.md`
2. Appends ONE targeted `Task HOTFIX-N` to the end of `plan.md`
3. Executes only that task, with TDD discipline
4. Updates the AC → Task traceability and the plan's `## AC Coverage`

**Announce at start:** "Applying a hotfix on spec-<number>."

---

## Project profile (read first, always)

Read `.agents/profile.yaml` at the root of the current project before anything else.
If it doesn't exist, tell the user to run `/bootstrap` and stop — without a profile you
don't know this project's conventions. The file is a YAML map of named blocks; a key
holding `null` is not configured, so use the fallback this skill declares for it —
never a guessed value.

Tools come from the profile's `ports` block: this skill names the capability it
needs — a port — and the block says which command, agent or MCP tool provides it
here. Run the first adapter that resolves; when one resolves and then fails, report
that failure instead of trying the next. A port with no usable adapter is **unbound**
— see the `Degrades` row below.

Any path, branch name or command shown in this document is an example resolution; the
profile's value wins. The keys this skill reads are listed under **Profile keys** in
the `Contract` below.

---

## Contract

What this skill needs, what it leaves behind, and what it may not do. **Check every
`Requires` row before PHASE 1** — a hotfix on a story that was never built, or that is
already closed, is the wrong tool, and the cost of finding out afterwards is an edited
`spec.md`.

`<flow-artifact>` = `docs/diagram.md` if `DESIGN_OUTPUT_MODE = full` (the default), or
`docs/flows/*.md` if `full-flow`. `<api-artifact>` = `docs/api.delta.yaml` if
`API_CONTRACT_MODE = delta` (the default), otherwise `docs/api.yaml`. Both are read
only for the coherence warning in PHASE 6.

**Requires**

| Condition | Check | If it fails |
|---|---|---|
| You are in the project's working directory | `pwd` == `WORKING_DIRECTORY` (absolute path, from the profile) | `cd` there before running anything |
| The story is still open | `work/active/spec-<number>/` exists | If it's under `work/done/spec-<number>/`, `/sync` already closed and archived it: stop and ask whether to reopen the workspace (move it back) or open a new item — never hotfix inside `work/done/` |
| `spec.md` exists | `[ -f work/active/spec-<number>/spec.md ]` | Stop: there are no ACs to correct, which is the whole premise of a hotfix |
| `plan.md` exists | `[ -f work/active/spec-<number>/plan.md ]` | Stop: "Nothing has been built for spec-<number> yet. Use `/refine` to correct the relevant artifact and continue with `/plan` and `/build` normally — `/hotfix` is only for post-build defects." |
| It really is post-build | `grep -c '\[X\]' work/active/spec-<number>/plan.md` ≥ 1 | Stop: "The plan hasn't been executed yet (`/build` ran no tasks). Fix it with `/refine` and follow the normal flow — no `/hotfix` needed yet." |
| Not on a base branch | `git branch --show-current` ∉ {`main`, `master`, `BASE_BRANCH`} | Stop: "You're on `<branch>`, a base branch. Switch to the story's working branch before continuing." |

The branch row is strict here, as in `/build`'s: the working branch is created by
`/prepare`, not by the plan — `Task 0` only verifies it — so being on the base branch
has no legitimate reading.

**Produces** — what `/sync` will read when the story closes

- `spec.md` with the AC corrected or added, and a `## Hotfixes` entry for `HOTFIX-N`
- `plan.md` with `### Task HOTFIX-N: … [X]` appended under `## Hotfixes`, the
  "AC → Task traceability" row updated, and `## AC Coverage` carrying **one line per
  AC in `spec.md`** — including the corrected or newly added one, with a concrete test
  reference and no `✗`. `/sync` gates on exactly that; a hotfix that adds an AC without
  its coverage line leaves the story unclosable
- the affected module's suite green, regression test included

**Writes** — nothing outside this list

- `work/active/spec-<number>/spec.md` — the AC and the `## Hotfixes` section only
- `work/active/spec-<number>/plan.md` — the `HOTFIX-N` task, its `[X]`, the
  traceability row and the `## AC Coverage` line
- the project's source and test files the single hotfix task names

Not `context.md`, `design.md` or anything under the story's `docs/` (that's `/refine`,
and PHASE 6 warns instead of editing), and not the unit's living docs (that's `/sync`).

**Never**

- **Allowed (read-only):** reading any project file, `git branch --show-current`,
  `git status`, `git diff`.
- **Forbidden:** `git add`, `git commit`, `git push` and any other state-changing git
  command. Version control is managed by the user.
- **Forbidden:** regenerating `plan.md`, renumbering existing tasks, or clearing
  another task's `[X]`. A hotfix only ever *appends*.
- **Forbidden:** more than one `Task HOTFIX-N` per invocation. Two defects are two
  hotfixes; a defect that needs several tasks is not a hotfix (see `Escalates`).

**Escalates**

- The gap implies a new <component>, endpoint or table (PHASE 1, size check): the story
  was badly sized — ask, and recommend `/refine` + a full `/plan` instead.
- The corrected AC contradicts another existing AC: show both, confirm before applying.
- The AC wording itself: always confirmed with `AskUserQuestion` before `spec.md` is
  touched (PHASE 1, step 4).
- The story is already archived under `work/done/` (see `Requires`).

**Degrades**

- `TESTS.module` unbound → the <component>'s full suite (`TESTS.full`).
- `STACK_REFS` unset → the local (generic) `references/` of `/spec` and `/plan` for the
  AC and task templates. When set, each `<STACK_REFS>/<file>` resolves across the listed
  packs most specific first, then to the same local `references/`.
- `conventions-reviewer` unavailable → note it in the close-out summary; never block
  the hotfix on it.

**Reverting** — both artifacts this skill overwrites are tracked by git on the story's
working branch: `git checkout -- work/active/spec-<number>/spec.md` (or `plan.md`)
restores the committed version, and the code change is the single task's diff. Before
the story's first commit there is nothing to restore.

**Profile keys**

- `STORY_ID_PATTERN`, `WORKDIR_ACTIVE`, `WORKDIR_DONE` — the story's id and workspace,
  written throughout this document as `spec-<number>` and `work/active/spec-<number>/`
- `WORKING_DIRECTORY`, `BASE_BRANCH` — the location and branch gates in `Requires`
- `TEST_FRAMEWORK` — the shape of the test files, for the TDD cycle in
  PHASE 5
- `API_CONTRACT_MODE`, `DESIGN_OUTPUT_MODE` — which contract and flow artifacts PHASE 6
  checks for misalignment
- `STACK_REFS` and the stack block (`COMPONENT_TERM`, `LANGUAGE`, `FRAMEWORK`, `ORM`,
  `MODULE_ROOT`) — the task template (resolved across the listed packs, most specific
  first, generic fallback) and the term for a deployable unit
- `STORY_ID_LEGACY_PREFIXES` — reading items created under an older id prefix
- `ARTIFACT_LANGUAGE`, `OUTPUT_LANGUAGE`, `IDENTIFIER_LANGUAGE` — see "Output language"

---

## PHASE 1: Identify the gap

1. If the user didn't describe the defect, ask:
   > "What's happening? Describe the incorrect behavior you observed."

> **Legacy items.** If the folder has an `hu.md` instead of a `spec.md`, it's the same
> artifact under its former name: work on it in place, without renaming it.

2. Read `work/active/spec-<number>/spec.md` in full — ACs, Business Rules, and the
   `## Hotfixes` section if it already exists (so `HOTFIX-N` is numbered correctly).

3. Classify the defect:
   - **Existing AC badly clarified:** there's an AC covering the area but its wording
     was ambiguous and the wrong interpretation got implemented.
   - **Missing AC:** the reported case was never described as an AC — it's an edge
     case that escaped entirely.

4. Show the relevant AC (if it exists) and the proposed correction:
   > "**Current AC-N:** '<text>' — **Proposal:** '<corrected text>'."

   If it's a missing AC, propose the new AC's text following the format in
   `../spec/references/spec-template.md` (numbered after the last one).

   Confirm with `AskUserQuestion`: `question: "Do you confirm this correction to AC-N?"`,
   `header: "AC-N"`, options `"Confirm"` / `"Adjust the text"`. If they pick
   "Adjust the text", continue in free text until you reach a confirmed wording before
   touching `spec.md`.

5. Wait for confirmation before touching `spec.md`.

### Size check (important)

If the missing AC implies a new <component>, a new endpoint, or a new table — that's
**not a hotfix**, it's a badly sized story. Use `AskUserQuestion`:
- `question`: "This exceeds a hotfix's scope (it implies <reason>). How do we proceed?"
- `header`: "Scope"
- `options`: `"Treat it as an extension of the story (Recommended)"` with
  description "Use /refine spec to add the AC and /plan to regenerate the full plan
  with the new task included" / `"Continue as a hotfix anyway"`
  with description "You accept the risk of a hotfix outside its usual scope".

If they pick the recommended option, stop and redirect — don't continue with the
hotfix flow.

---

## PHASE 2: Correct spec.md

1. Apply the AC correction/addition with Edit (same discipline as `/refine`'s Direct
   Mode — exact text, no invented scope).
2. Add an entry to `## Hotfixes` (create the section if it doesn't exist, at the end
   of the file, after `Out of Scope` if present):

```markdown
## Hotfixes

- **HOTFIX-N (AC-N):** <what was wrong or missing> → <correction applied> — implemented in `plan.md` Task HOTFIX-N.
```

`N` continues the numbering of the last existing `HOTFIX-N` in the file
(starts at 1 if it's the first).

---

## PHASE 3: Determine impact scope

1. Read the "AC → Task traceability" table in `plan.md`'s header.
2. If the AC already existed: identify which Task(s) cover it — those are the files
   most likely to be touched.
3. Read `work/active/spec-<number>/context.md` to confirm the exact file paths of the
   affected <component>.
4. If the AC is new (no prior tasks): the file to modify is the one that already
   implements the closest related behavior — identify it by reading the affected
   <component>'s code.

---

## PHASE 4: Append the hotfix task to plan.md

Append to the end of `plan.md`, under a `## Hotfixes` header (create it if it doesn't
exist), a task with the same structure `docs/architecture` already defines for normal
tasks — consult `<STACK_REFS>/references/task-structure-template.md` (if no pack in
`STACK_REFS` provides it: the local `../plan/references/task-structure-template.md` —
generic) — but numbered
`HOTFIX-N` instead of a sequential task number:

```markdown
### Task HOTFIX-N: <short description of the fix>

**Related AC:** AC-N (corrected/added in spec.md)

**Files:**
- Modify: `<component>/src/exact/path/to/file.ts:123-145`
- Test: `<component>/src/exact/path/to/file.spec.ts`

**Step 1: Write the failing regression test**
...
**Step 2: Confirm it fails**
...
**Step 3: Apply the minimum fix**
...
**Step 4: Confirm it passes**
...
```

Update the "AC → Task traceability" table in the header: add/update the affected AC's
row so it includes `Task HOTFIX-N`.

---

## PHASE 5: Execute the hotfix task

Same discipline as `/build` Step 2, in the story's own carril (`spec.md`'s
`build_mode`, absent → `tdd`), scoped to this single task:
1. Mark in_progress (TodoWrite optional for a single task)
2. **`tdd`:** regression test → confirm it fails → implement the minimum fix →
   confirm it passes.
   **`evidence`:** run the `VERIFY.run` check first and confirm it reproduces the
   defect (it is the regression test's equivalent — a check that passes on the
   broken state cannot vouch for the fix), apply the minimum fix, re-run and
   confirm the expected output.
3. Mark `### Task HOTFIX-N: ... [X]` in `plan.md`
4. Call the `TESTS.module` port for the affected module, from the <component>'s
   directory and returning to the working directory afterwards. If the port is
   unbound, call `TESTS.full` for the <component> instead. In `evidence` this is
   `VERIFY.full`, falling back to `VERIFY.run`.

Expected: PASS — including the new regression test and all existing ones (verify the
fix didn't break anything that was already passing).

5. **Update `## AC Coverage` in `plan.md`.** `/build` left one line per AC there and
   `/sync` gates on it: add the line if the AC is new, or replace it if the AC's
   wording changed, pointing at the regression test just written:

   ```markdown
   AC-N: <short text> — ✓ <component>/.../file.spec.ts::<test name>
   ```

   Same rule as `/build`: one line per AC in `spec.md`, no more and no fewer, and no
   `✗`. If the plan has no `## AC Coverage` section at all, it predates the convention
   — leave it alone rather than writing a partial one, and say so in the close-out
   summary.

---

## PHASE 6: Coherence check + close

1. If the defect also means `<api-artifact>`, `<flow-artifact>` or
   `docs/data-model.md` are now misaligned (e.g. the corrected AC changes a response
   code or a contract field) → warn, do NOT correct them automatically:
   > "⚠️ This fix also affects the contract. Run `/refine api spec-<number>`
   > (or `diagram`/`data-model` as appropriate) to keep it aligned."

2. Delegate a conventions check to the `conventions-reviewer` subagent over this
   single task's diff (same pattern as `/build` Step 3.2).

3. Show a summary:
   - AC corrected/added
   - Files modified
   - Test results for the affected module
   - The `## AC Coverage` line written (or the note that the plan has no such section)
   - Contract warnings (if any)
   - Conventions findings (if any)

4. Say:
   > "Hotfix applied. `spec.md` and `plan.md` updated with HOTFIX-N. Review the
   > changes and tell me if anything needs adjusting."

5. Stop — don't continue with further changes without confirmation.

---

## Common Issues

| Issue | Cause | Resolution |
|-------|-------|------------|
| plan.md doesn't exist | The flow never reached `/plan` | Redirect to the normal `/refine` + `/plan` + `/build` |
| plan.md with no `[X]` task | `/build` hasn't run yet | Redirect to `/refine` — no hotfix needed |
| The gap implies a new service/endpoint/table | Badly sized story, not a targeted defect | Recommend `/refine spec` + a full `/plan` instead of a hotfix |
| The corrected AC contradicts another existing AC | The original AC had a different intent than the one reported | Show both ACs, confirm with the user before applying |
| The fix requires touching the contract, the flow artifact or `data-model.md` | The gap was contractual, not just wording | Warn at close, don't correct automatically — use `/refine` for those files |
| The module's tests fail after the fix | The fix broke behavior already covered | Don't mark `[X]`, adjust the fix until the whole suite passes |
| The story is already in `work/done/` | `/sync` closed it before the defect surfaced | Ask before anything: reopen the workspace (move it back to `work/active/`) or open a new item |
| `/sync` then rejects the close for an uncovered AC | the hotfix added an AC without its `## AC Coverage` line | Add the line in PHASE 5, step 5 — one per AC, with a real test reference |

---

## Example

**Input:** `/hotfix spec-1933` — "AC-2 only said 'returns an empty list' without specifying the HTTP code, and it was implemented returning 404 — a real client expects 200 with an empty array"

**Flow:**
1. Verifies `plan.md` → exists, 6 tasks, 6 marked `[X]`. Confirms a post-build case.
2. Current branch: `feat/SPEC-1933-filter-zones-by-service-type` (not main). Continues.
3. Reads `spec.md` → AC-2: "If there are no results, it returns an empty list." — ambiguous, doesn't specify the HTTP code. Proposes:
   > "**Current AC-2:** 'If there are no results, it returns an empty list.' — **Proposal:** 'If there are no results, it returns an empty list with status 200.'"
   and calls `AskUserQuestion` (header "AC-2", options "Confirm" / "Adjust the text").
4. The user picks "Confirm". PHASE 2: edits AC-2, adds:
   ```markdown
   ## Hotfixes

   - **HOTFIX-1 (AC-2):** The AC didn't specify the HTTP code for an empty list and it was implemented as 404 → clarified that it must be 200 — implemented in `plan.md` Task HOTFIX-1.
   ```
5. PHASE 3: the AC→Task table says AC-2 → Task 3 (domain port) and Task 5 (controller). The file to touch is the controller.
6. PHASE 4: appends `### Task HOTFIX-1: Fix the response code for an empty list` with a regression test hitting the endpoint with no results and expecting `200` + `[]`. Updates AC-2's row in the traceability table to include `Task HOTFIX-1`.
7. PHASE 5: test fails (returns 404) → fixes the controller → test passes. Module suite (`TESTS.module`): PASS. Replaces AC-2's line in `## AC Coverage` so it points at the new regression test.
8. PHASE 6: status 200 was already documented in the contract, only the code didn't honor it — no contract impact. Closes with:
   > "Hotfix applied. `spec.md` and `plan.md` updated with HOTFIX-1. Review the changes and tell me if anything needs adjusting."

---

## Output language
**Conversational output** follows `~/.agents/references/chat-conventions.md` - the six blocks (announce, progress, question, summary, stop, handoff).

**Artifact prose follows `ARTIFACT_LANGUAGE`** (profile, language block — falls back to
`OUTPUT_LANGUAGE` if the project doesn't declare it): the corrected AC, the body of
the `## Hotfixes` entry and the steps of the `Task HOTFIX-N` block. Match the language
the item's artifacts are already written in; never translate them.

`## Hotfixes`, `Task HOTFIX-N` and `## AC Coverage` are structural names — always
English, as are paths, classes and any other identifier (`IDENTIFIER_LANGUAGE`).

**Chat interaction follows the user's language** (`OUTPUT_LANGUAGE` in the profile).
The message samples in this document are written in English; render them in the
user's language when that differs.
