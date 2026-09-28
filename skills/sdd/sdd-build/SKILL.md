---
name: sdd-build
description: >
  Executes an SDD story autonomously: the tasks of its plan.md group by group —
  or, in the fast tier, the single criterion of its spec.md — writing the code
  and tests, verifying each step (TDD by default, evidence-driven when spec.md
  declares build_mode: evidence), and closing with an AC Coverage section.
  Use when the user says "/sdd-build spec-XXXX", "build spec-XXXX", "execute the
  plan", "implement the plan", "build story", "ejecuta el plan", "implementa la
  historia", "construye la historia", or references a plan file
  (work/active/spec-*/plan.md).
  Do NOT use to write plans (use /sdd-plan), to plan, build and sync in one go
  (use /sdd-forge), to fix a defect in already-built code (use /sdd-hotfix), or
  for general coding questions or quick fixes.
---

# build

## Overview

Executes the work the story declares, verifies it, and closes it with `## AC Coverage`.
The plan fixes each task's contract and cases; the code that satisfies them is written
here, not transcribed. Review is requested once, at the end.

**Core principle:** full autonomous execution — mark progress, stop only for the reasons
in Step 2's table, ask for review when everything is green.

**Announce at start:** "Executing plan spec-<number>." — in `fast`: "Executing
spec-<number> — the one criterion and its check."

### What the tier and the mode change

`spec.md`'s front matter carries both (absent → `full`, `tdd`). Read them once, in
Step 0:

| Axis | Value | Work comes from | Closes in | Verification port | Load |
|---|---|---|---|---|---|
| `tier` | `full`, `standard` | `plan.md`'s tasks | `plan.md`'s `## AC Coverage` | per mode | `references/parallel-groups.md` if the plan names `[P]` groups |
| `tier` | `fast` | `spec.md`'s single criterion | `spec.md`'s `## AC Coverage` | per mode | `references/fast-execution.md` |
| `build_mode` | `tdd` | — | — | `TESTS.module` per task, `TESTS.full` at the close | — |
| `build_mode` | `evidence` | — | — | `VERIFY.run` per task, `VERIFY.full` at the close | `references/evidence-cycle.md` |

A tier removes stages; it never relaxes a guarantee. The six reasons to stop, the
pre-close suite, the provenance check and the rule that a `✗` is an unfinished build hold
in every row.

---

## Project profile (read first, always)

Read `.agents/profile.yaml` from the project root before anything else, as
`~/.agents/references/project-profile.md` describes. The keys this skill reads are
listed under **Profile keys** in the `Contract` below.

---

## Contract

**Check every `Requires` row before any other work.**

**Requires**

| Condition | Check | If it fails |
|---|---|---|
| You are in the project's working directory | `pwd` == `WORKING_DIRECTORY` | `cd` there before running anything |
| `spec.md` exists | `[ -f work/active/spec-<number>/spec.md ]` | Stop: "Without the ACs there is nothing to validate the build against." |
| Tier and mode hold up | Step 0: `validate-artifacts.mjs` reports no `tier` or `build_mode` issue | Stop and quote it; the fix is `/sdd-route spec-<number>` |
| `plan.md` exists — `full`, `standard` | `[ -f work/active/spec-<number>/plan.md ]` | Stop: "Run `/sdd-plan spec-<number>` first." |
| Every AC maps to a task — `full`, `standard` | the plan's `### AC → Task traceability` covers every AC in `spec.md` | Stop: "The plan doesn't cover AC-<N>. Run `/sdd-plan spec-<number>` again." Never add the task yourself — it's a planning gap |
| Not on a base branch | `git branch --show-current` ∉ {`main`, `master`, `BASE_BRANCH`} | Stop: "Run `/sdd-prepare spec-<number>` first." |

**Produces** — what `/sdd-sync` looks for

- `full`, `standard`: every task in `plan.md` marked `[X]`
- `## AC Coverage` — one line per AC, zero `✗`, each with a concrete reference — at the
  end of `plan.md`, or of `spec.md` in `fast` (`references/ac-coverage.md`)
- the pre-close suite green for every affected <component>
- `node ~/.agents/scripts/validate-code-provenance.mjs` exits `0`

**Writes** — nothing outside this list

- the project's source and test files, as the tasks dictate — or, in `fast`, within
  `## Change Surface`
- `plan.md` — the `[X]` markers and `## AC Coverage` (`full`, `standard`)
- `spec.md` — `## AC Coverage` only, and only in `fast`: the one section that tier left
  to the build. Never the front matter, never an AC

