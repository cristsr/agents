# SDD Pipeline — central catalog

The source of truth for how the SDD flow is composed: order, dependencies, and what
each skill reads from the profile. The operational detail lives in each `SKILL.md` —
this is the map. Validate the ecosystem with `/healthcheck`.

## Flow

```
/spec → /prepare → /clarify → /design → /plan → /build → /sync → /commit
        (only if    (RPI: surveys,
         the base    decides and
         isn't       writes
         fresh)      spec.md + context.md)
```

- **`/clarify`** absorbed the survey: a single Research → Plan → Implement pass
  produces the precise `spec.md` **and** the `context.md`. There is no intermediate
  scan step.
- **`/scan`** remains as the **refresh** skill: it regenerates only `context.md` when
  the code changed and the ACs didn't. Outside the normal flow.
- **`/forge`** chains `/plan` → `/build` → `/sync` without pauses (requires an
  approved design).
- **`/hotfix`** fixes post-build defects originating in ambiguous ACs.
- **`/refine`** adjusts existing artifacts without regenerating them.
- **`/status`** diagnoses which stage an item is in.
- **`/healthcheck`** validates skills ↔ profile ↔ packs consistency.

## Pipeline skills

| Skill | Input | Output | Next |
|---|---|---|---|
| `/spec` | raw text or a tracker export (feature, bug, debt, incident, chore) | `spec.md` (typed) | `/prepare` or `/clarify` |
| `/prepare` | item or components | fresh base (`BASE_BRANCH`) | `/clarify` |
| `/clarify` | `spec.md` | `spec.md` with precise ACs + a decision log, and `context.md` with the survey | `/design` |
| `/design` | `spec.md` + `context.md` | `design.md` + `docs/` (contract, model, diagrams) | `/plan` |
| `/plan` | design artifacts | `plan.md` (TDD tasks) | `/build` |
| `/build` | `plan.md` | code + green tests, tasks `[X]`, `## AC Coverage` in `plan.md` | `/sync` |
| `/sync` | closed story | module docs reconciled, `work/done/` | `/commit` |
| `/commit` | `work/done/` | commits + drafted PR (no push) | the user |

## Support skills

| Skill | Role |
|---|---|
| `/bootstrap` | creates/updates `.agents/profile.yaml` |
| `/rules` | non-negotiable rules (`docs/rules.md`, validated by `validate-rules.mjs`) |
| `/docs` | C4 Level 1/2 (`docs/architecture/`) — invoked by `/sync` |
| `/healthcheck` | validates the ecosystem (script + checks) and every active story's artifacts |
| `/status` | stage diagnosis for an item, computed by `scripts/status.mjs` |
| `/scan` | refreshes `context.md` when the code changed (not a flow step) |
| `/hexagonal-architecture` | BUILD — hexagonal structure (rules in `references/rules.md`, framework dialect in the `nestjs` skill) |
| `/hexagonal-audit` | AUDIT — 13 dimensions, ranked report + generates `spec.md` files in `work/active/` (bridge into the pipeline) |

## Skills (source layout)

The source tree groups skills by **who owns the knowledge**, not by invocation name:

```
skills/
├── sdd/              the pipeline and everything that operates on a story
│                     bootstrap · rules · spec · prepare · clarify · design
│                     plan · build · sync · commit · forge
│                     status · scan · refine · hotfix · docs
├── conventions/      never invoked by hand — loaded through `stack.SKILLS`
│                     typescript · nestjs · error-handling · design-principles
│                     hexagonal-architecture · hexagonal-audit
└── meta/             skills about the ecosystem itself
                      skill-creator · skill-evaluator · healthcheck
```

That layout is for the human reading the repo. **Both Claude Code and OpenCode
resolve `<root>/<name>/SKILL.md` in a single level**, so the installed tree is flat
and generated:

```bash
npm run skills:sync:check   # dry-run: what would change
npm run skills:sync         # write the symlinks
npm run skills:sync -- --prune
```

`sync-skills.mjs` links each source skill into `~/.claude/skills/<name>` — one
destination for both tools, since OpenCode reads that path alongside its own. It
only manages links pointing **into** the source tree: a real directory found in the
destination is reported, never silently replaced (that is how a hand-made copy
silently diverges), and `--prune` removes only the orphans it would have created.

