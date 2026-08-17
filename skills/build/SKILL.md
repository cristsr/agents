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
| Not on a base branch | `git branch --show-current` ∉ {`main`, `master`, `BASE_BRANCH`} | Stop: "You're on `<branch>`, a base branch. Run `/prepare spec-<number>` first — it creates and checks out the working branch that Task 0 verifies." |
| Every AC maps to a task | the plan's "AC → Task traceability" table covers every AC in `spec.md` | Stop — see Step 1.3 |

The working branch exists before `/build` starts: `/prepare` created it and checked it
out, and `Task 0` (the plan's first task) only verifies it. So there is no legitimate
reading of being on the base branch at build time — the gate is strict. Task 0 still
runs (Step 2 re-checks against it), but it cannot rescue you from the base: if you
arrive on `main`/`master`/`BASE_BRANCH`, the fix is `/prepare spec-<number>`, not the
plan.

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

**Degrades** — `TESTS.full` unbound → `TESTS.module` per affected module, which
covers the same ground in more runs; `API_CLIENT_EXPORT` unbound → skip and note it,
never block the close. `TESTS.module` unbound is **not** a degradation: without a way
to run tests there is no TDD cycle, and Step 2 stops.

**Ports** — `TESTS` (`module` on every red-green-refactor turn, `full` at Step 3.1)
and `API_CLIENT_EXPORT` (Step 3.4). This skill names capabilities, never tools: which
command implements each one is the profile's `ports` block.

**Profile keys**

- `STORY_ID_PATTERN`, `WORKDIR_ACTIVE` — the story's id and workspace, written
  throughout this document as `spec-<number>` and `work/active/spec-<number>/`
- `WORKING_DIRECTORY`, `BASE_BRANCH` — the location and branch gates in `Requires`
- `TEST_FRAMEWORK` — the shape of the test files this stack expects
- `API_CONTRACT_MODE` — which contract artifact feeds the client collection (Step 3.4)
- `COMPONENT_TERM` and the stack block — the term for a deployable unit, and the stack
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
   belong to — used in Step 2 to spawn one parallel subagent per group.

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

**Right after `Task 0`** (working-branch verification), and before touching any source
file, re-run `git branch --show-current` in each affected <component>. If it is still
`main`, `master` or `BASE_BRANCH`, the working branch isn't checked out — stop and
report it instead of writing code onto the base branch. This is the second half of the
`Requires` branch row: Task 0 confirms what `/prepare` set up, and closes the gate.

### Executing `[P]` tasks (parallel groups)

When the next pending tasks belong to different independent `[P]` groups
(per the plan header's "Implementation groups"), execute the groups
concurrently, one `code-implementer` subagent per group:

1. **Task 0 always runs alone first.** Branch preparation is sequential; no
   group subagent is launched until Task 0 is `[X]` and the re-check in the
   "Right after `Task 0`" note above has passed.

2. **One subagent per group, launched in the same response.** For each group,
   extract from plan.md the complete text of every pending task in that group
   (all `[P]` tasks, in written order) plus the group's <component>. Then issue
   the subagent invocations for all groups in one message (parallel calls, one
   per group) using the dedicated `code-implementer` subagent — the same agent
   in both opencode (`subagent_type: "code-implementer"`) and Claude Code. Give
   each subagent a self-contained prompt containing:
   - the story id and the absolute path to `work/active/spec-<number>/`
   - the group's <component> and the full text of its pending tasks, verbatim —
     they are self-contained (exact file paths, complete code, TDD cycle,
     expected outputs)
   - the resolved test command for the group (the profile's `TESTS.module` port)
   - the conventions to respect: `.agents/profile.yaml`,
     `docs/architecture/conventions.md`, `docs/architecture/testing.md`
   The `code-implementer` subagent's own prompt already encodes the execution
   contract (TDD red→green, stop at first failure, own-files-only, never touch
   plan.md) and its structured report format — do not repeat it, just supply the
   inputs above and read the report it returns.

3. **Collect and verify — never trust a subagent blindly.** When a subagent
   returns:
   - re-run that group's test command (port `TESTS.module`) yourself, once per
     group, and confirm it passes before accepting the group's work
   - only then mark the group's tasks `[X]` in plan.md (the subagent does not
     write plan.md, so concurrent `[X]` edits are impossible)
   - if a subagent failed or its verification is not green, do not mark `[X]`:
     inspect the reported error, fix it, and re-run before continuing

4. **Fall back to sequential.** If any subagent reports that it had to touch a
   file another group already modified, stop the parallel batch, resolve the
   conflict, and continue the remaining groups sequentially — the plan's
   grouping was wrong.

Tasks within the *same* `[P]` group still execute in written order inside that
group's subagent — only the groups themselves run concurrently, one subagent
each.

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

1. Call the `TESTS.full` port once per affected <component>, passing it as
   `<component>` — from that component's directory, returning to the working
   directory afterwards.

   If the port is unbound → call `TESTS.module` per affected module instead.

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
   `docs/api.yaml` (profile, docs block). Call the `API_CLIENT_EXPORT.run` port with
   `docs/<api-artifact>` as `<input>` and `docs/postman_collection.json` as `<output>`,
   both under the story's workspace.

   Expected: `docs/postman_collection.json` created/updated.

   - If the port is unbound (project without this capability) → skip this step
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
| A `[P]` group's subagent modifies a file another group already touched | Wrong grouping in `/plan` | Stop the parallel batch, resolve the conflict, continue the remaining groups sequentially |
| A `[P]` group's subagent fails or its verification is red | A bug in that group's code, or a test/instructions gap | Inspect the reported error, fix it, re-run that group's verification before marking `[X]`; never accept a subagent's word without re-running its tests |
| `API_CLIENT_EXPORT` unbound, or its adapter unavailable | Tool not installed or project doesn't use it | Skip the step, suggest importing `<api-artifact>` straight into Postman, don't block the close |
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
  ✓ <TESTS.module> → PASS (2 tests)
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
**Conversational output** follows `~/.agents/references/chat-conventions.md` - the six blocks (announce, progress, question, summary, stop, handoff).

**Any note you append to `plan.md` follows `ARTIFACT_LANGUAGE`** (profile, language block —
falls back to `OUTPUT_LANGUAGE` if the project doesn't declare it). The `[X]` markers,
the `Task N` headings and the `## AC Coverage` heading are structural — never touch
their wording.

**Code comments and test names follow the code**, i.e. `IDENTIFIER_LANGUAGE`
(normally English) — they are part of the codebase, not of the artifact prose.

**Chat interaction follows the user's language** (`OUTPUT_LANGUAGE` in the profile).
The progress and summary samples in this document are written in English; render them
in the user's language when that differs.