Not `context.md` or `design.md` (that's `/sdd-refine`), not the living docs (`/sdd-sync`).

**Never**

- `git add`, `git commit`, `git push` or any other state-changing git command
- install packages globally, or run a tool the profile's ports don't name
- add, reword or renumber an AC; widen `## Change Surface`; raise the tier
- write `AC-<n>`, `spec-<number>`, `Task <n>` or `work/…` into code, test names or
  comments — the provenance check (Step 3) enforces it; the rest of how code is commented
  is the `design-principles` skill's, § "Comments"

**Escalates** — the six reasons in Step 2's table. There is no seventh.

**Degrades** — `TESTS.full` unbound → `TESTS.module` per module; `VERIFY.full` unbound →
`VERIFY.run` per deliverable. The per-task port is **not** degradable: without
`TESTS.module` there is no TDD cycle and without `VERIFY.run` no evidence — stop rather
than execute tasks you can't verify.

**Reverting** — nothing is committed. A tracked file comes back with
`git checkout -- <path>`; a file a task **created** is untracked, so deleting it is the
only undo. `git diff BASE_BRANCH...HEAD` shows everything the story added. `[X]` markers
survive a re-run on purpose: it resumes (`references/resume-guide.md`).

**Ports** — `TESTS` or `VERIFY` per the mode table. This skill names capabilities, never
tools: which command implements each is the profile's `ports` block.

**Profile keys**

- `STORY_ID_PATTERN`, `WORKDIR_ACTIVE` — the story's id and workspace, written here as
  `spec-<number>` and `work/active/spec-<number>/`
- `WORKING_DIRECTORY`, `BASE_BRANCH` — the location and branch gates
- `FAST_TIER_TYPES`, `STANDARD_TIER_TYPES`, `EVIDENCE_MODE_TYPES` (items block) —
  re-checked by the validator at Step 0
- `DOCS_ARCHITECTURE` — the conventions and testing docs handed to implementer subagents
- `TEST_FRAMEWORK` — the shape of the test files (`tdd`)
- `COMPONENT_TERM` and the stack block — the term for a deployable unit, and the stack
- `ARTIFACT_LANGUAGE`, `OUTPUT_LANGUAGE`, `IDENTIFIER_LANGUAGE` — see "Output language"

---

## Flow

Copy this checklist and tick it as you go:

```
- [ ] Step 0 — tier and mode read, validator clean, references loaded
- [ ] Step 1 — the work loaded and reviewed
- [ ] Step 2 — every group green and marked (or the criterion's check green)
- [ ] Step 3 — suite + provenance + conventions review (one batch), AC Coverage written
- [ ] Step 4 — summary and handoff
```

### Step 0 — Tier and mode

Read `tier` and `build_mode` from `spec.md`, find the rows of the table above, and load the
references they name. Then:

```bash
node ~/.agents/scripts/validate-artifacts.mjs spec-<number>
```

Exit `1` on a `tier` or `build_mode` issue → stop and quote it. Exit `2` (no `node`) →
check by eye and say so. Don't re-litigate the mode: if the work contradicts the field,
that is a critical gap (Step 2), not something to resolve by picking one.

### Step 1 — Load and review the work

**`fast`** → `references/fast-execution.md`: the criterion, `## Change Surface`, the check.

**`full`, `standard`:**

1. Read `plan.md` completely. Tasks already `[X]` → resume from the first that isn't
   (`references/resume-guide.md`).
2. The traceability gate: every AC of `spec.md` in the `### AC → Task traceability`
   table (`Requires`).
3. Any other concern, gap or blocker → raise it and wait. None → put every pending task in
   your task list and note which `[P]` group each belongs to.

### Step 2 — Execute

Tasks run in **groups**: the `[P]` groups the plan header names, plus one implicit group
holding every other task in written order. **Task 0 is its own group and runs first,
alone.** Right after it, re-run `git branch --show-current` in each affected <component>:
still on `main`, `master` or `BASE_BRANCH` → stop before touching a source file.

For each group:

1. Mark its tasks in progress in your task list.
2. **Write every test in the group first** — each task's `Cases` as failing tests against
   the `Contract` it fixes. The bodies are yours; the names and the cases are not.
3. **One red run** for the group. Every new test must fail, for the right reason.
4. Implement in written order, running each task's `Verify` command as it goes green.
5. Mark the group's tasks `[X]` in `plan.md` — one edit, once the group is green.
6. Start the next group immediately. **Don't stop between tasks or groups.**

Several independent `[P]` groups pending → run them concurrently per
`references/parallel-groups.md`. In `evidence` the cycle runs forward from baselines per
`references/evidence-cycle.md`. In `fast` there are no groups: the unit is the criterion
(`references/fast-execution.md`).

**The only reasons to stop mid-execution:**

| Reason | Action |
|---|---|
| Missing dependency (package, file, class) | Stop, report exactly what is missing |
| A test — or a `VERIFY` check — fails more than twice | Stop, show the error, ask for guidance |
| An instruction is ambiguous or contradictory | Stop, quote it, ask |
| The plan has a critical gap that prevents starting | Stop, describe it, wait |
| **`fast`:** the change needs a file or symbol outside `## Change Surface` | Stop and report — the way back is `/sdd-route` (`references/fast-execution.md`) |
| **`fast`:** a second acceptance criterion is needed | Stop and report — same way back |

**Ask rather than guess.**

### Step 3 — Close

**Items 1-3 are one batch, issued in a single response** — they read the same finished
tree and none feeds another.

1. **The pre-close suite:** `TESTS.full` once per affected <component> (from its
   directory), or `VERIFY.full` in `evidence` — degrading per `Degrades`. It is the
   regression floor around the criterion, and no tier drops it.
2. **Provenance:**

   ```bash
   node ~/.agents/scripts/validate-code-provenance.mjs
   ```

   Exit `1` lists file, line and match: state the rule instead of the number, re-run until
   `0`. Its `NOTES` (loose per-property comments) are advice, never a gate. A project whose
   *domain* is tasks or specs may have genuine `Task 3` content — say so in the summary.
3. **Conventions review:** invoke the `sdd-conventions-reviewer` subagent, read-only, with
   a prompt naming each affected <component> so it can diff against `BASE_BRANCH`. Pass
   explicitly the model its `tier` (`balanced`) resolves to **on this host** in
   `~/.agents/agents/targets.yaml` — some hosts ignore the agent's own frontmatter, and a
   fixed model name breaks the others.
4. **`## AC Coverage`:** read `spec.md` again and write one line per AC, per
   `references/ac-coverage.md`. A `✗` → stop, report the uncovered ACs and ask: it is an
   unfinished build.

### Step 4 — Summary and handoff

Summarize: tasks completed (in `fast`, the criterion and its check); files created and
modified; the suite per <component>; the `## AC Coverage` lines as written; the
conventions findings. Then:

> "All tasks completed. Review the changes and tell me if anything needs adjusting. Once
> they're OK, `/sdd-sync spec-<number>` closes the documentation, and then
> `/sdd-commit spec-<number>` groups the commits and drafts the PR."

Stop until the user responds.

A defect found later that traces back to an ambiguity in `spec.md`: in `full` and
`standard`, `/sdd-hotfix spec-<number>` appends a task to the plan; in `fast`, correct the
criterion with `/sdd-refine spec-<number>` and re-run this skill.

---

## Output language

**Conversational output** follows `~/.agents/references/chat-conventions.md` — the six
blocks (announce, progress, question, summary, stop, handoff).

**Prose appended to `plan.md` or `spec.md`** (the `## AC Coverage` lines) follows
`ARTIFACT_LANGUAGE`. The `[X]` markers, `Task N` headings, the `## AC Coverage` heading and
the AC ids are structural — never reworded. **Code, comments and test names** follow
`IDENTIFIER_LANGUAGE` — pass its resolved value, not the key, to every implementer
subagent.

---

## Common Issues

The ones that **stop** a run. Every other failure mode is in `references/common-issues.md`.

| Issue | Cause | Resolution |
|---|---|---|
| On `main`/`master`/`BASE_BRANCH` | `/sdd-prepare` never ran, or the branch was switched | Stop: `/sdd-prepare spec-<number>` |
| An AC with no task in the traceability table | The plan predates a spec change, or its traceability step was skipped | Stop: `/sdd-plan spec-<number>` again |
| An AC ends up `✗` | The tasks are done but nothing exercises that AC's behavior | Stop at Step 3.4; report and ask |
| An `evidence` baseline starts red | The deliverable was already broken | Stop: a later green would prove nothing |
| `plan.md` written for the other mode | The mode changed after planning | Critical gap: stop, regenerate with `/sdd-plan` — never pick one yourself |
| A `fast` change outgrows its surface, or needs a second AC | The tier was inferred, not measured | Stop: `/sdd-route` raises the tier |

---

## Example

A full worked run — a group executed and the close-out — is in `references/example.md`.
