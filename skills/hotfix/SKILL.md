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

## Project profile (read first, always)

Read `.agents/profile.md` at the root of the current project before anything else. If it
doesn't exist, tell the user to copy `~/.agents/sdd-profile.template.md` to
`.agents/profile.md` and stop — without a profile you don't know this project's
conventions. Then verify `pwd` matches `WORKING_DIRECTORY` (absolute path) and `cd`
there if it doesn't, before running any command.

**The literals in this document are only an example resolution.** The real values come
from the project's `profile.md`; if they differ, the profile wins:

| In this document | Key in profile.md |
|---|---|
| `spec-<number>` | `STORY_ID_PATTERN` |
| `work/active/spec-<number>/` | `WORKDIR_ACTIVE` |
| "microservice" in the prose | `COMPONENT_TERM` (section 7) — read the term from the profile |
| Jest / `*.spec.ts` | `TEST_FRAMEWORK` |
| NestJS · TypeORM | section 7 "Stack and architecture" |

---

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
4. Updates the AC → Task traceability

**Announce at start:** "Applying a hotfix on spec-<number>."

**Output:** `spec.md` (AC corrected/added + a `## Hotfixes` section),
`plan.md` (HOTFIX-N task appended and marked `[X]`), corrected code.

---

## CRITICAL: Verify this is actually a post-build case

```bash
[ -f work/active/spec-<number>/plan.md ] || echo "MISSING: plan.md"
grep -c '\[X\]' work/active/spec-<number>/plan.md 2>/dev/null || echo 0
```

- If `plan.md` doesn't exist → STOP:
  "Nothing has been built for spec-<number> yet. Use `/refine` to correct the relevant
  artifact and continue with `/plan` and `/build` normally — `/hotfix` is only for
  post-build defects."

- If `plan.md` exists but has NO `[X]` task → STOP:
  "The plan hasn't been executed yet (`/build` ran no tasks). Fix it with `/refine`
  and follow the normal flow — no `/hotfix` needed yet."

---

## CRITICAL: Never execute on main or master

```bash
git branch --show-current
```

If the result is `main` or `master` → stop:
"You're on the `main`/`master` branch. Switch to the story's working branch before
continuing."

---

## CRITICAL: Never execute commits

Never run `git add`, `git commit`, or `git push`. Version control is managed by the
user.

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

If the missing AC implies a new microservice, a new endpoint, or a new table — that's
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
   affected microservice.
4. If the AC is new (no prior tasks): the file to modify is the one that already
   implements the closest related behavior — identify it by reading the affected
   microservice's code.

---

## PHASE 4: Append the hotfix task to plan.md

Append to the end of `plan.md`, under a `## Hotfixes` header (create it if it doesn't
exist), a task with the same structure `docs/architecture` already defines for normal
tasks — consult `<STACK_REFS>/references/task-structure-template.md` (default: the
local `../plan/references/task-structure-template.md` — generic) — but numbered
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

Same TDD discipline as `/build` Step 2, but scoped to this single task:
1. Mark in_progress (TodoWrite optional for a single task)
2. Regression test → confirm it fails → implement the minimum fix →
   confirm it passes
3. Mark `### Task HOTFIX-N: ... [X]` in `plan.md`
4. Run the affected module's full suite — the profile's `MODULE_TEST_CMD`
   (section 10 — default):

```bash
cd <microservice>
npx jest src/modules/<module>/ --no-coverage
cd ..
```

Expected: PASS — including the new regression test and all existing ones (verify the
fix didn't break anything that was already passing).

---

## PHASE 6: Coherence check + close

1. If the defect also means `<api-artifact>` (the contract: `api.delta.yaml` or
   `api.yaml` per `API_CONTRACT_MODE`), `docs/diagram.md` or `docs/data-model.md` are
   now misaligned (e.g. the corrected AC changes a response code or a contract field)
   → warn, do NOT correct them automatically:
   > "⚠️ This fix also affects the contract. Run `/refine api spec-<number>`
   > (or `diagram`/`data-model` as appropriate) to keep it aligned."

2. Delegate a conventions check to the `conventions-reviewer` subagent over this
   single task's diff (same pattern as `/build` Step 3.2).

3. Show a summary:
   - AC corrected/added
   - Files modified
   - Test results for the affected module
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
| The fix requires touching `api.yaml`/`diagram.md`/`data-model.md` | The gap was contractual, not just wording | Warn at close, don't correct automatically — use `/refine` for those files |
| The module's tests fail after the fix | The fix broke behavior already covered | Don't mark `[X]`, adjust the fix until the whole suite passes |

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
7. PHASE 5: test fails (returns 404) → fixes the controller → test passes. Full module suite: PASS.
8. PHASE 6: status 200 was already documented in `api.yaml`, only the code didn't honor it — no contract impact. Closes with:
   > "Hotfix applied. `spec.md` and `plan.md` updated with HOTFIX-1. Review the changes and tell me if anything needs adjusting."

---

## CRITICAL: Output Language

**Artifact prose follows `ARTIFACT_LANGUAGE`** (profile, section 5 — falls back to
`OUTPUT_LANGUAGE` if the project doesn't declare it): the corrected AC, the body of
the `## Hotfixes` entry and the steps of the `Task HOTFIX-N` block. Match the language
the item's artifacts are already written in; never translate them.

`## Hotfixes` and `Task HOTFIX-N` are structural names — always English, as are paths,
classes and any other identifier (`IDENTIFIER_LANGUAGE`).

**Chat interaction follows the user's language** (`OUTPUT_LANGUAGE` in the profile).
The message samples in this document are written in English; render them in the
user's language when that differs.
