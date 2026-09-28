---
name: sdd-plan
description: >
  Generates an SDD story's implementation plan — plan.md with Task 0, ordered
  tasks each with its files, contract and verification, and an AC → Task
  traceability table — from the approved artifacts: TDD tasks by default,
  evidence-driven tasks when spec.md declares build_mode: evidence, and a flat
  breakdown at tier: standard.
  Use when the user says "/sdd-plan spec-XXXX", "plan spec-XXXX", "generate the
  SDD plan", "create the implementation plan for spec-XXXX", "planifica
  spec-XXXX", "genera el plan de spec-XXXX", or right after /sdd-design (full +
  tdd) or /sdd-ready (every other case) hands off to it.
  Do NOT use to execute the tasks (use /sdd-build), to plan, build and sync in
  one go (use /sdd-forge), or for work that isn't an SDD spec-XXXX story.
---

# plan

## Overview

Reads the approved artifacts, fixes the implementation order and writes `plan.md` — the
task list `/sdd-build` executes without stopping.

**Core principle:** the plan is written, not executed — every task is text `/sdd-build`
runs later, including the git commands in Task 0. It fixes what cannot be inferred
(paths, contracts, cases, verification) and leaves to the build what follows from it.

**Announce at start:** "Generating the implementation plan for spec-<number>."

**Output:** `work/active/spec-<number>/plan.md`, and `docs/file-tree.md` next to it —
both File Tree renderings come from `scripts/file-tree.mjs`, never by hand.

### What the tier and the mode change

`spec.md`'s front matter carries both (`/sdd-route` wrote them). Read them once, in
Step 0; everything below that varies, varies only here:

| Tier · mode | Reads the design | Strategy reference | `[P]` groups | Verification port |
|---|---|---|---|---|
| `full` · `tdd` (default) | yes — `design.md`, contract, sequence diagram, data model | `references/strategy-tdd.md` | yes | `TESTS` |
| `full` · `evidence` | no | `references/strategy-evidence.md` | yes | `VERIFY` |
| `standard` · `tdd` | no — `context.md` instead | `references/strategy-standard.md` | no | `TESTS` |
| `standard` · `evidence` | no | `references/strategy-evidence.md`, flat | no | `VERIFY` |
| `fast` · any | — | this skill doesn't run: the story builds from `spec.md` | — | — |

**Load only the one strategy reference that applies.** What every row shares — Task 0,
the traceability table, the File Tree, the task format, the refusal to save a plan with
an uncovered AC — is in this file.

---

## Project profile (read first, always)

Read `.agents/profile.yaml` from the project root before anything else, as
`~/.agents/references/project-profile.md` describes. The keys this skill reads are
listed under **Profile keys** in the `Contract` below.

---

## Contract

**Check every `Requires` row before any other work** — a missing input stops the run at
the start, not halfway through a written plan.

Two artifact names resolve from the profile (docs block):

- `<api-artifact>` = `docs/api.delta.yaml` if `API_CONTRACT_MODE = delta` (default),
  otherwise `docs/api.yaml`.
- `<flow-artifact>` = `docs/diagram.md` if `DOC_UNIT = story` (default), or every
  `docs/flows/*.md` if `use-case`.

**Requires** — rows marked **(design)** apply only to `full` · `tdd`

