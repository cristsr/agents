# SDD — a spec-driven development pipeline for coding agents

This repository is the ecosystem: **skills** (the pipeline stages and the convention
guides), **agents** (the subagents those stages delegate to for parallel or bulk
work), **stack packs**
(per-language wiring and artifact templates), **scripts** (the validators) and
**contracts** (what all of the above agree on).

The skills are global — installed once, they work on any project. One file adapts them
to each one: `.agents/profile.yaml` at the project root, created by `/sdd-bootstrap`.
Nothing here is project-specific.

This README is the map. The operational detail lives in each `SKILL.md`; this is the
flow, what each stage produces, and the rules they share.

## Install

```bash
npm install                 # js-yaml, used by the validators
npm run skills:sync         # link skills/ into ~/.claude/skills (OpenCode reads it too)
npm run agents:sync         # write the agents in each tool's native format
```

Both sync commands have a `:check` / `--dry-run` twin that shows what would change
without writing. Then, from a project: `/sdd-bootstrap` to create its profile, and
`/healthcheck` to verify everything holds together.

```bash
npm test                    # the parsers, the gates and the ecosystem's own consistency
npm run skills:check        # the ecosystem alone
```

`npm test` runs on every push and pull request, on Linux and Windows both
(`.github/workflows/checks.yml`) — the scripts resolve paths and emit shell
strings for hooks, and those differ between the two. The suite covers the
artifact parsers (`scripts/lib/`), the gates end to end over throwaway story
workspaces, the read-only guard, and one integration test asserting this repo
passes its own validator: the whole point is that a rename goes red here rather
than being discovered by a skill following a dead reference.

## Flow

```
/sdd-spec → /sdd-prepare → /sdd-clarify → /sdd-design → /sdd-plan → /sdd-build → /sdd-sync → /sdd-commit
```

| Skill | Input | Output |
|---|---|---|
| `/sdd-spec` | raw text or a tracker export (feature, bug, debt, incident, chore) | `spec.md`, typed |
| `/sdd-prepare` | the item | a fresh base branch + the story's working branch (`.branch`) |
| `/sdd-clarify` | `spec.md` | precise ACs with scenarios, a decision log, `context.md`, and the story's `build_mode` |
| `/sdd-design` | `spec.md` + `context.md` | `design.md` + `docs/` (contract, model, diagrams) |
| `/sdd-plan` | the approved artifacts | `plan.md` — numbered tasks, each with its verification, plus a consolidated `### File Tree` |
| `/sdd-build` | `plan.md` | code + green checks, tasks `[X]`, `## AC Coverage` |
| `/sdd-sync` | the closed story | module docs reconciled, workspace moved to `work/done/` |
| `/sdd-commit` | `work/done/` | commits + a drafted PR (never pushes) |

Two stages are conditional: `/sdd-prepare` only if the base isn't fresh, and `/sdd-design`
only in the TDD carril (see "Build modes"). `/sdd-clarify` absorbed the old survey step —
it produces the precise `spec.md` **and** `context.md` in one pass.

