---
name: sdd-build
description: >
  Executes a written implementation plan autonomously, task by task — TDD by
  default, or evidence-driven when spec.md declares build_mode: evidence —
  marking each task as completed in plan.md. Use when the user says
  "/sdd-build spec-XXXX", "execute the plan", "implement the plan", "build story",
  "ejecuta el plan", "implementa la historia", "construye la historia", or
  references a plan file (work/active/spec-*/plan.md).
  Do NOT use to write plans (use /sdd-plan). Do NOT use for general coding
  questions or quick fixes.
---

# build

## Overview

Load the implementation plan, review it critically, execute ALL tasks autonomously —
in groups, without stopping between them — and mark each task `[X]` as its group goes
green. Ask for review only once all tasks are complete.

**Announce at start:** "Executing plan spec-<number>."

**Core principle:** Full autonomous execution — mark progress, review at the end. The
plan fixes each task's contract and cases; the code that satisfies them is written
here, not transcribed from the plan.

**Two carriles.** `spec.md`'s front matter declares the story's `build_mode` (absent
means `tdd`). It changes exactly two things here: which port verifies a task
(`TESTS.module` in `tdd`, `VERIFY.run` in `evidence`) and what a `## AC Coverage`
line points at (a test, or the command that proves the deliverable). The plan itself
already carries the right cycle in each task — written by `/sdd-plan` for that carril —
so execution follows the task text as always. Everything else is identical: the
traceability gate, the four valid reasons to stop, the `[P]` groups, and the rule
that a `✗` is an unfinished build.

---

## Project profile (read first, always)

Read `.agents/profile.yaml` at the root of the current project before anything else.
If it doesn't exist, tell the user to run `/sdd-bootstrap` and stop — without a profile you
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