| Condition | Check | If it fails |
|---|---|---|
| You are in the project's working directory | `pwd` == `WORKING_DIRECTORY` | `cd` there before running anything |
| `spec.md` exists | `[ -f work/active/spec-<number>/spec.md ]` | Stop: "Run `/sdd-spec spec-<number>` first." |
| The tier has a plan | Step 0: not `tier: fast` | Stop: "`spec-<number>` is `fast` — it builds from `spec.md` and closes there. Run `/sdd-build spec-<number>`." |
| Tier and mode hold up | Step 0: `validate-artifacts.mjs` reports no `tier` or `build_mode` issue | Stop and quote it verbatim; the fix is `/sdd-route spec-<number>` |
| The story is clarified | zero `[NEEDS CLARIFICATION]` markers in `spec.md` | Stop: "Run `/sdd-ready spec-<number>` first — planning on open questions writes the wrong tasks." |
| The route was reviewed | `## Ambiguity Resolution` carries a `**Tier ·` and a `**Build mode ·` entry | Stop: "Run `/sdd-route spec-<number>` first — the tier may still change." |
| `context.md` exists | `[ -f work/active/spec-<number>/context.md ]` | Stop: "Run `/sdd-ready spec-<number>` first." |
| `design.md` exists **(design)** | `[ -f work/active/spec-<number>/design.md ]` | Stop: "Run `/sdd-design spec-<number>` first." |
| The sequence diagram exists **(design)** | `<flow-artifact>` present | Same stop — the order comes from it |
| The API contract exists **(design)** | `[ -f work/active/spec-<number>/docs/<api-artifact> ]` | Same stop — it is the source of truth for every DTO |
| A declared data model has its file **(design)** | `## Data Modeling` in `design.md` ⇒ `docs/data-model.md` exists | Stop: "Run `/sdd-design spec-<number>` again." |
| `VERIFY` resolves **(evidence)** | the `VERIFY` port, across packs + profile | Stop: "The `VERIFY` port is unbound — nothing can close these ACs. Bind it, or move the story back to `tdd` with `/sdd-route`." |
| The working branch exists | `[ -f work/active/spec-<number>/.branch ]` | Stop: "Run `/sdd-prepare spec-<number>` first." |

**Produces** — what `/sdd-build` looks for

- `plan.md` with the header of `references/plan-header-template.md`
- `### AC → Task traceability` mapping **every** AC to at least one task
- `### File Tree` and `docs/file-tree.md`, both written by `scripts/file-tree.mjs`
- `Task 0` first, verifying the branch named in `.branch`
- `Task N` numbered sequentially, each with files, contract, cases and one
  verification with its expected output; `[P]` only where the table above allows it
- no final "run the suite" task, no task marked `[X]`
- `node ~/.agents/scripts/validate-artifacts.mjs spec-<number>` exits `0`

