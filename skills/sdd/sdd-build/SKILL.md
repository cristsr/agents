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

In the default `full` tier: load the implementation plan, review it critically, execute
ALL tasks autonomously — in groups, without stopping between them — and mark each task
`[X]` as its group goes green. In `standard` the same, with a plan that carries no `[P]`
groups. In `fast` there is no plan: execute the one criterion `spec.md` states, inside the
scope it declares, and close the story in that same spec. In every tier, ask for review
only once the criterion — or the last task — is green.

**Announce at start:** "Executing plan spec-<number>." — in a `fast` story, announce what it actually executes: "Executing spec-<number> — the one criterion and its check."

**Core principle:** Full autonomous execution — mark progress, review at the end. The
plan fixes each task's contract and cases; the code that satisfies them is written
here, not transcribed from the plan. Where the tier writes no plan, the criterion and
its declared check are that contract, and the same rule holds: they fix what the code
must do, never how it is written.

**Two orthogonal axes, both in `spec.md`'s front matter.** The layer above this skill
is `tier` (`fast` · `standard` · `full`, absent → `full`), and `~/.agents/contracts/TIERS.md`
is its normative contract. It answers *where the work comes from and where the story
closes*: a `full` or `standard` story is built from `plan.md` and closes in that plan's
`## AC Coverage`; a `fast` story is built from `spec.md` — one criterion and a declared
scope — and closes in `spec.md`'s own `## AC Coverage`, the section Step 3.4 appends.
Step 0 resolves the tier first for exactly that reason.

Inside either tier, **two carriles** for verification. `spec.md` also declares the
story's `build_mode` (absent means `tdd`). It changes exactly two things here: which
port verifies a criterion (`TESTS.module` in `tdd`, `VERIFY.run` in `evidence`) and what
a `## AC Coverage` line points at (a test, or the command that proves the deliverable).
A plan already carries the right cycle in each task — written by `/sdd-plan` for that
carril — so execution follows the task text as always; in `fast` there is no task text,
and the check is the one `## Change Surface` declares.

What is identical across both axes is what a build *guarantees*: the traceability gate
wherever a plan exists, the six valid reasons to stop, the `[P]` groups wherever a plan
exists to mark them, and the rule that a `✗` is an unfinished build. A tier removes
stages; it never relaxes a guarantee.

---

## Project profile (read first, always)

Read `.agents/profile.yaml` from the project root before anything else, as
`~/.agents/references/project-profile.md` describes: what a missing file means, how a
`null` key falls back, how a port resolves to an adapter, and why every path or command
shown here is only an example the profile overrides. The keys this skill reads are
listed under **Profile keys** in the `Contract` below.

---

## Contract

What this skill needs, what it guarantees to the next stage, and what it may
not do. **Check every `Requires` row before any other work** — a failed
precondition stops the run at the start, not halfway through.

**Requires**

| Condition | Check | If it fails |
|---|---|---|
| You are in the project's working directory | `pwd` == `WORKING_DIRECTORY` (absolute path, from the profile) | `cd` there before running anything |
| `spec.md` exists | `[ -f work/active/spec-<number>/spec.md ]` | Stop: "I couldn't find `work/active/spec-<number>/spec.md`. Without the ACs there is nothing to validate the build against." |
| `plan.md` exists — `full` and `standard` only | `[ -f work/active/spec-<number>/plan.md ]` | Stop: "I couldn't find `work/active/spec-<number>/plan.md`. Run `/plan spec-<number>` first." |
| Every AC maps to a task — a plan row, so it applies when a plan exists | the plan's "AC → Task traceability" table covers every AC in `spec.md` | Stop — see Step 1.5 |
| Not on a base branch | `git branch --show-current` ∉ {`main`, `master`, `BASE_BRANCH`} | Stop: "You're on `<branch>`, a base branch. Run `/prepare spec-<number>` first — it creates and checks out the working branch the build re-verifies." |