Because the destination is flat, **skill names must be unique across categories** —
`validate-skills.mjs` fails on a duplicate. Nothing else depends on the layout: a
skill is any directory holding a `SKILL.md`, at whatever depth, and cross-skill
citations name the skill ("the `nestjs` skill's `references/…`"), never its path. So
a category can be renamed or a skill moved between groups with a re-run and no edits.

## Agents (subagents)

The agents live in `agents/<name>.md` with **provider-agnostic** frontmatter: they
declare a `tier` (`reasoning`/`balanced`/`fast`) and semantic `capabilities`
(`read`, `search`, `shell:readonly`, `skills`, …), naming no concrete models or
tools.

`agents/targets.yaml` translates that into each tool's native format — model alias
and `tools` in Claude Code, `provider/model-id` and `permission` in OpenCode, which
here runs against a local LM Studio. A new model is a cell change; a new provider is
a block.

```bash
npm run agents:check     # dry-run: what would change
npm run agents:sync      # writes the native formats
npm run agents:sync -- --target=opencode --prune
```

The installed files carry a `GENERATED by sync-agents` marker: the script never
overwrites a file without that marker, never writes over a symlink, and `--prune`
only deletes orphans it generated itself. **Always edit the source**, never the
installed file.

> The `tier` is a default. The caller may pass an explicit `model` (e.g. the
> profile's `CODE_SURVEY` adapter) and it takes precedence — which is advisable:
> some versions ignore the frontmatter field.

## The profile

`.agents/profile.yaml` at the project root is the only thing that adapts these global
skills to a project. It is YAML: a `SCHEMA_VERSION` plus nine named blocks —
`identity`, `items`, `intake`, `paths`, `language`, `vcs`, `stack`, `docs`, `mcp` —
holding uppercase keys, plus `ports`, holding the adapters described below.

It declares only what the skills actually read. Artifact file names (`spec.md`,
`context.md`, `design.md`, `plan.md`) are a contract between skills, not settings, and
stack knowledge — injection, DTO shape, what a survey locates — is not configuration
at all: it lives in the pack's documents and the convention skills, in prose. Skills cite a key by bare name (`MODULE_ROOT`) and add the block only
when it helps the reader find it (`MODULE_ROOT`, stack block).

A key holding `null` is **not configured**: the skill uses the fallback its own
contract declares. It never means "unknown" — a required key left null is an error,
not an invitation to guess.

- Template: `~/.agents/sdd-profile.template.yaml`
- Created and updated by `/bootstrap`
- Validated by `node ~/.agents/scripts/validate-profile.mjs .agents/profile.yaml`,
  which `/bootstrap` runs on write and `/healthcheck` runs on demand
- The reasoning behind the values: `~/.agents/skills/sdd/bootstrap/references/profile-guide.md`

## Profile keys per skill

| Skill | Keys it reads |
|---|---|
| `spec` | `STORY_ID_MODE`, `STORY_ID_PATTERN`, `STORY_KEY_PATTERN`, `STORY_ID_LEGACY_PREFIXES`, `ITEM_TYPES`, `TRACKER`, `INTAKE_FORMATS`, `WORKDIR_ACTIVE`, `OUTPUT_LANGUAGE` |
| `prepare` | `WORKING_DIRECTORY`, `BASE_BRANCH`, `REPO_TOPOLOGY`, `PREP_SKILL`, `STORY_ID_PATTERN`, `WORKDIR_ACTIVE` |
| `clarify` | `STORY_ID_PATTERN`, `WORKDIR_ACTIVE`, `OUTPUT_LANGUAGE`, `COMPONENT_TERM`, `BASE_BRANCH`, the `stack` block, the `docs` block, `STACK_REFS` · ports: `CODE_SURVEY` |
| `scan` (refresh) | the same as `clarify` minus the decision ones — it doesn't read the authority rubric |
| `design` | `STORY_ID_PATTERN`, `WORKDIR_ACTIVE`, `OUTPUT_LANGUAGE`, `API_CONTRACT`, `DIAGRAM_FORMAT`, `DESIGN_OUTPUT_MODE`, `API_CONTRACT_MODE`, the `stack` block, `STACK_REFS` · ports: `CONTRACT_LINT`, `DIAGRAM_CHECK`, `CONTRACT_DIFF` |
| `plan` | the complete design + `TEST_FRAMEWORK`, `API_CONTRACT`, `STACK_REFS` · ports: `TESTS` |
| `build` | `plan.md`, `TEST_FRAMEWORK`, `STACK_REFS` · ports: `TESTS`, `API_CLIENT_EXPORT` |
| `sync` | `STORY_ID_PATTERN`, `WORKDIR_ACTIVE`/`WORKDIR_DONE`, `BASE_BRANCH`, `API_CONTRACT_MODE`, `DESIGN_OUTPUT_MODE`, the `docs` block · ports: `CI_GATES`, `CONTRACT_DIFF`, `DIAGRAM_CHECK` |
| `commit` | `STORY_ID_PATTERN`, `WORKDIR_DONE`, `BASE_BRANCH`, `OUTPUT_LANGUAGE` |
| `forge` | plan/build/sync inputs + `BASE_BRANCH` |
| `hotfix` | `plan.md`/`spec.md`, the `stack` block, `STACK_REFS` · ports: `TESTS` |
| `refine` | artifacts + `API_CONTRACT_MODE` (for `<api-artifact>`) |
| `docs` | `PROJECT_NAME`, `DIAGRAM_FORMAT`, `OUTPUT_LANGUAGE`, `WORKDIR_DONE`, `DOCS_ARCHITECTURE` · ports: `PROJECT_GRAPH` |

> On top of its own row, **every skill that writes an artifact also reads
> `ARTIFACT_LANGUAGE`** (language block) — see "Language" below.

## Language

Three axes, three profile keys (language block) — no skill decides the language on its own:

| Axis | Key | Covers |
|---|---|---|
| Conversation | `OUTPUT_LANGUAGE` | announcements, escalation questions, closing reports |
| Artifact prose | `ARTIFACT_LANGUAGE` | `spec.md`, `context.md`, `design.md`, `plan.md`, flow docs, architecture docs, `decisions.md`, `rules.md`, OpenAPI `summary`/`description` |
| Identifiers | `IDENTIFIER_LANGUAGE` | paths, classes, fields, endpoints, YAML/frontmatter keys, table and column names |

**Structural section headings stay in English regardless of `ARTIFACT_LANGUAGE`.**
They are a contract between skills — `/sync` looks for `## Global Architecture Impact`
and `## Design Decisions` in `design.md` and for `## AC Coverage` in `plan.md`,
`/clarify` writes `## Ambiguity Resolution` in `spec.md`, `/build` and `/hotfix`
locate `Task N` in `plan.md`. Translating a heading breaks the pipeline; only the
text **under** it follows `ARTIFACT_LANGUAGE`.

That contract is now **enforced**, not just declared: `validate-artifacts.mjs` parses
those headings and fails when one is missing, mistranslated or inconsistent with
another artifact (see "Artifact checks" below).

**The git surface stays in English too**: commit messages, PR title and body, and
branch descriptions (`/commit`, `/plan` Task 0) — shared history read outside the
project.

The `SKILL.md` files themselves are written in English, and so are the message
samples inside them; they get rendered in the user's language at runtime.

## Ports (profile, ports block)

A skill never names a tool. It names a **capability** — a port — and the wiring says
which command, agent or MCP tool implements it here:

`TESTS` · `CI_GATES` · `CONTRACT_LINT` · `CONTRACT_DIFF` · `DIAGRAM_CHECK` ·
`API_CLIENT_EXPORT` · `PROJECT_GRAPH` · `CODE_SURVEY`

Each port holds one ordered adapter list per operation, and the first **available**
adapter wins. An adapter that resolves and then fails is a real failure: it reaches
the skill, and the next adapter is not tried. A port with no usable adapter is
**unbound**, and the skill applies the degraded behavior its own `Degrades` row
declares — the profile never decides that.

Adapters resolve in **layers**: the stack packs (`<STACK_REFS>/ports.yaml`, base →
specific) hold the stack idiom, the profile overrides on top, per operation — `null`
inherits, a list overrides, `[]` disables. So a project on a known stack starts
already wired, and its profile only carries what is specific to that repo.

The catalog — operations, placeholders and consumers — is `~/.agents/PORTS.md`.

## Artifact checks (scripts)

Two scripts read a story's workspace and answer mechanically what a skill would
otherwise infer by eye. Both run from the project root, resolve `.agents/profile.yaml`
themselves, and degrade to documented fallbacks when there is none.

```bash
node ~/.agents/scripts/status.mjs [<story-id>] [--json] [--all]
node ~/.agents/scripts/validate-artifacts.mjs <story-id> [--strict] [--json]
node ~/.agents/scripts/validate-artifacts.mjs --all
```

**`status.mjs` — where the story is.** The pipeline is modeled as a dependency graph:
each stage declares what it `requires`, and the status of each (`done` / `ready` /
`blocked`) is computed from what is on disk. The first `ready` entry is the artifact
to write next, so `/status` renders an answer instead of deriving one. It also flags a
**regression** — an unfinished stage sitting behind finished ones, where re-running
the stage would discard built work and `/hotfix` is the way back in.

**`validate-artifacts.mjs` — whether the artifacts hold their shape.** It validates
only what exists (a story at `context` stage is not faulted for having no plan), and
checks across artifacts, which is where the contract actually breaks:

| Artifact | What it checks |
|---|---|
| `spec.md` | front-matter `type` against `ITEM_TYPES`; `## Acceptance Criteria` present with `### AC-N:` headings numbered in order; no empty AC body; `#### Scenario:` blocks carry both `**WHEN**` and `**THEN**`; `## Ambiguity Resolution` once `context.md` exists; no `[NEEDS CLARIFICATION]` marker left after `/clarify` |
| `design.md` | `## Global Architecture Impact` present **and** carrying a yes/no answer `/sync` can act on |
| `plan.md` | `### AC → Task traceability` covering every AC in `spec.md` (and listing none that no longer exists); `Task 0` first, task numbering continuous; once every task is `[X]`, an `## AC Coverage` with one line per AC and zero `✗` |
| archived | a story under `WORKDIR_DONE` with unchecked tasks — the equivalent of validating what was closed |

Where they run: `/status` (Step 1) computes the stage; `/plan` (Step 5) checks the
plan it just wrote; `/sync` (`Requires`) gates the close-out; `/healthcheck`
(Step 3.5) sweeps every active story with `--all`. `--strict` promotes warnings to
issues. Exit codes match the other validators: `0` valid · `1` issues · `2` could not
run.

## Per-stack packs (`STACK_REFS`)

Pack layers in `~/.agents/stacks/<stack>/`, listed in a profile as
`STACK_REFS: [ <base>, <specific>, … ]` — the later a pack sits, the more specific it
is, and it overrides the earlier ones per port operation and per template file. Packs
are **config + templates only**; all knowledge lives in skills:
- `ports.yaml`: the layer's default port adapters — the first wiring layer, inherited
  by every project whose `STACK_REFS` includes this pack.
- `references/`: `api-template`, `data-model-template`, `scan-guide`, `context-template`,
  `task-structure-template`, `openapi-to-dto-mapping` — the generic pack carries them
  all; a specific pack only overrides the ones it flavors.

Current packs: `generic` (fallback), `typescript` (language), `nestjs` (framework).
A NestJS TS project reads `[ ~/.agents/stacks/typescript, ~/.agents/stacks/nestjs ]` —
the `typescript` pack alone serves any TS project without Nest. Without `STACK_REFS`
→ each skill's local (generic) `references/`.

The per-framework concretion is a **skill**, not a pack: `skills/nestjs/` carries the
binding syntax, module blueprint, exception filters and audit material, loaded by name
through `stack.SKILLS`. Skills own the rules; packs own the wiring and the artifact
shapes — a skill never depends on a pack.

## Recent changes

See the git history of `~/.agents` (the ecosystem's commits).
