# Profile guide — the reasoning behind the keys

The template (`~/.agents/sdd-profile.template.yaml`) carries the contract: blocks,
keys and one-line comments. This file carries what doesn't fit in a comment — the
decisions a value encodes and the ones it silently makes for the whole pipeline.

Read it when filling a profile for the first time, when a key's default doesn't fit
the project, or when a skill reports a value it can't act on.

---

## How the skills read a value

The profile is read whole, once, at the start of a run: `Read .agents/profile.yaml`.
There is no per-key lookup command — a skill that needed fifteen values would pay
fifteen shell calls for what one file read already answers.

Because the file is read rather than executed, its **shape is the guarantee**. Three
conventions keep it unambiguous:

| Convention | Meaning |
|---|---|
| A key holds `null` | Not configured. The skill uses the fallback its own contract declares. |
| A key is absent | Same as `null` — but the validator warns, because absence is usually an oversight, not a decision. |
| A key holds a list | Always a list, even with one item. `ITEM_TYPES: [feat]`, never `ITEM_TYPES: feat`. |

`null` never means "unknown". A required key left null is an error the validator
reports, not a gap for a skill to guess its way around.

**Citing keys.** A skill names a key by its bare name — `` `MODULE_ROOT` `` — and adds
the block only when the name alone is ambiguous or the reader needs to find it:
`` `MODULE_ROOT` (stack block) ``. Key names are unique across blocks, so a bare name
always resolves.

**Validate after every edit**, whether you or `/bootstrap` wrote it:

```bash
node ~/.agents/scripts/validate-profile.mjs .agents/profile.yaml
```

The script derives the valid key names from the template, so a key it calls unknown
is either a typo or a key that was never registered. It checks required values,
enums, list types, paths that must exist on disk, and the cross-key rules below.

---

## Language — what ARTIFACT_LANGUAGE governs

`ARTIFACT_LANGUAGE` governs the **prose** of `spec.md`, `context.md`, `design.md`,
`plan.md`, the flow docs, the architecture docs, `docs/decisions.md`, `docs/rules.md`
and the OpenAPI `summary` / `description` fields. When it is null it follows
`OUTPUT_LANGUAGE`. No skill translates to English on its own: what a project writes
in its artifacts is this key's decision.

The key does not govern everything that is not prose — each category for its own
reason:

1. **Structural headings are a contract, not prose.** The skills locate them by
   exact name (`## Acceptance Criteria`, `## Ambiguity Resolution`, `## Global
   Architecture Impact`, `## Design Decisions`, `Task N`), so translating a heading
   breaks the pipeline the same way renaming `plan.md` would. Only the text
   **under** each heading follows `ARTIFACT_LANGUAGE`. English is simply the
   language the contract was written in.
2. **Identifiers are names, not sentences.** Paths, class names, fields, endpoints,
   YAML and frontmatter keys, error codes, table and column names are matched
   verbatim. Whether a team names things in English or another language is
   `IDENTIFIER_LANGUAGE`'s decision (normally English).
3. **The git surface is shared.** Commit messages, PR title and body and branch
   descriptions are prose, but they are history read outside the project — CI,
   other teams, future maintainers. They default to English so the shared record
   stays readable to everyone; this is a convention, not a constraint.

`OUTPUT_LANGUAGE` is separate from all of it: it is what the skills speak in chat —
announcements, questions, reports — and it never touches a file.

---

## The documentation block

The `docs` block points at the living docs **by folder, not by file**. The file
names inside each folder are conventions every skill shares — the same way
`spec.md`, `context.md` and `plan.md` are a fixed contract in the story workspace:

| Key | Points at | Fixed file names inside |
|---|---|---|
| `DOCS_ARCHITECTURE` | the C4 Level 1/2 folder | `context.md`, `containers.md` |
| `DOCS_MODULE` | the folder pattern for per-module docs (e.g. `apps/<app>/docs/`) | `<module>/api.yaml`, `<module>/<artifact>.md` |

The components themselves are not a docs key: they are identified from the stack
block's `MODULE_ROOT` — the folder where the code lives. Its subdirectories are the
components, and a component's docs are `<component>/README.md` and `<component>/docs/`
(the "docs next to the code it describes" rule, which `/sync` enforces as hard).

Because a folder outlives the files inside it, moving or renaming a doc never breaks
the profile. Two decisions ride on top of these pointers.