**`fast` takes `spec.md` and no plan.** That row's absence is the tier: a fast story is
the specification plus a scope contract, and the check that closes it is the one
`## Change Surface` declares. The two rows that still apply are the branch row and the
`spec.md` row; the traceability row is a plan row, so `fast` skips it with the plan.

The working branch exists before `/sdd-build` starts: `/sdd-prepare` created it and checked it
out, and `Task 0` (the plan's first task) only verifies it. So there is no legitimate
reading of being on the base branch at build time — the gate is strict. Task 0 still
runs (Step 2 re-checks against it), but it cannot rescue you from the base: if you
arrive on `main`/`master`/`BASE_BRANCH`, the fix is `/prepare spec-<number>`, not the
plan.

**`Task 0` has no counterpart in `fast`** — the task list, its markers and its grouping
are all plan concepts, and the tier writes no plan. The branch is therefore gated by this
`Requires` row alone, which is why the row stays mandatory in every tier: with no Task 0
to confirm the branch mid-flight, Step 1's own branch check is the whole gate.

**Produces** — this is what `/sdd-sync` looks for

- `full` and `standard`: `plan.md` with every task marked `[X]`
- an `## AC Coverage` section (Step 3.4), one line per AC, zero lines marked `✗` —
  appended to `plan.md` in `full` and `standard`, and to `spec.md` in `fast`
- a green test suite for every affected <component>

**Writes** — nothing outside this list

- the project's source and test files, as the plan's tasks dictate — or, in `fast`, as
  the one criterion's `## Change Surface` confines them
- `work/active/spec-<number>/plan.md` — task markers and `## AC Coverage` (`full` and
  `standard` only)
- `work/active/spec-<number>/spec.md` — the `## AC Coverage` section, and nothing else,
  and only in `fast`
- `work/active/spec-<number>/docs/postman_collection.json`

That `spec.md` entry is the single exception to "this skill never edits the
specification": it is the tier's close, the one section the tier left the build to write,
and it is written nowhere else and in no other tier. This skill never touches the front
matter — not to raise the tier, not to change `build_mode` — and never edits an AC.

Not `context.md` or `design.md` (that's `/sdd-refine`), and not the unit's living docs
under `<unit>/docs/` (that's `/sdd-sync`).

**Never** — regardless of what a task appears to need

- `git add`, `git commit`, `git push`, or any other state-changing git command.
  Version control is managed by the user.

**Escalates** — the valid reasons to stop mid-execution are the table in
Step 2. There is no seventh.

One of them belongs here as well, because it is the tier's own failure mode rather
than an execution one: **a change that reaches outside `## Change Surface`, or a second
acceptance criterion.** The tier was inferred from the input, not measured against the
repository, and the build is the first place the real surface becomes visible — so a
change that does not fit its declared scope is evidence that the tier was wrong, never a
reason to widen the scope. It is a stop: this skill may not extend `## Change Surface`,
may not add or reword an AC, and may not write `spec.md`'s front matter to raise the
tier. The way back is `/sdd-route` on the story, which raises the tier — and the passes
that tier declares then run: `/sdd-scan` and `/sdd-clarify`, then `/sdd-design` for `full`.
That is the only route from here: the front matter is not this skill's to write, and a
`fast` story cannot reach the survey that would justify a bigger tier until the tier is
raised. The Stop table in Step 2 carries the same rule in the place an executor looks
mid-run.

**Degrades** — `TESTS.full` unbound → `TESTS.module` per affected module, which
covers the same ground in more runs; `VERIFY.full` unbound → `VERIFY.run` per
deliverable; `API_CLIENT_EXPORT` unbound → skip and note it, never block the close.
The per-task port is **not** degradable in either carril: without `TESTS.module`
there is no TDD cycle, and without `VERIFY.run` there is no evidence — Step 2 stops
in both cases rather than executing tasks it cannot verify. `fast` degrades nothing
further: with no task list, `VERIFY.run` is the criterion's own check.

**Reverting** — this skill writes more than any other in the pipeline, and none of it
is committed: the source and test files it creates or edits, `plan.md`'s markers, and
in `fast` the `## AC Coverage` section it appends to `spec.md`.

| What | How it comes back |
|---|---|
| Source and test files | `git checkout -- <path>` for a tracked file; a file **created** by a task is untracked, so git will not restore it — deleting it is the only undo, and only if you know it was this run's |
| `plan.md`'s `[X]` markers and `## AC Coverage` | Re-running `/sdd-build` does not clear them: it resumes at the first unchecked task (see "Resuming interrupted execution"). Clearing them by hand is what makes a full re-run possible |
| `spec.md`'s `## AC Coverage` (`fast` only) | The same resume, one unit coarser: there are no markers to leave behind, so re-running the build re-runs the criterion and rewrites the section. `git checkout -- work/active/spec-<number>/spec.md` restores the committed version |

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
- `FAST_TIER_TYPES` — which item types may enter the `fast` tier at all (items block;
  default `[bug, debt, chore]`). Step 0 stops a `tier: fast` story whose `type` is
  outside it, and with it the one criterion, the declared surface and the check.
  `feat` is absent on purpose: a capability with one criterion is still a capability
- `STANDARD_TIER_TYPES` — the same gate one tier up (items block; default
  `[feat, bug, debt, incident, chore]`). It is read here for the same reason: a
  `tier: standard` story reports it at Step 0 rather than at the plan's first task
- `DOCS_ARCHITECTURE` — the conventions and testing docs handed to each
  `sdd-code-implementer` subagent (Step 2, `[P]` groups — a plan construct, so absent
  in `fast`)
- `TEST_FRAMEWORK` — the shape of the test files this stack expects (`tdd` carril)
- `API_CONTRACT_MODE` — which contract artifact feeds the client collection (Step 3.5)
- `COMPONENT_TERM` and the stack block — the term for a deployable unit, and the stack
- `ARTIFACT_LANGUAGE`, `OUTPUT_LANGUAGE`, `IDENTIFIER_LANGUAGE` — see "Output language"

---

## Step 0: Read both axes, and re-check the tier's guardrails

`spec.md`'s front matter carries `tier:` and `build_mode:`. Read both before anything
else, in this order, because each answers a different question about the run:

| Axis | Question | Values | Absent means | What it decides here |
|---|---|---|---|---|
| `tier` | which stages exist | `fast` · `standard` · `full` | `full` | where the tasks come from, and where the story closes |
| `build_mode` | how a criterion is verified | `tdd` · `evidence` | `tdd` | the port per criterion (`TESTS.module` / `VERIFY.run`), and what a `## AC Coverage` line points at |

1. **The tier first** — it is structural. `full` and `standard` are built from
   `plan.md` and close in that plan's `## AC Coverage`; `fast` is built from `spec.md`
   and closes in `spec.md`'s own. In `fast`, read `## Change Surface` now: it is the
   scope contract (the `**Confined to:**` paths and symbols) and the closing check (the
   `**Check:**` command), and it is what Step 1 and Step 2 enforce.

2. **Then the `build_mode`** — it is local. It tells you which port each criterion's
   verification calls, and what Step 3.4 must point at. Don't re-litigate it:
   `/sdd-route` decided it and `/sdd-plan` re-checked its guardrail — if the work you
   are about to do contradicts the field, that is a critical gap (Step 2's table), not
   something to resolve by picking one.

3. **Re-check the tier's guardrails mechanically**, against `spec.md` itself — the same
   gate `/sdd-plan` runs at its Step 0, one axis up:

   ```bash
   node ~/.agents/scripts/validate-artifacts.mjs spec-<number>
   ```

   Exit `1` on a `tier` issue → stop and quote it verbatim (`Escalates`). Exit `2` (no
   `node`) → check the conditions by eye and say the gate ran manually. Exit `0` → the
   guardrails hold; continue.

   A `tier: fast` story whose spec carries no non-empty `## Change Surface`, carries no
   command in **Check:**, or whose `type` is outside `FAST_TIER_TYPES` (items block;
   default `[bug, debt, chore]`) stops here. A `tier: standard` story whose `type` is
   outside `STANDARD_TIER_TYPES` (default `[feat, bug, debt, incident, chore]`) stops
   here too.

**Why the tier is checked here and not discovered later:** the tier decides the whole
shape of the run — a build that starts from the wrong stage reads the wrong artifact and
closes in the wrong file. The build is also the most expensive point to undo: by the time
a wrong-tier story is half executed, the code exists. The check costs one command and it
runs before a single file is touched.

---

## Step 1: Review plan critically — or the criterion, in `fast`

Step 0 already resolved the tier and the `build_mode`; this step turns them into the list
of work. Which branch you take is the tier.

1. **`fast` — there is no plan to review, and nothing to extract from one.** Read
   `spec.md`'s single acceptance criterion, its `## Change Surface` (the paths and
   symbols the change is confined to) and the declared **Check:**, and confirm the
   working branch. That is the whole of Step 1 for the tier: no task list to extract, no
   `[X]` to audit, no `### AC → Task traceability` table to verify and no `### File Tree`
   to read — this skill does not invent any of them, because the tier omits the stage
   that writes them. Then go to Step 2, which for `fast` means executing that one
   criterion.
2. **`full` and `standard`** — the steps below, in order.
3. Read `work/active/spec-<number>/plan.md` completely
4. Check for already completed tasks — look for [X] markers:
   - If tasks are already marked [X] → resume from the first incomplete task
   - If no tasks are marked → start from the beginning
5. **Verify traceability (Analyze gate):** read the "AC → Task traceability" table
   in the plan header and read `work/active/spec-<number>/spec.md`'s ACs.
   - Confirm every AC in `spec.md` appears in the table mapped to at least one task.
   - If an AC is missing from the table → STOP: "The plan doesn't cover AC-<N>
     (`<AC text>`). Run `/plan spec-<number>` again to regenerate it, or add the missing
     task manually before continuing." Do not silently add tasks yourself — this is a
     planning gap, not an execution decision.
6. Identify any other concerns, gaps, or blockers before starting
7. If concerns exist → raise them and wait for resolution before proceeding
8. If no concerns → create a TodoWrite with all pending tasks and proceed
9. Note which tasks (if any) are marked `[P]` and which independent group they
   belong to — used in Step 2 to spawn one parallel subagent per group.
   The two branches are exclusive: a `fast` run stops at item 1, and a `full` or
   `standard` run starts at item 2.

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

**In `fast` there is nothing to mark, and nothing to delegate.** The tier has no tasks,
so there is no `[X]` to append, no implicit group, no `[P]` group and no
`sdd-code-implementer` subagent to launch — a `[P]` group is a plan concept, and inventing
a task list to fill the gap is precisely the failure this paragraph exists to prevent. The
execution unit is the single criterion: apply the change `## Change Surface` confines,
run its declared check, and hand the result to Step 3, which is where the tier closes.
The cycle above still governs *how* you verify — red-first in `tdd`, or baselines and
verbatim expected output in `evidence` — because that is the `build_mode` axis and the
tier does not touch it.

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

A plan construct, so this whole subsection belongs to `full` and `standard`. A `fast`
story has no groups, launches no implementer subagent, and executes its one criterion in
this conversation.

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
| **`fast` only:** the change needs a file or symbol outside `## Change Surface` | Stop, report the surface and the file that overflowed it. Do **not** widen `## Change Surface`, do not touch `spec.md` — the tier was inferred from an input, not measured, and this is where the real surface shows up. The way back is `/sdd-route`, which raises the tier; the passes that tier declares then run — `/sdd-scan` and `/sdd-clarify`, then `/sdd-design` for `full` |
| **`fast` only:** a second acceptance criterion turns out to be necessary | Stop, report it. An AC may not be added, split or reworded by this skill, and a story with two criteria is not a `fast` story. Same way back: `/sdd-route` raises the tier, and the passes it declares then run |

**Ask for clarification rather than guessing.**

---

## Step 3: Finalize and request review

After ALL tasks are complete — or, in `fast`, after the one criterion's check is green.
This step is where the tier changes least: the pre-close suite, the provenance check and
the conventions review run in every tier, because a tier removes planning stages and
never the verification of the criterion. What changes is the artifact the close lands in.

**Steps 1-3 are one batch, issued in a single response.** The suite, the provenance
check and the conventions review read the same finished tree and none of them feeds
another, so waiting for each in turn spends three round-trips on one answer. Launch
them together and read the three results as they land.

1. Call the `TESTS.full` port once per affected <component>, passing it as
   `<component>` — from that component's directory, returning to the working
   directory afterwards. A `fast` change is normally confined to one, but the port is
   called once per component the change actually reached, however many that is.

   If the port is unbound → call `TESTS.module` per affected module instead.

   In `build_mode: evidence` this is `VERIFY.full` instead, with `VERIFY.run` per
   deliverable as the fallback when `full` is unbound. This suite is not the criterion's
   own check — it is the regression floor around it, and no tier drops it.

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
   implemented and checked (not against what the plan intended). **Append it under an
   `## AC Coverage` heading, at the end of the file**, and which file that is depends on
   the tier — it is the one thing about this section the tier decides:

   | Tier | The section lands in | Why |
   |---|---|---|
   | `full`, `standard` | `plan.md` | the plan is what was executed, so the close lands beside the tasks that carry it |
   | `fast` | `spec.md` | the tier writes no plan; `spec.md` is the artifact it never omitted, and `status.mjs` reads "build done" from this section there |

   The format is one and the same in both places:

   ```markdown
   ## AC Coverage

   AC-1: <short text> — ✓ <component-a>/.../file.spec.ts::<test name>
   AC-2: <short text> — ✓ <component-b>/.../file.spec.ts::<test name>
   ```

   `## AC Coverage` is a structural heading — a contract with `/sdd-sync`, which reads it
   before closing the story. Never translate it, and write one line per AC in the story's
   `spec.md`, no more and no fewer: lines matching the ACs exactly. In `full` and
   `standard` that is the plan's own multiple; in `fast` it is exactly one.

   Every line carries a concrete reference. In `build_mode: evidence` that reference
   is the **command that proves it** (in backticks) or the artifact path plus its
   validator, and the same rule applies as for a test — `validate-artifacts.mjs`
   rejects a ✓ with nothing behind it. A `fast` line is held to that bar in *either*
   carril, because the tier has no task whose verification could vouch for the check:
   the line names the command, in backticks, and the observable result it produced.

   ```markdown
   AC-1: <short text> — ✓ `node scripts/validate-skills.mjs` → OK: 50 profile keys, no issues.
   ```

   In `fast` the line is the close itself, so there is no other state to reconcile —
   the section is written once, when the check is green, and never as a placeholder.

   If an AC cannot be marked ✓ with one, mark it `✗ <reason>` — and then **stop before
   declaring the build complete**: report the uncovered ACs and ask how to proceed. A
   `✗` is not a footnote to a finished build, it's an unfinished build. Do not mark an
   AC ✓ just because its task is [X] — verify the test (or the check) actually
   exercises that AC's behavior. In `fast` the same rule reads directly: a `✗` in
   `spec.md` means the criterion is not met, whatever the code looks like.

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
   - Tasks completed (with a count) — in `fast`, the single criterion and its check
   - Files created (list of paths)
   - Files modified (list of paths)
   - Test results per microservice
   - The `## AC Coverage` checklist as written into `plan.md` — or, in `fast`, into
     `spec.md`
   - Postman collection generated at `docs/postman_collection.json` (or why it was skipped)
   - The subagent's conventions findings (if any)

7. Say (include the next-step suggestion in the same summary):
   "All tasks completed. Review the changes and tell me if anything needs adjusting.
   Once they're OK, the next step is `/sync spec-<number>` to close out the module's
   documentation (and then `/commit spec-<number>` for the commits and the PR)."
   In `fast`, open it with the criterion instead of a task count: the story is closed by
   the `## AC Coverage` line in `spec.md`, and that line is what `/sdd-sync` reads.

8. Stop — do not proceed further until the user responds.

9. When the user approves the changes, reaffirm the closing step:
   "Run `/sync spec-<number>` to reconcile the module's documentation; the git close-out
   (commits + PR) is left to `/commit spec-<number>`, after `/sdd-sync`."

> If a defect later appears in this code and it originates in an ambiguity or gap in
> `spec.md`, don't reopen this skill or regenerate the plan. In `full` and `standard`,
> use `/hotfix spec-<number>` — a hotfix appends one task to the plan that exists. In
> `fast` there is no plan to append to: correct or add the criterion with
> `/sdd-refine spec-<number>` and re-run this skill.

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

**In `fast` there is no marker to resume from.** The tier writes no tasks, so there is no
`[X]` and no "first pending task" to compute: the unit of work is the criterion, and
resuming means re-running the build against it. Re-run the check from `## Change Surface`
— if it is green the story was already closed and the `## AC Coverage` line in `spec.md`
proves it; if it is red, the criterion is unfinished whatever the code looks like. The
line is written only once the check is green, so a run interrupted before that leaves no
trace to clean up and none to trust. This is also why the section is never written with a
`✗`: in `fast` it is a close, not a progress report.

---

## Common Issues

The 7 that **interrupt a run** — it stops, or the call goes back to the user.
Every other failure mode is in `references/common-issues.md`, with its cause and
resolution.

| Issue | Cause | Resolution |
|-------|-------|------------|
| Branch is main/master | User forgot to switch | Stop immediately, ask for correct branch |
| An AC with no task in the traceability table | `/sdd-plan` produced the plan before this change, or PHASE 3.5 was skipped | STOP at Step 1.5, ask for the plan to be regenerated with `/plan spec-<number>` |
| An AC ends up `✗` in `## AC Coverage` | The tasks are done but no test exercises that AC's behavior | STOP at Step 3.4 — report the uncovered ACs and ask; `/sdd-sync` will refuse to close the story anyway |
| An `evidence` task's baseline run starts red | The deliverable was already broken before this task | Stop: a later green would prove nothing. Report it — fixing the pre-existing break is its own decision |
| `plan.md` is written in the other carril than `spec.md` declares | The mode changed after the plan was written | Critical gap: stop at Step 1 and ask for `/plan spec-<number>` to be regenerated. Never reconcile it by choosing one yourself |
| A `fast` change needs a file outside `## Change Surface` | The tier was inferred from the input; the real surface was bigger than the request showed | Stop and report the file. Widen neither the surface nor the tier by hand — `/sdd-route` raises the tier, and the passes it declares then run |
| A `fast` story turns out to need a second acceptance criterion | A single-criterion story was inferred, and it isn't one | Stop and report it. This skill may not add or reword an AC; the story is `standard` at least, so the fix is `/sdd-route` to raise the tier — never an invented task list here |

---

## Example

A full worked run — a run executing a group and closing out — is in
`references/example.md`. Read it when the shape of the output is in doubt.

---

## Output language
**Conversational output** follows `~/.agents/references/chat-conventions.md` - the six blocks (announce, progress, question, summary, stop, handoff).

**Any note you append to `plan.md` follows `ARTIFACT_LANGUAGE`** (language block) — and
so does the `## AC Coverage` section this skill appends to `spec.md` in `fast`, because
it is prose in the story's own artifact. The `[X]` markers, the `Task N` headings, the
`## AC Coverage` heading and the AC ids are structural — never touch their wording.

**Code comments and test names follow the code**, i.e. `IDENTIFIER_LANGUAGE`
(profile, language block) — they are part of the codebase, not of the artifact
prose. That key is the whole rule: this skill declares no default, so read it and
write in whatever it says, and pass it to `sdd-code-implementer` along with the tasks.
What a comment may say (only the why, and never the story's ACs) is a convention
rather than a language rule: it lives in Step 2 and in the `design-principles` skill.