The working branch exists before `/sdd-build` starts: `/sdd-prepare` created it and checked it
out, and `Task 0` (the plan's first task) only verifies it. So there is no legitimate
reading of being on the base branch at build time — the gate is strict. Task 0 still
runs (Step 2 re-checks against it), but it cannot rescue you from the base: if you
arrive on `main`/`master`/`BASE_BRANCH`, the fix is `/prepare spec-<number>`, not the
plan.

**Produces** — this is what `/sdd-sync` looks for

- `plan.md` with every task marked `[X]`
- an `## AC Coverage` section appended to `plan.md` (Step 3.4), one line per AC,
  zero lines marked `✗`
- a green test suite for every affected <component>

**Writes** — nothing outside this list

- the project's source and test files, as the plan's tasks dictate
- `work/active/spec-<number>/plan.md` — task markers and `## AC Coverage`
- `work/active/spec-<number>/docs/postman_collection.json`

Not `spec.md`, `context.md` or `design.md` (that's `/sdd-refine`), and not the
unit's living docs under `<unit>/docs/` (that's `/sdd-sync`).

**Never** — regardless of what a task appears to need

- `git add`, `git commit`, `git push`, or any other state-changing git command.
  Version control is managed by the user.

**Escalates** — the four valid reasons to stop mid-execution are the table in
Step 2. There is no fifth.

**Degrades** — `TESTS.full` unbound → `TESTS.module` per affected module, which
covers the same ground in more runs; `VERIFY.full` unbound → `VERIFY.run` per
deliverable; `API_CLIENT_EXPORT` unbound → skip and note it, never block the close.
The per-task port is **not** degradable in either carril: without `TESTS.module`
there is no TDD cycle, and without `VERIFY.run` there is no evidence — Step 2 stops
in both cases rather than executing tasks it cannot verify.

**Reverting** — this skill writes more than any other in the pipeline, and none of it
is committed: the source and test files it creates or edits, and `plan.md`'s markers.

| What | How it comes back |
|---|---|
| Source and test files | `git checkout -- <path>` for a tracked file; a file **created** by a task is untracked, so git will not restore it — deleting it is the only undo, and only if you know it was this run's |
| `plan.md`'s `[X]` markers and `## AC Coverage` | Re-running `/sdd-build` does not clear them: it resumes at the first unchecked task (see "Resuming interrupted execution"). Clearing them by hand is what makes a full re-run possible |

The safety net is the working branch itself: `/sdd-prepare` cut it off a fresh
`BASE_BRANCH`, so `git diff BASE_BRANCH...HEAD` shows everything this story added and
`git checkout BASE_BRANCH -- <path>` restores any single file to its pre-story state.

**Ports** — `TESTS` (`module` on every red-green-refactor turn, `full` at Step 3.1)
in the `tdd` carril; `VERIFY` (`run` per task, `full` at Step 3.1) in `evidence`;
`API_CLIENT_EXPORT` (Step 3.5) in both. This skill names capabilities, never tools:
which command implements each one is the profile's `ports` block.

**Profile keys**

- `STORY_ID_PATTERN`, `WORKDIR_ACTIVE` — the story's id and workspace, written
  throughout this document as `spec-<number>` and `work/active/spec-<number>/`
- `WORKING_DIRECTORY`, `BASE_BRANCH` — the location and branch gates in `Requires`
- `DOCS_ARCHITECTURE` — the conventions and testing docs handed to each
  `sdd-code-implementer` subagent (Step 2, `[P]` groups)
- `TEST_FRAMEWORK` — the shape of the test files this stack expects (`tdd` carril)
- `API_CONTRACT_MODE` — which contract artifact feeds the client collection (Step 3.5)
- `COMPONENT_TERM` and the stack block — the term for a deployable unit, and the stack
- `ARTIFACT_LANGUAGE`, `OUTPUT_LANGUAGE`, `IDENTIFIER_LANGUAGE` — see "Output language"

---

## Step 1: Review plan critically

0. Read `spec.md`'s front matter and note the `build_mode` (absent → `tdd`). It tells
   you which port each task's verification step calls, and what Step 3.4 must point
   at. Don't re-litigate it: `/sdd-clarify` decided it and `/sdd-plan` re-checked its
   guardrail — if the plan you are about to run contradicts the field, that is a
   critical gap (Step 2's table), not something to resolve by picking one.
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

Tasks run in **groups**, never one at a time: the `[P]` groups the plan header names,
plus one implicit group holding every remaining task in written order. Task 0 is its
own group and always runs first, alone.

For each group:

1. Mark its tasks in_progress in TodoWrite.
2. **Write every test in the group first** — each task's `Cases` as failing tests,
   against the `Contract` it fixes (signatures, injected ports, error classes, field
   names). The bodies are yours to write; the names and the cases are not.
3. **One red run** covering the group. Every new test must fail, and fail for the
   right reason — a test that passes before its code exists is testing nothing.
4. Implement the tasks in written order, running that task's `Verify` command as each
   one goes green.
5. Mark the group's tasks `[X]` in plan.md — one edit, all of them, once the group is
   green. Find each `### Task N: ...` header and append ` [X]`.
6. Mark them completed in TodoWrite and start the next group immediately.

**Do NOT stop between tasks or between groups.** A one-task group is simply this cycle
with one test file in it.

A test run costs the same whether it checks one spec or five, so the red step is paid
once per group instead of once per task: five slices close in six runs this way and
eleven the other. What the red run proves — that the tests are real — it proves for all
of them at once.

**What the code may not carry.** A task cites the AC it satisfies, because a plan
is traceable by design. The code is not: never write `AC-3`, `spec-<number>` or
`Task 7` into a comment, a test name or a TODO. The traceability lives in
`plan.md`'s `### AC → Task traceability` table and in `## AC Coverage`, both of
which stay with the story; the code outlives the workspace `/sdd-sync` archives, so
the citation becomes a pointer nobody can follow — and a stale one, since
`/sdd-refine` renumbers ACs and `/sdd-hotfix` adds them. Write the rule the AC asked for
("settled entries only"), not its number. Comment only what the code cannot say
about itself, on the structure and never on a single property — a field that needs
a sentence beside it needs a better name — and follow `IDENTIFIER_LANGUAGE` for
comments and test names, like any other symbol. Full rule: the `design-principles`
skill, § "Comments".

In `build_mode: evidence` the group's cycle runs forward instead of red-first: run the
group's **baselines** once before touching anything, then apply each task's change and
run its `VERIFY` command against the **verbatim** expected output the plan wrote down.
Two rules carry the weight TDD's red step normally carries, and neither is optional:

- Tasks that modify something already covered must show their check green *before* the
  change. A baseline that starts red is a stop, not a task to push through — you cannot
  attribute a later red to your work. A task creating a new file has nothing to
  baseline; skip it there.
- Matching the expected output means matching it. A command that "ran fine" but
  printed something the plan didn't predict is a failed verification, and it goes to
  the same table below as a failing test.

**Right after `Task 0`** (working-branch verification), and before touching any source
file, re-run `git branch --show-current` in each affected <component>. If it is still
`main`, `master` or `BASE_BRANCH`, the working branch isn't checked out — stop and
report it instead of writing code onto the base branch. This is the second half of the
`Requires` branch row: Task 0 confirms what `/sdd-prepare` set up, and closes the gate.

### Executing `[P]` tasks (parallel groups)

When the next pending tasks belong to different independent `[P]` groups
(per the plan header's "Implementation groups"), execute the groups
concurrently, one `sdd-code-implementer` subagent per group:

1. **Task 0 always runs alone first.** Branch preparation is sequential; no
   group subagent is launched until Task 0 is `[X]` and the re-check in the
   "Right after `Task 0`" note above has passed.

2. **One subagent per group, launched in the same response.** For each group,
   extract from plan.md the complete text of every pending task in that group
   (all `[P]` tasks, in written order) plus the group's <component>. Then issue
   the subagent invocations for all groups in one message (parallel calls, one
   per group) using the dedicated `sdd-code-implementer` subagent — the same agent
   in both opencode (`subagent_type: "sdd-code-implementer"`) and Claude Code. Give
   each subagent a self-contained prompt containing:
   - the story id and the absolute path to `work/active/spec-<number>/`
   - the group's <component> and the full text of its pending tasks, verbatim —
     each one fixes what may not be invented (paths, signatures, ports, error
     classes, field names, cases, expected outputs) and leaves the bodies open
   - the story's build mode and the resolved verification command for the group:
     the `TESTS.module` port in `tdd`, the `VERIFY.run` port in `evidence`
   - the conventions to respect: `.agents/profile.yaml`, plus the conventions and
     testing docs **resolved from `DOCS_ARCHITECTURE`** and passed as real paths
     (e.g. `docs/architecture/conventions.md`) — the subagent starts cold and cannot
     resolve a profile key you only named
   - the **resolved** `IDENTIFIER_LANGUAGE` (profile, language block), stated as a
     value and not as a key name — it governs the identifiers, comments and test
     names the subagent writes, and a subagent that has to guess it writes the
     language of its own prompt instead
   The `sdd-code-implementer` subagent's own prompt already encodes the execution
   contract (TDD red→green, stop at first failure, own-files-only, never touch
   plan.md) and its structured report format — do not repeat it, just supply the
   inputs above and read the report it returns.

3. **Collect, then gate once.** When a subagent returns:
   - a subagent reporting a failure, or a verification it could not turn green, is
     never accepted: inspect the reported error, fix it, and re-run that group's
     command before continuing
   - a subagent reporting green is taken at its word **here** and gated at Step 3.1,
     where `TESTS.full` re-runs everything every group wrote in a single pass.
     Re-running each group's own suite now, minutes before running its superset, buys
     no coverage
   - if `TESTS.full` is unbound — Step 3.1 degrades to `TESTS.module` per module, so
     there is no superset run — re-run each group's command yourself as it returns
   - mark the group's tasks `[X]` in plan.md (the subagent never writes plan.md, so
     concurrent `[X]` edits are impossible)

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
| Test — or a `VERIFY` check — fails repeatedly (more than twice) | Stop, show the error, ask for guidance |
| Instruction is ambiguous or contradictory | Stop, quote the instruction, ask for clarification |
| Plan has a critical gap that prevents starting | Stop, describe the gap, wait for resolution |

**Ask for clarification rather than guessing.**

---

## Step 3: Finalize and request review

After ALL tasks are complete.

**Steps 1-3 are one batch, issued in a single response.** The suite, the provenance
check and the conventions review read the same finished tree and none of them feeds
another, so waiting for each in turn spends three round-trips on one answer. Launch
them together and read the three results as they land.

1. Call the `TESTS.full` port once per affected <component>, passing it as
   `<component>` — from that component's directory, returning to the working
   directory afterwards.

   If the port is unbound → call `TESTS.module` per affected module instead.

   In `build_mode: evidence` this is `VERIFY.full` instead, with `VERIFY.run` per
   deliverable as the fallback when `full` is unbound.

2. **Check that the code carries no reference to the story** — one command:

   ```bash
   node ~/.agents/scripts/validate-code-provenance.mjs
   ```

   It reads the added lines of `BASE_BRANCH...HEAD` (the profile's, resolved by the
   script) and reports every one that cites an AC, a task, the project's own story
   id — `STORY_ID_PATTERN`, so `HU-1234` is caught in a project that numbers its work
   that way — or a `work/` path. `plan.md` and the docs are exempt: that is where the
   traceability belongs. Exit `0` is clean; exit `1` lists file, line and match.

   Fix each hit by stating the RULE instead of the number, then re-run. The one
   exception is a project whose **domain** is tasks or specs, where `Task 3` can be
   genuine content — say so in the close-out rather than rewording the domain.

   The same command also prints `NOTES` for loose `//` comments on single
   properties. Those never affect the exit code and are not a gate: a field that
   needs a sentence beside it usually needs a better name, but a project that
   documents properties by standard (JSDoc/TSDoc) is following its own convention,
   which wins. Act on them where they're right, mention them in the summary, and
   never strip a project's documentation to silence them.

   This is checked rather than trusted because it is the one convention whose cost is
   invisible at the moment it is broken: the comment reads as helpful today and points
   nowhere once `/sdd-sync` archives the workspace.

3. Delegate a conventions check to the `sdd-conventions-reviewer` subagent — launched
   in the same response as steps 1 and 2, not after them. It runs read-only against the
   diff and keeps the verbose review out of this conversation's context. Invoke `Agent`
   with:
   - `subagent_type: "sdd-conventions-reviewer"`
   - `model: "sonnet"` (pass explicitly even though the agent definition
     sets it — some Claude Code versions ignore the frontmatter `model` field)
   - A prompt naming each affected microservice, so it can run `git diff`
     against `BASE_BRANCH` in each one

4. **Validate against the original spec:** read `work/active/spec-<number>/spec.md` again
   and build a closing checklist — one line per AC, marked against what was actually
   implemented and tested (not against what the plan intended). **Append it to
   `plan.md`** under an `## AC Coverage` heading, at the end of the file:

   ```markdown
   ## AC Coverage

   AC-1: <short text> — ✓ <component-a>/.../file.spec.ts::<test name>
   AC-2: <short text> — ✓ <component-b>/.../file.spec.ts::<test name>
   ```

   `## AC Coverage` is a structural heading — a contract with `/sdd-sync`, which reads it
   before closing the story. Never translate it, and write one line per AC in
   `spec.md`, no more and no fewer.

   Every line carries a concrete reference. In `build_mode: evidence` that reference
   is the **command that proves it** (in backticks) or the artifact path plus its
   validator, and the same rule applies as for a test — `validate-artifacts.mjs`
   rejects a ✓ with nothing behind it:

   ```markdown
   AC-1: <short text> — ✓ `node scripts/validate-skills.mjs` → OK: 50 profile keys, no issues.
   ```

   If an AC cannot be marked ✓ with one, mark it `✗ <reason>` — and then **stop before
   declaring the plan complete**: report the uncovered ACs and ask how to proceed. A
   `✗` is not a footnote to a finished build, it's an unfinished build. Do not mark an
   AC ✓ just because its task is [X] — verify the test (or the check) actually
   exercises that AC's behavior.

5. **Generate the Postman collection** from the approved contract — never hand-write it.
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

6. Show a completion summary:
   - Tasks completed (with a count)
   - Files created (list of paths)
   - Files modified (list of paths)
   - Test results per microservice
   - The `## AC Coverage` checklist as written into `plan.md` (step 3)
   - Postman collection generated at `docs/postman_collection.json` (or why it was skipped)
   - The subagent's conventions findings (if any)

7. Say (include the next-step suggestion in the same summary):
   "All tasks completed. Review the changes and tell me if anything needs adjusting.
   Once they're OK, the next step is `/sync spec-<number>` to close out the module's
   documentation (and then `/commit spec-<number>` for the commits and the PR)."

8. Stop — do not proceed further until the user responds.

9. When the user approves the changes, reaffirm the closing step:
   "Run `/sync spec-<number>` to reconcile the module's documentation; the git close-out
   (commits + PR) is left to `/commit spec-<number>`, after `/sdd-sync`."

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
| An AC with no task in the traceability table | `/sdd-plan` produced the plan before this change, or PHASE 3.5 was skipped | STOP at Step 1.3, ask for the plan to be regenerated with `/plan spec-<number>` |
| An AC ends up `✗` in `## AC Coverage` | The tasks are done but no test exercises that AC's behavior | STOP at Step 3.4 — report the uncovered ACs and ask; `/sdd-sync` will refuse to close the story anyway |
| An `evidence` task's baseline run starts red | The deliverable was already broken before this task | Stop: a later green would prove nothing. Report it — fixing the pre-existing break is its own decision |
| A `VERIFY` command exits 0 but prints something the plan didn't predict | The check is weaker than the plan assumed, or the expected output is stale | Treat it as a failed verification. Do not mark `[X]` on a check whose output you cannot match |
| `plan.md` is written in the other carril than `spec.md` declares | The mode changed after the plan was written | Critical gap: stop at Step 1 and ask for `/plan spec-<number>` to be regenerated. Never reconcile it by choosing one yourself |
| A `[P]` group's subagent modifies a file another group already touched | Wrong grouping in `/sdd-plan` | Stop the parallel batch, resolve the conflict, continue the remaining groups sequentially |
| A `[P]` group's subagent fails or its verification is red | A bug in that group's code, or a test/instructions gap | Inspect the reported error, fix it, re-run that group's verification before marking `[X]`; never accept a subagent's word without re-running its tests |
| `API_CLIENT_EXPORT` unbound, or its adapter unavailable | Tool not installed or project doesn't use it | Skip the step, suggest importing `<api-artifact>` straight into Postman, don't block the close |
| `<api-artifact>` doesn't exist | Story with no new/changed endpoints | Skip the Postman generation silently |

---

## Example

**Input:** `/build spec-1933`

**During execution — output per group:**

```
Executing plan spec-1933.

[Task 0] Verify the working branch...
  ✓ on feat/SPEC-1933-filter-zones-by-service-type, clean tree
→ Marking Task 0 as [X]

[Group A: catalog-ms] Tasks 1-3
  ✓ Tests written: 3 specs, 8 cases
  ✓ <TESTS.module> → FAIL (8 failing, as expected)
  ✓ Task 1 implemented → PASS (3 tests)
  ✓ Task 2 implemented → PASS (2 tests)
  ✓ Task 3 implemented → PASS (3 tests)
→ Marking Tasks 1-3 as [X]
```

**plan.md after Group A goes green:**
```markdown
### Task 1: Filter zones by service type [P] [X]
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
(profile, language block) — they are part of the codebase, not of the artifact
prose. That key is the whole rule: this skill declares no default, so read it and
write in whatever it says, and pass it to `sdd-code-implementer` along with the tasks.
What a comment may say (only the why, and never the story's ACs) is a convention
rather than a language rule: it lives in Step 2 and in the `design-principles` skill.

**Chat interaction follows the user's language** (`OUTPUT_LANGUAGE` in the profile).
The progress and summary samples in this document are written in English; render them
in the user's language when that differs.