**The API contract axis** (`API_CONTRACT_MODE`) is `delta` by default **in any
project**: `/design` emits only the item's paths and schemas, and `/sync` merges them
into the module's canonical `api.yaml` — creating it if absent. This is why
`DOCS_MODULE` becomes required under `delta`: without the folder, the merge has no
destination. Switch to `full` only if you'd rather each story carry a complete
`docs/api.yaml` that `/sync` copies as is.

**The docs-as-code axis** is optional and per project. By default the documentation
is per-story Markdown (`DESIGN_OUTPUT_MODE: full`). Adopting docs-as-code means
setting the whole set together:

| Key | Value under docs-as-code |
|---|---|
| `DESIGN_OUTPUT_MODE` | `full-flow` — complete `flows/*.md` with inline `sequenceDiagram` |
| `DOCS_UNIT_FLOWS` | `<unit>/flows/<use-case>.md` |
| `DOCS_UNIT_README` | `<unit>/README.md` — arc42-lite + component `flowchart` (C4 L3) |
| `DIAGRAM_CHECK` (port) | the project's gate, e.g. `npm run docs:validate` |

There is no separate "sync mode": how `/sync` consumes the design delta follows
`DESIGN_OUTPUT_MODE` — `full-flow` replaces each `flows/*.md` whole, `full` copies
the Markdown artifacts as is. One key, one decision.

Half of the set is worse than none of it: `/design` writes flows that `/sync` has
nowhere to put, or `/sync` replaces files nothing produces. The validator refuses a
half-configured pair for exactly this reason.

The `DIAGRAM_CHECK` port is what keeps the diagrams honest — it checks that every
identifier in a diagram names a real symbol in the code. Left unbound, docs-as-code
drifts silently and the diagrams become fiction.

---

## Ports: capabilities, not tools

The `ports` block is the only one that doesn't hold plain values. A skill never names
a tool — it names a capability and calls it, and this block says what provides that
capability here. Swapping Jest for pytest is one line in this block; no skill changes,
because no skill ever knew about Jest.

The full catalog — every port, its operations, its placeholders and which skills
consume it — is `~/.agents/PORTS.md`. Four things decide most of the wiring:

**Most of it is already wired.** Adapters resolve in layers: the stack packs
(`<STACK_REFS>/ports.yaml`, base → specific) carry the stack idiom, and this file
overrides on top, **per operation**. `null` inherits, a list overrides, and `[]`
means "this project genuinely doesn't have that capability — ignore the packs". A
TypeScript project inherits its test runner, its contract linter and its collection
exporter without writing a single command; a NestJS project layers the `nestjs` pack
on top; what almost every project writes is `CI_GATES`, because no two repos run
their gates alike.

The dividing line: if the answer would be the same in any project of this stack, it
belongs in the pack. If it depends on how *this* repo is wired — an nx target, a
custom npm script, a CI entry point — it belongs here. `/bootstrap` reads
`package.json`, the CI workflow and the test config to fill in that second half
rather than asking you for commands the repo already declares.

**Order is preference, not sequence.** Each operation holds a list; the first
*available* adapter wins and the rest are never consulted. `CODE_SURVEY` is the port
where this matters most, because its adapters differ in **depth**:

1. a graph adapter (`mcp:mcp__codegraph__codegraph_explore`) returns call paths and
   blast radius —
   the only depth that answers "what breaks if I change this";
2. `agent:code-explorer` returns a structured inventory without call paths. It is
   global and language-agnostic, so **no per-project installation is needed**;
3. `inline` returns the same inventory, spent against the main context.

`?model=` on an agent adapter is the single point where a project picks the
explorer's model: the skill passes it as the `model` parameter, which takes
precedence over the agent's frontmatter. **Do not duplicate the agent into
`.claude/agents/` just to change its model** — Claude Code replaces the whole
definition rather than merging it, so the copy silently drifts from the global one.

**A failure is not an absence.** If an adapter resolves and then exits non-zero, that
result reaches the skill; the next adapter is *not* tried. Otherwise a red test suite
would fall through to a second runner and be reported green.

**Unbound is a domain decision, not a config one.** A port with no usable adapter
sends the skill to its own `Degrades` row. That is why this block has no
`on_unbound` setting: whether a missing capability is a warning or a full stop
belongs to the skill, and a project cannot turn `/build`'s test gate into a warning
by editing a profile.

