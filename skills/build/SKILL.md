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

Read `.agents/profile.md` at the root of the current project before anything else. If it
doesn't exist, tell the user to copy `~/.agents/sdd-profile.template.md` to
`.agents/profile.md` and stop — without a profile you don't know this project's
conventions.

Any path, branch name, command or framework shown in this document is an example
resolution; the profile's value wins. The keys this skill reads are listed under
**Profile keys** in the `Contract` below.

---

## Contract

What this skill needs, what it guarantees to the next stage, and what it may
not do. **Check every `Requires` row before any other work** — a failed
precondition stops the run at the start, not halfway through.

**Requires**

| Condition | Check | If it fails |
|---|---|---|
| You are in the project's working directory | `pwd` == `WORKING_DIRECTORY` (absolute path, from the profile) | `cd` there before running anything |
| `plan.md` exists | `[ -f work/active/spec-<number>/plan.md ]` | Stop: "I couldn't find `work/active/spec-<number>/plan.md`. Run `/plan spec-<number>` first." |
| `spec.md` exists | `[ -f work/active/spec-<number>/spec.md ]` | Stop: "I couldn't find `work/active/spec-<number>/spec.md`. Without the ACs there is nothing to validate the build against." |
| Not on a base branch | `git branch --show-current` ∉ {`main`, `master`, `BASE_BRANCH`} | Stop: "You're on `<branch>`, a base branch. Switch to the working branch before continuing." |
| Every AC maps to a task | the plan's "AC → Task traceability" table covers every AC in `spec.md` | Stop — see Step 1.3 |

**Produces** — this is what `/sync` looks for

- `plan.md` with every task marked `[X]`
- an `## AC Coverage` section appended to `plan.md` (Step 3.3), one line per AC,
  zero lines marked `✗`
- a green test suite for every affected <component>

**Writes** — nothing outside this list

- the project's source and test files, as the plan's tasks dictate
- `work/active/spec-<number>/plan.md` — task markers and `## AC Coverage`
- `work/active/spec-<number>/docs/postman_collection.json`

Not `spec.md`, `context.md` or `design.md` (that's `/refine`), and not the
unit's living docs under `<unit>/docs/` (that's `/sync`).

**Never** — regardless of what a task appears to need

- `git add`, `git commit`, `git push`, or any other state-changing git command.
  Version control is managed by the user.

**Escalates** — the four valid reasons to stop mid-execution are the table in
Step 2. There is no fifth.

**Degrades** — `FULL_TEST_CMD` at `—` → `MODULE_TEST_CMD` per module;
`POSTMAN_GEN_CMD` at `—` or unavailable → skip and note it, never block the close.

**Profile keys**

- `STORY_ID_PATTERN`, `WORKDIR_ACTIVE` — the story's id and workspace, written
  throughout this document as `spec-<number>` and `work/active/spec-<number>/`
- `WORKING_DIRECTORY`, `BASE_BRANCH` — the location and branch gates in `Requires`
- `TEST_FRAMEWORK`, `MODULE_TEST_CMD`, `FULL_TEST_CMD` — the TDD cycle and the
  closing suite
- `POSTMAN_GEN_CMD`, `API_CONTRACT_MODE` — the Postman collection (Step 3.4)
- `COMPONENT_TERM` and section 7 — the term for a deployable unit, and the stack
- `ARTIFACT_LANGUAGE`, `OUTPUT_LANGUAGE`, `IDENTIFIER_LANGUAGE` — see "Output language"

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

1. Run `FULL_TEST_CMD` (profile, section 10) once per affected <component> — from that
   component's directory, returning to the working directory afterwards. A typical
   resolution is `npx jest --no-coverage`, but run whatever the profile declares.

   If `FULL_TEST_CMD` is `—` → run `MODULE_TEST_CMD` per affected module instead.

2. Delegate a conventions check to the `conventions-reviewer` subagent —
   it runs read-only against the diff and keeps the verbose review out of
   this conversation's context. Invoke `Agent` with:
   - `subagent_type: "conventions-reviewer"`
   - `model: "sonnet"` (pass explicitly even though the agent definition
     sets it — some Claude Code versions ignore the frontmatter `model` field)
   - A prompt naming each affected microservice, so it can run `git diff`
     against `BASE_BRANCH` in each one

3. **Validate against the original spec:** read `work/active/spec-<number>/spec.md` again
   and build a closing checklist — one line per AC, marked against what was actually
   implemented and tested (not against what the plan intended). **Append it to
   `plan.md`** under an `## AC Coverage` heading, at the end of the file:

   ```markdown
   ## AC Coverage

   AC-1: <short text> — ✓ <component-a>/.../file.spec.ts::<test name>
   AC-2: <short text> — ✓ <component-b>/.../file.spec.ts::<test name>
   ```

   `## AC Coverage` is a structural heading — a contract with `/sync`, which reads it
   before closing the story. Never translate it, and write one line per AC in
   `spec.md`, no more and no fewer.

   Every line carries a concrete test reference. If an AC cannot be marked ✓ with one,
   mark it `✗ <reason>` — and then **stop before declaring the plan complete**: report
   the uncovered ACs and ask how to proceed. A `✗` is not a footnote to a finished
   build, it's an unfinished build. Do not mark an AC ✓ just because its task is [X] —
   verify the test actually exercises that AC's behavior.

4. **Generate the Postman collection** from the approved contract — never hand-write it.
   `<api-artifact>` = `docs/api.delta.yaml` if `API_CONTRACT_MODE = delta`, otherwise
   `docs/api.yaml` (profile, section 8). Run `POSTMAN_GEN_CMD` (section 10) with
   `docs/<api-artifact>` as input and `docs/postman_collection.json` as output, both
   under the story's workspace. A typical resolution is
   `npx -y openapi-to-postmanv2 -s <input> -o <output> -p`.

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
   - The `## AC Coverage` checklist as written into `plan.md` (step 3)
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
| An AC ends up `✗` in `## AC Coverage` | The tasks are done but no test exercises that AC's behavior | STOP at Step 3.3 — report the uncovered ACs and ask; `/sync` will refuse to close the story anyway |
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

## Output language

**Any note you append to `plan.md` follows `ARTIFACT_LANGUAGE`** (profile, section 5 —
falls back to `OUTPUT_LANGUAGE` if the project doesn't declare it). The `[X]` markers,
the `Task N` headings and the `## AC Coverage` heading are structural — never touch
their wording.

**Code comments and test names follow the code**, i.e. `IDENTIFIER_LANGUAGE`
(normally English) — they are part of the codebase, not of the artifact prose.

**Chat interaction follows the user's language** (`OUTPUT_LANGUAGE` in the profile).
The progress and summary samples in this document are written in English; render them
in the user's language when that differs.