**Writes** — `work/active/spec-<number>/plan.md` and
`work/active/spec-<number>/docs/file-tree.md`. Never `spec.md` (its route is
`/sdd-route`'s), `context.md` or the design artifacts (`/sdd-design`, `/sdd-refine`), the
source code (`/sdd-build`) or the living docs (`/sdd-sync`).

**Never**

- a state-changing git command — Task 0 *verifies* the branch `/sdd-prepare` created
- create or edit source or test files — code in a task is plan content
- save a plan with an uncovered AC
- hand-edit the File Tree — it is regenerated from the tasks

**Escalates**

- `plan.md` exists: with `[X]` tasks, ask before regenerating (it discards the build's
  state — a targeted fix is `/sdd-hotfix`); without, ask before overwriting.
- An AC no task can cover with the artifacts at hand → stop and ask, naming the AC.
- A `standard` story whose analysis turns up a contract, a schema or a second
  component → **stop without saving** and hand off to `/sdd-route spec-<number>` with the
  signal: it raises the tier, and `/sdd-design` then runs.

**Degrades**

- `STACK_REFS` unset → the local `references/`; set → each `<STACK_REFS>/<file>` resolves
  across the packs most specific first, then locally.
- `TESTS.module` unbound → `TESTS.full` in each task's cycle.
- `VERIFY.full` unbound (evidence) → `/sdd-build` closes with `VERIFY.run` per
  deliverable. `VERIFY.run` unbound is a stop, not a degradation.
- `docs/rules.md` absent → skip the constitution step.
- `stack.SKILLS` empty → apply only the project's `conventions.md`/`CLAUDE.md`.
- No `node` → the validator and the File Tree script can't run: build the File Tree by
  hand per `references/plan-header-template.md`, check every row of `Produces` by eye,
  and say both were manual.

**Reverting** — `git checkout -- work/active/spec-<number>/plan.md
work/active/spec-<number>/docs/file-tree.md` once the workspace is tracked. Before the
first commit there is nothing to restore — which is why overwriting asks first.

**Profile keys**

- `STORY_ID_PATTERN`, `WORKDIR_ACTIVE` — the story's id and workspace, written here as
  `spec-<number>` and `work/active/spec-<number>/`
- `WORKING_DIRECTORY` — the first `Requires` row
- `BASE_BRANCH` — what Task 0 must not find checked out
- `DOCS_ARCHITECTURE` — where the testing and conventions docs live
- `API_CONTRACT`, `API_CONTRACT_MODE`, `DOC_UNIT` — which design artifacts are read
- `TEST_FRAMEWORK` — the test cycle in every `tdd` task
- `EVIDENCE_MODE_TYPES`, `FAST_TIER_TYPES`, `STANDARD_TIER_TYPES` (items block) — re-checked
  by the validator at Step 0
- `STACK_REFS` and the stack block (`COMPONENT_TERM`, `LANGUAGE`, `FRAMEWORK`, `ORM`,
  `MIGRATIONS`, `MODULE_ROOT`) — the task templates and the header's `Stack` line;
  `MODULE_ROOT` also groups the File Tree by component
- `SKILLS` (stack block) — the best-practice skills loaded before drafting
- `ARTIFACT_LANGUAGE`, `OUTPUT_LANGUAGE`, `IDENTIFIER_LANGUAGE` — see "Output language"

---

## Flow

Copy this checklist and tick it as you go:

```
- [ ] Step 0 — tier and mode read, validator clean
- [ ] Step 1 — Requires checked
- [ ] Step 2 — overwrite gate
- [ ] Step 3 — branch name read
- [ ] Step 4 — artifacts loaded, strategy reference loaded
- [ ] Step 5 — header, Task 0, tasks written
- [ ] Step 6 — traceability complete, File Tree generated, validator exit 0
- [ ] Step 7 — summary and handoff
```

### Step 0 — Tier and mode

Read `spec.md`'s front matter: `tier` (absent → `full`) and `build_mode` (absent →
`tdd`). Find the row of the table in the Overview. Then:

```bash
node ~/.agents/scripts/validate-artifacts.mjs spec-<number>
```

Exit `1` with a `tier` or `build_mode` issue → stop and quote it. This re-checks what
`/sdd-route` decided because the fields can be hand-written, and this is the last gate
before a whole plan is written against the wrong strategy.

### Step 1 — Requires

Check every row of `Requires` that applies to the story's row of the table.

### Step 2 — Overwrite gate

Per `Escalates`: ask before regenerating over `[X]` tasks, or overwriting an unexecuted
plan.

### Step 3 — The branch name

```bash
cat work/active/spec-<number>/.branch
```

Read it — never ask, never invent. It is written **literally** into Task 0.

### Step 4 — Load

1. The artifacts: `references/artifact-loading.md` — which steps apply per row, and what
   to take from each.
2. The one strategy reference the table names.
3. Each skill in the profile's `stack.SKILLS`, with the Skill tool; apply its rules to the
   task text. A name that doesn't exist is reported, not fatal.

### Step 5 — Write the plan

1. **Header** — `references/plan-header-template.md`; leave `### File Tree` for Step 6.
2. **Task 0** — verifies, per affected <component>, that the working branch is checked
   out and the tree is clean. It never pulls, rebases or creates branches, and it is
   re-runnable:

   ```bash
   git -C <component> branch --show-current   # expected: <branch-name>, not BASE_BRANCH
   git -C <component> status --porcelain      # expected: empty
   ```

3. **The order and the tasks** — per the strategy reference.
4. **Every task** follows `<STACK_REFS>/references/task-structure-template.md` (or the
   evidence template in that mode) and carries:
   - `**Files:**` with exact paths from the repo root, one `Create`/`Modify`/`Delete`/
     `Test` line each — the File Tree is generated from these lines
   - the contract: signatures, injected ports, error classes, and every field name and
     type verbatim from `<api-artifact>` or `docs/data-model.md` where they exist — where
     they don't, signatures and invariants only: inventing a field is writing the design
     the tier omitted
   - the cases, one line each — a `#### Scenario:` in `spec.md` is already a case
   - the cycle and **one** verification run with its expected output
   - no method bodies, test bodies or boilerplate: two competent implementations may
     differ in anything a caller can't observe