**Support skills:** `/sdd-forge` (chains plan → build → sync unattended) · `/sdd-hotfix`
(post-build defect traced to an ambiguous AC) · `/sdd-refine` (targeted artifact
corrections) · `/sdd-scan` (refresh `context.md` alone) · `/sdd-status` (where a story sits) ·
`/healthcheck` (validate the ecosystem) · `/sdd-rules` (the project's non-negotiables) ·
`/sdd-docs` (C4 Level 1/2) · `/sdd-bootstrap` (the profile) · `/hexagonal-audit` (turns
architecture debt into draft stories).

## Build modes

A story declares its carril in `spec.md`'s front matter. `/sdd-clarify` resolves it, and
**the absence of the field means `tdd`** — so every story predating this axis is
unaffected.

```yaml
build_mode: evidence      # absent → tdd
```

The invariant is the same in both: **every AC has a declared, executable way of being
checked.** TDD is one implementation; `evidence` is another, for deliverables no test
suite covers (docs, ADRs, research, skills) and for code where red-first is impossible
by construction (a pure refactor, an infra chore, a data migration).

| | `tdd` (default) | `evidence` |
|---|---|---|
| `/sdd-design` | required | skipped |
| Implementation order | the sequence diagram | dependencies between deliverables |
| Per-task cycle | red → implement → green | (baseline) → change → check green |
| Verification port | `TESTS` | `VERIFY` |
| An `## AC Coverage` line points at | a test | the command that proves it |

Unchanged in both: `Task 0`, the AC → Task traceability table, the `[P]` groups, and
the rule that a `✗` in `## AC Coverage` is an unfinished build.

**The guardrail — three layers, only the first configurable.** The relaxed carril is
deliberately hard to reach: the item's `type` must be in `EVIDENCE_MODE_TYPES`
(profile, default `[debt, chore, incident]`); `spec.md` must carry a non-empty
`## Build Mode Rationale`; and `validate-artifacts.mjs` plus `/sdd-plan`'s step 0 reject
the story mechanically when either fails. A fourth follows from the port model:
`VERIFY` unbound **stops** the run rather than degrading to "reviewed by eye". And
`/sdd-clarify` may never choose `evidence` on its own — it is always returned as a
question.

## The profile

`.agents/profile.yaml` is the only thing that adapts these global skills to a project:
a `SCHEMA_VERSION` plus named blocks (`identity`, `items`, `intake`, `paths`,
`language`, `vcs`, `stack`, `docs`, `mcp`) holding uppercase keys, plus `ports`.

A key holding `null` is **not configured**: the skill uses the fallback its own
contract declares. It never means "unknown" — a required key left null is an error.
Artifact file names (`spec.md`, `context.md`, `design.md`, `plan.md`) are a contract
between skills, not settings.

Which keys a skill reads is listed in that skill's own `Contract` block. The schema
is `contracts/sdd-profile.template.yaml`; the reasoning behind each value is
`skills/sdd/sdd-bootstrap/references/profile-guide.md`.

```bash
node ~/.agents/scripts/validate-profile.mjs .agents/profile.yaml
```

## Language

Three axes, three profile keys — no skill decides the language on its own:

| Axis | Key | Covers |
|---|---|---|
| Conversation | `OUTPUT_LANGUAGE` | announcements, questions, closing reports |
| Artifact prose | `ARTIFACT_LANGUAGE` | the text inside every artifact |
| Identifiers | `IDENTIFIER_LANGUAGE` | paths, classes, fields, endpoints, YAML keys — **and code comments and test names**, which belong to the codebase rather than to the artifact prose |

No skill ships a default for any of the three. `IDENTIFIER_LANGUAGE` in particular
is read, never assumed: a project that leaves it null gets a warning from
`validate-profile.mjs`, not English by default.

**Structural headings stay in English regardless.** They are a contract between
skills, parsed by name: `## Acceptance Criteria`, `## Ambiguity Resolution`,
`## Build Mode Rationale`, `## Technical Context`, `## Global Architecture Impact`,
`## Design Decisions`, `### AC → Task traceability`, `### File Tree`,
`## AC Coverage`, and `Task N`.
Translating one breaks the pipeline; only the text *under* it follows
`ARTIFACT_LANGUAGE`. Front-matter keys and values are identifiers too.

**The git surface stays in English**: commit messages, PR title and body, branch
descriptions — shared history read outside the project.

## Ports

A skill never names a tool. It names a **capability** — a port — and the profile's
`ports` block says which command, agent or MCP tool provides it here:

`TESTS` · `VERIFY` · `CI_GATES` · `CONTRACT_LINT` · `CONTRACT_DIFF` ·
`DIAGRAM_CHECK` · `API_CLIENT_EXPORT` · `PROJECT_GRAPH` · `CODE_SURVEY`

Each port holds an ordered adapter list per operation, resolved in layers (stack packs
first, profile on top). The first **available** adapter wins; one that resolves and
then fails is a real failure and propagates. A port with no usable adapter is
*unbound*, and the skill applies the degraded behavior its own `Degrades` row
declares — the profile never decides that.

The catalog — operations, placeholders, consumers and how to add one — is
`contracts/PORTS.md`.

## The artifacts never name the pipeline

An artifact says **what** it specifies, designs or plans — never which skill wrote it,
at which PHASE, or which Step of another skill produced a line in it. No "written by
`/sdd-clarify`", no "(via `/sdd-sync`)", no "see PHASE 3.5". The same rule the code follows for
AC numbers applies here, for the same reasons: the reader of a `spec.md`, a living doc
or a PR body does not run this pipeline, the stage names change when a skill is
refactored, and a citation nothing validates is a second source of truth.

Two consequences worth naming, because both are easy to leak:

- A template's `<!-- -->` comments are instructions to whoever fills it in. They are
  **not** content: they never reach the artifact, and neither do the `[bracketed]`
  placeholders explaining what to write.
- Referencing the **story** is different and stays allowed — `spec-0042` in a decision
  log entry or a flow's `introduced_by` is project traceability, not a signature.

`validate-artifacts.mjs` warns when a story's artifacts break this.

## The artifacts cite paths relative to the project

Every path an artifact writes down is **relative to the project root** —
`work/active/spec-0042/plan.md`, `docs/rules.md`, `apps/api/src/…`. The ecosystem's
own files are the one exception, and they are cited as `~/.agents/…`, which names a
location without naming a machine.

Nobody types `C:\Users\styve\.agents\docs\rules.md` into a spec on purpose. It arrives
as evidence: a validator or a shell prints an absolute path, and the line is quoted
whole into the artifact — where it survives the commit, the review and the archive,
and is false on every clone but the one it was written on.

So the scripts don't print them either. `scripts/lib/paths.mjs` is the one place that
decides how a path is spoken: relative to the working directory, `~/…` outside it but
under home, absolute only when it is neither — at which point the absoluteness is the
finding. The single exception is the `root` field of the `--json` reports, which is
what everything else in them is relative to.

`validate-artifacts.mjs` warns when a story's artifacts carry one anyway. It knows the
four spellings that leak — a Windows drive, a POSIX home, a WSL or Git-Bash mount, a
`file://` URL — and, because the profile tells it where the project root is, it also
catches a project living anywhere else (`/srv/app/…`), which no pattern could tell
from a route. A route (`/api/v1/invoices`), a command (`/sdd-design`) and a `~/…` citation
are not machine paths and never fault.

## Artifact checks

Two scripts answer mechanically what a skill would otherwise judge by eye. Both run
from the project root and resolve the profile themselves.

```bash
node ~/.agents/scripts/status.mjs [<story-id>] [--json] [--all]
node ~/.agents/scripts/validate-artifacts.mjs <story-id> [--strict] [--json] | --all
```

**`status.mjs`** models the pipeline as a dependency graph and computes each stage
from what is on disk, so `/sdd-status` renders an answer instead of deriving one. It also
flags a *regression* — an unfinished stage sitting behind finished ones, where
`/sdd-hotfix` is the way back in.

**`validate-artifacts.mjs`** checks that the artifacts hold their shape: the
structural headings above, AC numbering and scenario form, the traceability table
against `spec.md`'s ACs, every task's `**Files:**` path against the `### File Tree`,
and `## AC Coverage` with zero `✗`. It also warns when an
artifact names the pipeline instead of its subject, or cites a path that only exists
on one machine (the two sections above). It validates only what exists, so a story at
the context stage is not faulted for having no plan.
Exit codes: `0` valid · `1` issues · `2` could not run.

It runs at the gates each skill declares — `/sdd-status`, `/sdd-plan`'s close, `/sdd-sync`'s
`Requires`, and `/healthcheck --all`.

```bash
node ~/.agents/scripts/validate-code-provenance.mjs [<base-ref>] [--working] [--json]
```

**`validate-code-provenance.mjs`** is the same rule applied to the other direction:
the **code** carries no reference to the story that produced it. It reads the added
lines of `BASE_BRANCH...HEAD` and **fails** on any that cite an AC, a task, a `work/`
path or the project's own story id (`STORY_ID_PATTERN`, so `HU-1234` is caught where
that is the spelling). `plan.md` and the docs are exempt — the traceability belongs
there. `/sdd-build` (Step 3.2) and `/sdd-hotfix` (PHASE 6) run it before closing.

