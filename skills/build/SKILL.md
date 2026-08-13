---
name: build
description: >
  Executes a written TDD implementation plan autonomously, task by task,
  marking each task as completed in plan.md. Use when the user says
  "/build spec-XXXX", "execute the plan", "implement the plan", "build story",
  or references a plan file (work/active/spec-*/plan.md).
  Do NOT use to write plans (use /plan). Do NOT use for general coding
  questions or quick fixes.
---

# build

## Overview

Load the implementation plan, review it critically, execute ALL tasks
autonomously without stopping between them, and mark each task as [X]
upon completion. Ask for review only once all tasks are complete.

**Announce at start:** "Executing plan spec-<number>."

**Core principle:** Full autonomous execution — mark progress, review at the end.

---

## Project profile (read first, always)

Before anything else, read `.agents/profile.md` (at the root of the current project): it defines the artifact
paths, the output language, the **target stack** and the **test framework** that
governs the TDD cycle (red → green → refactor). If it doesn't exist, tell the user to
create it from the template and stop.

**CRITICAL — Working directory:** before running anything, verify you are in the project's working directory (`WORKING_DIRECTORY` from the profile — absolute path). If `pwd` doesn't match `WORKING_DIRECTORY`, `cd` there before continuing.

**The literals in this document are only an example resolution**.
The real values come from the `profile.md` of the project you're working on — if they differ, the profile wins:

| In this document | Key in profile.md |
|---|---|
| `spec-<number>` | `STORY_ID_PATTERN` |
| `work/active/spec-<number>/` | `WORKDIR_ACTIVE` |
| "microservice" in the prose | `COMPONENT_TERM` (section 7) — read the term from the profile |
| `develop` | `BASE_BRANCH` |
| Jest / `*.spec.ts` | `TEST_FRAMEWORK` |
| NestJS · TypeORM · `src/modules/` | section 7 "Stack and architecture" |

---

## CRITICAL: Verify inputs

Extract the story number from user input. Then verify:

```bash
[ -f work/active/spec-<number>/plan.md ] || echo "MISSING: plan.md"
```

If missing → stop:
"I couldn't find `work/active/spec-<number>/plan.md`.
Run `/plan spec-<number>` first."

---

## CRITICAL: Never execute on main or master

Before executing Task 0, verify the current branch:

```bash
git branch --show-current
```

If the result is `main` or `master` → stop immediately:
"You're on the `main`/`master` branch. Switch to the working branch before continuing."

---

## CRITICAL: Never execute commits

Version control is managed by the user.
Never run `git add`, `git commit`, or `git push` at any point.

---

## Step 1: Review plan critically

1. Read `work/active/spec-<number>/plan.md` completely
2. Check for already completed tasks — look for [X] markers:
   - If tasks are already marked [X] → resume from the first incomplete task
   - If no tasks are marked → start from the beginning
3. **Verify traceability (Analyze gate):** read the "AC → Task traceability" table
   in the plan header and read `work/active/spec-<number>/spec.md`'s ACs.
   - Confirm every AC in `spec.md` appears in the table mapped to at least one task.
   - If an AC is missing from the table → STOP: "The plan doesn't cover AC-<N>
     (`<AC text>`). Run `/plan spec-<number>` again to regenerate it, or add the missing
     task manually before continuing." Do not silently add tasks yourself — this is a
     planning gap, not an execution decision.
4. Identify any other concerns, gaps, or blockers before starting
5. If concerns exist → raise them and wait for resolution before proceeding
6. If no concerns → create a TodoWrite with all pending tasks and proceed
7. Note which tasks (if any) are marked `[P]` and which independent group they
   belong to — used in Step 2 to batch parallel execution.

---

## Step 2: Execute ALL tasks autonomously

Execute every pending task in the plan sequentially, EXCEPT tasks marked `[P]`
(see below).

For each task:
1. Mark task as in_progress in TodoWrite
2. Follow each step exactly as written — do not skip or reorder steps
3. Run every verification specified in the plan (tests, expected outputs)
4. Upon successful completion → mark task as [X] in plan.md:
   - Find the task header: ### Task N: ...
   - Add [X] at the end: ### Task N: ... [X]