5. **No reference to the story in the code a task dictates** — no `AC-<n>`,
   `spec-<number>`, `Task <n>` or `work/active/…` in a comment, test name or TODO; write
   the rule the AC states. The rest of how code is named and commented is the
   `design-principles` skill's, § "Comments".
6. **No final "run the suite" task** — `/sdd-build` closes with `TESTS.full` (or
   `VERIFY.full`).

### Step 6 — Verify and save

1. **Traceability** — for every AC in `spec.md`, the tasks that exercise it. An AC with
   none → add the task; if no task can cover it, don't save: stop and ask (`Escalates`).
   Then run the strategy's own checks (contract fields, endpoints, entities — or, in
   `evidence`, a command per AC).
2. **Save** `plan.md`, then generate both File Tree renderings from the tasks:

   ```bash
   node ~/.agents/scripts/file-tree.mjs spec-<number>
   ```

3. **Validate** against the file on disk:

   ```bash
   node ~/.agents/scripts/validate-artifacts.mjs spec-<number>
   ```

   Exit `1` → fix what it reports (re-run `file-tree.mjs` if you touched a task's Files)
   and validate again, until exit `0`. Then confirm by eye what no script knows: no task
   is `[X]`, and Task 0's commands carry the branch from `.branch` and only verify it.

### Step 7 — Close

Summarize: tasks generated; tier and mode (and the `VERIFY` adapter in `evidence`);
components in implementation order; whether it includes an entity and migration; the
scope the File Tree script reported; the skills loaded. Then:

> "Plan saved to `work/active/spec-<number>/plan.md`. Review it, then run
> `/sdd-build spec-<number>` — or `/sdd-forge spec-<number>` to build and sync in one go."

Stop — don't start executing.

---

## Output language

**Conversational output** follows `~/.agents/references/chat-conventions.md` — the six
blocks (announce, progress, question, summary, stop, handoff).

**Artifact prose follows `ARTIFACT_LANGUAGE`**: task titles, step descriptions, expected
outputs and the traceability table. The **task markers** (`Task 0`, `Task N`), the File
Tree tags (`create`, `modify`, `delete`, `test`) and the structural headings stay English
— `/sdd-build`, `/sdd-hotfix` and the validator find them by name. Everything the plan
writes as code — paths, symbols, commands, test names — follows `IDENTIFIER_LANGUAGE`,
since `sdd-code-implementer` transcribes it verbatim.

---

## Common Issues

The ones that **stop** a run. Every other failure mode is in `references/common-issues.md`.

| Issue | Cause | Resolution |
|---|---|---|
| `spec.md` still carries markers | Clarification didn't finish | Stop: `/sdd-ready spec-<number>` |
| No `**Tier ·` / `**Build mode ·` entries | The route review never ran | Stop: `/sdd-route spec-<number>` |
| `plan.md` already has `[X]` tasks | `/sdd-build` already ran | Ask before regenerating; a targeted fix is `/sdd-hotfix spec-<number>` |
| `evidence` with `VERIFY` unbound | The mode was declared with no check | Stop: bind the port, or `/sdd-route` back to `tdd` |
| No `design.md` in `full` · `tdd` | `/sdd-design` never ran | Stop: `/sdd-design spec-<number>` — `evidence` is not the way around it |
| An AC no task can cover | The design leaves it uncovered | Ask; `/sdd-refine` the design or instruct the mapping |
| A `standard` story turns out to need a contract | The design stage never ran at that tier | Stop without saving; `/sdd-route` raises the tier |

---

## Example

A full worked run — a written `plan.md` and its first tasks — is in
`references/example.md`.