---

## The stack packs

`STACK_REFS` is a **list** of pack paths, ordered base → specific. Each pack is a
layer; the later it sits, the more specific it is. **Packs hold configuration and
templates, nothing else** — all knowledge lives in the skills:

| In a pack | What it holds |
|---|---|
| `ports.yaml` | the layer's default port adapters — the first wiring layer |
| `references/` | the artifact templates the skills fill — `context-template.md`, `api-template.md`, `data-model-template.md`, `task-structure-template.md`, `scan-guide.md`, `openapi-to-dto-mapping.md` |

The layers in practice:

- `~/.agents/stacks/typescript/` — the **language ecosystem**: jest adapters, the
  task template (jest flavor). Usable alone by any TS project, NestJS or not.
- `~/.agents/stacks/nestjs/` — the **framework templates**: the Nest-flavored
  artifact templates. Layers on top of a language pack; it contributes no port
  adapters of its own.

The per-framework **knowledge** (DI binding, module blueprint, exception filters,
audit material) is NOT in a pack — it lives in the `nestjs` **skill** (`skills/nestjs/`),
loaded by name through `stack.SKILLS`. That is the responsibility split: skills own
the rules, packs own the wiring and the artifact shapes. A skill never depends on a
pack; a pack only feeds the `<STACK_REFS>/references/...` templates.

A NestJS TypeScript project points at both — `STACK_REFS: [ ~/.agents/stacks/typescript,
~/.agents/stacks/nestjs ]` — and a plain TypeScript project (Express, CLI, frontend)
points at `typescript` only. The list is the reason peras and manzanas no longer mix:
nothing Nest-specific reaches a project that never added the `nestjs` pack, and
nothing Nest-specific is loaded as knowledge unless `stack.SKILLS` names `nestjs`.

**Resolution** — for any resource (`ports.yaml` operation or `references/<file>`),
search the packs from the **most specific (last) to the least (first)**; the first
pack that provides it wins, and what no pack provides falls back to each skill's own
local `references/`, which are stack-generic. When `STACK_REFS` is null there is no
pack layer at all — skills use those generic templates and inherit no adapters.

**Stack knowledge is not a profile key, and it is not a pack key either.** How this
stack injects a dependency, shapes a DTO or lays out a module is documented in the
framework skill's own files — the `nestjs` skill's `references/nestjs-binding.md`
spends a section on *why* ports are abstract classes rather than interfaces;
`<STACK_REFS>/references/openapi-to-dto-mapping.md` carries the full field-by-field
mapping; `<STACK_REFS>/references/scan-guide.md` says what to read and what to skip
per file type. A one-line key summarizing any of them adds nothing a
skill can act on and creates a second version to keep in sync. When a skill needs that
knowledge, it reads the document.

This is also why the profile declares no injection style, no DTO shape and no survey
target list: the
question "how does this stack do X" is never a project setting. What *is* a project
setting is which stack you are on (`LANGUAGE`, `FRAMEWORK`, `STACK_REFS`) and where
its code lives (`MODULE_ROOT`).

---

## MCP servers

`mcp.EXPECTED` lists the MCP servers the pipeline relies on. The harness is what
actually provides them (`.mcp.json`); this key only declares which ones matter here,
which buys two things:

1. **An `mcp:` adapter can be checked.** Adapter names follow the harness convention
   `mcp__<server>__<tool>` (Claude Code; opencode spells the same tool `<server>_<tool>`,
   e.g. `codegraph_codegraph_explore`), so the validator extracts the server and
   confirms it is expected. An adapter naming a server nobody declared would never be available, and
   the port would silently fall through to a shallower one forever.
2. **`/healthcheck` can report a missing server** instead of leaving you to wonder why
   surveys got shallow.

A pack may offer an `mcp:` adapter the project hasn't declared — `CODE_SURVEY` ships
with `mcp:mcp__codegraph__codegraph_explore` first in both packs. That is an
*opportunity*, not
a requirement: without `codegraph` in `EXPECTED` the adapter is skipped and the chain
moves to the agent, and the validator says so as a note. Declaring it in the profile's
own `ports` while leaving it out of `EXPECTED` is a different thing — a file
contradicting itself — and that is an issue.
