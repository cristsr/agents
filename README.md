# SDD — a spec-driven development pipeline for coding agents

This repository is the ecosystem: **skills** (the pipeline stages and the convention
guides), **agents** (the subagents those stages delegate to), **stack packs**
(per-language wiring and artifact templates), **scripts** (the validators) and
**contracts** (what all of the above agree on).

The skills are global — installed once, they work on any project. One file adapts them
to each one: `.agents/profile.yaml` at the project root, created by `/bootstrap`.
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
without writing. Then, from a project: `/bootstrap` to create its profile, and
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
/spec → /prepare → /clarify → /design → /plan → /build → /sync → /commit
```

| Skill | Input | Output |
|---|---|---|
| `/spec` | raw text or a tracker export (feature, bug, debt, incident, chore) | `spec.md`, typed |
| `/prepare` | the item | a fresh base branch + the story's working branch (`.branch`) |
| `/clarify` | `spec.md` | precise ACs with scenarios, a decision log, `context.md`, and the story's `build_mode` |
| `/design` | `spec.md` + `context.md` | `design.md` + `docs/` (contract, model, diagrams) |
| `/plan` | the approved artifacts | `plan.md` — numbered tasks, each with its verification |
| `/build` | `plan.md` | code + green checks, tasks `[X]`, `## AC Coverage` |
| `/sync` | the closed story | module docs reconciled, workspace moved to `work/done/` |
| `/commit` | `work/done/` | commits + a drafted PR (never pushes) |

Two stages are conditional: `/prepare` only if the base isn't fresh, and `/design`
only in the TDD carril (see "Build modes"). `/clarify` absorbed the old survey step —
it produces the precise `spec.md` **and** `context.md` in one pass.

**Support skills:** `/forge` (chains plan → build → sync unattended) · `/hotfix`
(post-build defect traced to an ambiguous AC) · `/refine` (targeted artifact
corrections) · `/scan` (refresh `context.md` alone) · `/status` (where a story sits) ·
`/healthcheck` (validate the ecosystem) · `/rules` (the project's non-negotiables) ·
`/docs` (C4 Level 1/2) · `/bootstrap` (the profile) · `/hexagonal-audit` (turns
architecture debt into draft stories).

## Build modes

A story declares its carril in `spec.md`'s front matter. `/clarify` resolves it, and
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
| `/design` | required | skipped |
| Implementation order | the sequence diagram | dependencies between deliverables |
| Per-task cycle | red → implement → green | (baseline) → change → check green |
| Verification port | `TESTS` | `VERIFY` |
| An `## AC Coverage` line points at | a test | the command that proves it |

Unchanged in both: `Task 0`, the AC → Task traceability table, the `[P]` groups, and
the rule that a `✗` in `## AC Coverage` is an unfinished build.

**The guardrail — three layers, only the first configurable.** The relaxed carril is
deliberately hard to reach: the item's `type` must be in `EVIDENCE_MODE_TYPES`
(profile, default `[debt, chore, incident]`); `spec.md` must carry a non-empty
`## Build Mode Rationale`; and `validate-artifacts.mjs` plus `/plan`'s step 0 reject
the story mechanically when either fails. A fourth follows from the port model:
`VERIFY` unbound **stops** the run rather than degrading to "reviewed by eye". And
`/clarify` may never choose `evidence` on its own — it is always returned as a
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
`skills/sdd/bootstrap/references/profile-guide.md`.

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

**Structural headings stay in English regardless.** They are a contract between
skills, parsed by name: `## Acceptance Criteria`, `## Ambiguity Resolution`,
`## Build Mode Rationale`, `## Technical Context`, `## Global Architecture Impact`,
`## Design Decisions`, `### AC → Task traceability`, `## AC Coverage`, and `Task N`.
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

## Artifact checks

Two scripts answer mechanically what a skill would otherwise judge by eye. Both run
from the project root and resolve the profile themselves.

```bash
node ~/.agents/scripts/status.mjs [<story-id>] [--json] [--all]
node ~/.agents/scripts/validate-artifacts.mjs <story-id> [--strict] [--json] | --all
```

**`status.mjs`** models the pipeline as a dependency graph and computes each stage
from what is on disk, so `/status` renders an answer instead of deriving one. It also
flags a *regression* — an unfinished stage sitting behind finished ones, where
`/hotfix` is the way back in.

**`validate-artifacts.mjs`** checks that the artifacts hold their shape: the
structural headings above, AC numbering and scenario form, the traceability table
against `spec.md`'s ACs, and `## AC Coverage` with zero `✗`. It validates only what
exists, so a story at the context stage is not faulted for having no plan. Exit codes:
`0` valid · `1` issues · `2` could not run.

It runs at the gates each skill declares — `/status`, `/plan`'s close, `/sync`'s
`Requires`, and `/healthcheck --all`.

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
validators read them: filing them under `/bootstrap` would have a validator and three
stack packs reaching into one skill's folder for something that is not its property.
The rule: what the tooling validates against lives there; what a single skill consults
lives in that skill's `references/`.