5. Mark task as completed in TodoWrite
6. Continue immediately to the next task — do not wait for user input

**Do NOT stop between tasks.**

### Executing `[P]` tasks (parallel groups)

When the next pending tasks belong to different independent `[P]` groups
(per the plan header's "Implementation groups"), execute them together:
- Issue the Edit/Write/Bash tool calls for one task from each group in the
  same response (multiple tool calls in parallel), instead of one task at a time.
- Still run each group's own test verification independently — do not skip
  a group's test because another group's test passed.
- Mark each task [X] independently as soon as its own verification passes.
- Tasks within the *same* `[P]` group still execute in written order — only
  tasks across *different* groups are batched together.
- If a `[P]` task unexpectedly touches a file already modified by a
  different group in the same batch, stop that batch and fall back to
  sequential execution for the remaining tasks — the plan's grouping was wrong.

The only valid reasons to stop mid-execution:

| Reason | Action |
|--------|--------|
| Missing dependency (package, file, class) | Stop, report exactly what is missing |
| Test fails repeatedly (more than twice) | Stop, show the error, ask for guidance |
| Instruction is ambiguous or contradictory | Stop, quote the instruction, ask for clarification |
| Plan has a critical gap that prevents starting | Stop, describe the gap, wait for resolution |

**Ask for clarification rather than guessing.**

---

## Step 3: Finalize and request review

After ALL tasks are complete:

1. Run the full test suite for each affected microservice — run the profile's
   `FULL_TEST_CMD` (section 10 — default):

```bash
cd <microservice>
npx jest --no-coverage
cd ..
```

   If `FULL_TEST_CMD` is `—` → run `MODULE_TEST_CMD` per affected module.

2. Delegate a conventions check to the `conventions-reviewer` subagent —
   it runs read-only against the diff and keeps the verbose review out of
   this conversation's context. Invoke `Agent` with:
   - `subagent_type: "conventions-reviewer"`
   - `model: "sonnet"` (pass explicitly even though the agent definition
     sets it — some Claude Code versions ignore the frontmatter `model` field)
   - A prompt naming each affected microservice, so it can run `git diff`
     against `develop` in each one

3. **Validate against the original spec:** read `work/active/spec-<number>/spec.md` again
   and build a closing checklist — one line per AC, marked against what was actually
   implemented and tested (not against what the plan intended):

   ```
   AC-1: <short text> — ✓ covered by <component-a>/.../file.spec.ts
   AC-2: <short text> — ✓ covered by <component-b>/.../file.spec.ts
   ```

   If any AC cannot be marked ✓ with a concrete test reference → mark it ✗ and
   explain why before declaring the plan complete. Do not mark an AC ✓ just
   because its task is [X] — verify the test actually exercises that AC's behavior.

4. **Generate the Postman collection** from the approved contract — never hand-write it.
   `<api-artifact>` = `docs/api.delta.yaml` if `API_CONTRACT_MODE = delta`, otherwise
   `docs/api.yaml` (profile, section 8). Run the profile's `POSTMAN_GEN_CMD`
   (section 10 — default):

```bash
npx -y openapi-to-postmanv2 -s work/active/spec-<number>/docs/<api-artifact> -o work/active/spec-<number>/docs/postman_collection.json -p
```

   Expected: `docs/postman_collection.json` created/updated.

   - If `POSTMAN_GEN_CMD` is `—` (project without this tool) → skip this step
     and suggest importing `<api-artifact>` straight into Postman; don't block the close.
   - If `<api-artifact>` does not exist (story had no new/changed endpoints) → skip this
     step silently, no Postman collection to generate.
   - If the command fails because the package isn't available via `npx`, try installing
     it once (`npm i -g openapi-to-postmanv2`) and retry. If it still fails, report:
     "I couldn't generate the Postman collection automatically (<error>). You can import
     `<api-artifact>` straight into Postman as an alternative." — do not block the rest
     of the completion flow on this.

5. Show a completion summary:
   - Tasks completed (with a count)
   - Files created (list of paths)
   - Files modified (list of paths)
   - Test results per microservice
   - AC validation checklist (step 3)
   - Postman collection generated at `docs/postman_collection.json` (or why it was skipped)
   - The subagent's conventions findings (if any)

6. Say (include the next-step suggestion in the same summary):
   "All tasks completed. Review the changes and tell me if anything needs adjusting.
   Once they're OK, the next step is `/sync spec-<number>` to close out the module's
   documentation (and then `/commit spec-<number>` for the commits and the PR)."

7. Stop — do not proceed further until the user responds.

8. When the user approves the changes, reaffirm the closing step:
   "Run `/sync spec-<number>` to reconcile the module's documentation; the git close-out
   (commits + PR) is left to `/commit spec-<number>`, after `/sync`."

> If a defect later appears in this code and it originates in an ambiguity or gap in
> `spec.md`, don't reopen this skill or regenerate the plan — use
> `/hotfix spec-<number>`.

---

## Resuming interrupted execution

If the session was interrupted mid-execution, consult `references/resume-guide.md`
for the full resume procedure.

Quick summary:
1. Read plan.md — find all tasks marked `[X]`
2. Report: "I found N tasks already completed. Resuming from Task M."
3. Verify the last `[X]` task produced its expected output
4. Continue from the first task NOT marked `[X]`
5. Do not re-execute completed tasks

---

## Common Issues

| Issue | Cause | Resolution |
|-------|-------|------------|
| Test fails on first run | Implementation has a bug | Read the error carefully, fix the implementation |
| Test fails repeatedly | Test setup incorrect | Stop and ask — do not guess |
| File already exists | Plan re-executed | Check if content is correct, overwrite only if needed |
| Module not found in imports | Barrel export missing | Add export to index.ts before continuing |
| Branch is main/master | User forgot to switch | Stop immediately, ask for correct branch |
| Use case not injected | Module registration missing | Check module.ts providers array |
| An AC with no task in the traceability table | `/plan` produced the plan before this change, or PHASE 3.5 was skipped | STOP at Step 1.3, ask for the plan to be regenerated with `/plan spec-<number>` |
| A `[P]` task modifies a file another group already touched | Wrong grouping in `/plan` | Abort the parallel batch, continue the rest sequentially |
| `openapi-to-postmanv2` unavailable or `POSTMAN_GEN_CMD` is `—` | Tool not installed or project doesn't use it | Skip the step, suggest importing `<api-artifact>` straight into Postman, don't block the close |
| `<api-artifact>` doesn't exist | Story with no new/changed endpoints | Skip the Postman generation silently |

---

## Example

**Input:** `/build spec-1933`

**During execution — output per task:**

```
Executing plan spec-1933.

[Task 0] Prepare the working branch...
  ✓ git checkout -b feat/SPEC-1933-filter-zones-by-service-type
→ Marking Task 0 as [X]

[Task 1] Request and response DTOs...
  ✓ Created: catalog-ms/src/.../filter-zones-by-type.dto.ts
→ Marking Task 1 as [X]

[Task 2] Domain port...
  ✓ <MODULE_TEST_CMD> → PASS (2 tests)
→ Marking Task 2 as [X]
```

**plan.md after completing Task 1:**
```markdown
### Task 1: Request and response DTOs [X]
```

**Final output:**
> All tasks completed. Review the changes and tell me if anything needs adjusting.
> Once they're OK, the next step is `/sync spec-<number>` to close out the module's
> documentation (and then `/commit spec-<number>` for the commits and the PR).

---

## CRITICAL: Output Language

**Any note you append to `plan.md` follows `ARTIFACT_LANGUAGE`** (profile, section 5 —
falls back to `OUTPUT_LANGUAGE` if the project doesn't declare it). The `[X]` markers
and the `Task N` headings are structural — never touch their wording.

**Code comments and test names follow the code**, i.e. `IDENTIFIER_LANGUAGE`
(normally English) — they are part of the codebase, not of the artifact prose.

**Chat interaction follows the user's language** (`OUTPUT_LANGUAGE` in the profile).
The progress and summary samples in this document are written in English; render them
in the user's language when that differs.