It also prints **notes** — never failures — for loose `//` comments on single
properties, the shape `design-principles` asks you to replace with a better name.
That half stays advisory on purpose: a project that adopts JSDoc/TSDoc documents its
properties by standard, and no script can tell which convention is in force. A story
id in code is wrong everywhere; a documented property is wrong only sometimes, and
the difference belongs in the exit code.

## Repository layout

```
skills/       sdd/ (the pipeline) · conventions/ (loaded via stack.SKILLS) · meta/
agents/       provider-agnostic subagents + targets.yaml (native formats)
stacks/       generic · typescript · nestjs — ports.yaml + artifact templates
scripts/      the validators and the sync tools
  lib/        the parsers they share (story, profile, skills, prose)
  hooks/      the guard scripts targets.yaml wires into each provider
  test/       node:test suites — `npm test`
contracts/    PORTS.md · sdd-profile.template.yaml
references/   chat-conventions.md, shared by every skill
```

A guard script lives in `scripts/hooks/` and is referenced from `targets.yaml`
through `{AGENTS_ROOT}`, which `sync-agents.mjs` resolves to this repo's absolute
path at emit time. That indirection is the whole point: a literal path there
works on the machine that wrote it and silently disables the guard everywhere
else — and a control that fails to start is worse than one that isn't declared.

The source tree groups skills by **who owns the knowledge**; the installed tree is
flat and generated, so **skill names must be unique across categories**. Both Claude
Code and OpenCode resolve `<root>/<name>/SKILL.md`, and `sync-skills.mjs` links each
source skill into `~/.claude/skills/<name>` — it only manages links pointing into the
source tree, never silently replacing a real directory it finds there.

Agents declare a `tier` and semantic `capabilities`, naming no concrete model or tool;
`agents/targets.yaml` translates that into each host's native format. Installed files
carry a `GENERATED` marker and the script refuses to overwrite anything without it —
**always edit the source**.

Stack packs are **config + templates only**; all knowledge lives in skills. A project
lists them in `STACK_REFS`, ordered base → specific, and a later pack overrides an
earlier one per port operation and per template file. Without `STACK_REFS`, each skill
falls back to its own generic `references/`.

**Contracts** sit in `contracts/` rather than inside a skill because the packs and the
validators read them: filing them under `/sdd-bootstrap` would have a validator and three
stack packs reaching into one skill's folder for something that is not its property.
The rule: what the tooling validates against lives there; what a single skill consults
lives in that skill's `references/`.
