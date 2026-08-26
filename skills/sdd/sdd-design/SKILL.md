---
name: sdd-design
description: >
  Reads spec.md and context.md to produce an API-first technical design: the
  OpenAPI contract (a story-scoped delta, or the full file — API_CONTRACT_MODE),
  the diagrams (a per-story sequence diagram plus a C4 Level 3 component doc, or
  one document per use case with its Mermaid inline — DOC_UNIT), a data
  model if a table changes, and design.md. /sdd-sync reconciles it into the unit's
  living docs.
  Use when the user says "/sdd-design spec-XXXX", "design the story", "create the
  design", "technical specification", or has completed /sdd-clarify and wants to
  define what to build.
  Do NOT use before /sdd-clarify is complete. Do NOT use for planning tasks (use /sdd-plan).
  Do NOT use for system-wide architecture (C4 Level 1/2 — actors, external
  systems, apps/microservices) — that's /sdd-docs, invoked by /sdd-sync.
---

# design

## Overview

Read the story requirements and the existing codebase context, resolve any
ambiguities about new data through targeted questions, and produce the contract
API-first (`API_CONTRACT`, e.g. OpenAPI 3.1): `<api-artifact>` is approved
**before** any code exists — `/sdd-plan` generates the DTOs that conform to it, never
the reverse.

**The skill runs in the main agent, start to finish** — it loads the context, asks the
PHASE 3 questions, writes every artifact, and verifies its own output through the
`CONTRACT_LINT` and `DIAGRAM_CHECK` ports.

> **Why not a drafting subagent:** designing is one sequential actor's job, and this
> document is its instructions. A subagent would have to re-read this file cold, then
> hand its state to a second cold subagent — paying the whole context twice over for
> work that has no parallelism to win back. Delegate for fan-out or for discardable
> bulk, never to move sequential work off your own desk.

**Announce at start:** "Designing the technical specification for spec-<number>."

**Output** — two independent axes, both in the profile (docs block):

**Axis 1 — `API_CONTRACT_MODE` (OpenAPI contract, default `delta`):**
- `delta` (default): `work/active/spec-<number>/docs/api.delta.yaml` — **only** the paths
  and schemas the item adds or changes (grouped by module/tag). `/sdd-sync` merges it into
  the module's canonical `api.yaml` (creating it if it doesn't exist).
- `full`: `work/active/spec-<number>/docs/api.yaml` — the complete contract per story;
  `/sdd-sync` copies it as is.

**Axis 2 — `DOC_UNIT` (what one document describes, default `story`):**
- `story` (default): `docs/diagram.md` + `docs/component.md`, scoped to this item.
- `use-case` (living documents per use case; the notation is `DIAGRAM_FORMAT` and the
  document's shape comes from the pack's `flow-template.md`):
  a complete `docs/flows/<use-case>.md`, with its `sequenceDiagram` inline — one file
  per use case touched, which `/sdd-sync` replaces in the unit's living docs.

In both modes the following are also produced, where applicable:
- `work/active/spec-<number>/docs/research.md` — technical alternatives evaluated + rationale (only if there are non-trivial decisions)
- `work/active/spec-<number>/docs/data-model.md` — entity + migration (only if a new table/data type is involved)
- `work/active/spec-<number>/design.md` — narrative summary + affected flows + quality gates validation

---

## Project profile (read first, always)

Read `.agents/profile.yaml` from the project root before anything else, as
`~/.agents/references/project-profile.md` describes: what a missing file means, how a
`null` key falls back, how a port resolves to an adapter, and why every path or command
shown here is only an example the profile overrides. The keys this skill reads are
listed under **Profile keys** in the `Contract` below.

---

## Contract

What this skill needs, what it guarantees to the next stage, and what it may not do.
**Check every `Requires` row before any other work** — a failed precondition stops
the design at the start, not halfway through a contract.

> **This skill does not run in `build_mode: evidence`.** When `spec.md`'s front matter
> declares that carril, the story has no API contract, no sequence diagram and no data
> model to produce, and `/sdd-plan` does not require any of them — the pipeline goes
> `/clarify → /sdd-plan`. If you are invoked on such a story, say so and stop; the story is
> not missing a step. Changing the carril is `/sdd-refine` on `spec.md`, not a design run.

**Requires**

| Condition | Check | If it fails |
|---|---|---|
| You are in the project's working directory | `pwd` == `WORKING_DIRECTORY` (absolute path, from the profile) | `cd` there before running anything |
| `spec.md` exists | `[ -f work/active/spec-<number>/spec.md ]` | Stop: "I couldn't find `work/active/spec-<number>/spec.md`. Run `/spec spec-<number>` first." |
| `context.md` exists | `[ -f work/active/spec-<number>/context.md ]` | Stop: "I couldn't find `work/active/spec-<number>/context.md`. Run `/clarify spec-<number>` first." |
| **Ambiguity gate:** zero unresolved markers | `grep -c 'NEEDS CLARIFICATION' work/active/spec-<number>/spec.md` returns `0` | Stop, do not design: "`spec.md` still has `<N>` unresolved `[NEEDS CLARIFICATION]` markers. Designing a contract on top of ambiguities produces potentially incorrect DTOs and behaviors. Run `/clarify spec-<number>` to resolve them before `/sdd-design`." |

`/sdd-clarify` closes its own run with that same `grep -c` at `0`. A spec that still
carries markers is therefore a spec `/sdd-clarify` never finished: the gate catches a
broken handoff, and no marker is minor enough to design past.

**Produces** — this is what `/sdd-plan` and `/sdd-sync` look for

- `design.md` with `## Global Architecture Impact`, **always present, never
  conditional**: Yes/No and, if Yes, the C4 level plus the concrete node/edge.
  `/sdd-sync` reads this section by name and hands it to `/sdd-docs` verbatim — it
  re-derives nothing from the diff (drafting PHASE 4, File 4).
- `design.md` with `## Design Decisions` whenever PHASE 3 resolved at least one
  unknown — omitted entirely, never left as an empty header, when it resolved none.
  `/sdd-sync` copies it verbatim into the cumulative `docs/decisions.md`.
- `design.md` with `## Module Components`, the endpoint table per <component>,
  `## Quality Gates Validation` (for the PHASE 5 review), and `## Data Modeling`
  **if and only if** `docs/data-model.md` exists — `/sdd-plan` stops when that pairing
  is broken.
- `<api-artifact>` — `docs/api.delta.yaml` if `API_CONTRACT_MODE = delta`,
  `docs/api.yaml` if `full` — having passed all 5 post-generation checks, zero
  unreplaced `<placeholder>` matches among them. `/sdd-plan` reads it as the source of
  truth for DTOs, never `design.md`. Checks 2-5 run with the file tools as PHASE 4
  writes the artifact; Check 1 (`CONTRACT_LINT`) and the diagram gate run afterwards,
  in step 5.
- The diagram artifacts the mode dictates — `<flow-artifact>` in the terms `/sdd-plan`,
  `/sdd-refine` and `/sdd-hotfix` use to require it: `docs/diagram.md` + `docs/component.md`
  when `DOC_UNIT = story`; `docs/flows/<slug>.md`, each carrying its inline
  `sequenceDiagram`, when `use-case`.
- `docs/data-model.md` and `docs/research.md` only where they apply.

Two of those guarantees are **countable, not a matter of judgment**, and both are
checked by running a command rather than by re-reading the artifact: the ambiguity
gate in `Requires` (`grep -c 'NEEDS CLARIFICATION'` = `0`, so every design rests on a
spec with no open markers) and Check 2 of the contract validation (`grep -n '<[a-z]'`
over `<api-artifact>` = no matches). One marker or one placeholder left is a stop.

`## Design Decisions` and `## Global Architecture Impact` are structural headings —
`/sdd-sync` looks them up literally. Translating either one breaks the close-out.

**Writes** — nothing outside this list

- `work/active/spec-<number>/design.md`
- `work/active/spec-<number>/docs/` — `<api-artifact>`, `diagram.md`,
  `component.md`, `flows/*.md`, `data-model.md`, `research.md`

Not `spec.md` or `context.md` (that's `/sdd-clarify`, or `/sdd-refine` for a correction), not
`plan.md` (that's `/sdd-plan`), not the unit's living docs (that's `/sdd-sync` — this skill
only *reads* them, in drafting PHASE 4 step 2), and not `DOCS_ARCHITECTURE`: C4
Level 1/2 belongs to `/sdd-docs`.

**Never** — regardless of how obvious the field or the name looks

- Write a field into `<api-artifact>` or `docs/data-model.md` that comes from neither
  `context.md` nor an answer recorded in `## Design Decisions`.
- Mint a new flow when the `entrypoint`/`command`/`operationId` already exists in the
  living docs — that is a `modify`, never a `create` (drafting PHASE 4, step 2).
- Rename a diagram node to make `DIAGRAM_CHECK` pass. The gate failing on a class
  this item is about to create is expected; record it as a known risk instead.
- Regenerate `docs/component.md` from scratch when the module already has one — it
  accumulates across stories and gets updated surgically.

**Escalates**

- PHASE 3, at most 5 unknowns, one `AskUserQuestion` call each: anything that blocks
  a DTO, a contract or a behavior, plus any doubt about whether the story touches
  global architecture. The unknowns come from PHASE 2, each with a recommended
  answer. Writing a vague
  `## Global Architecture Impact` instead of asking is not an option — `/sdd-sync` and
  `/sdd-docs` apply that answer verbatim.
- A create-vs-modify call that is genuinely ambiguous: confirm with the user in
  PHASE 5 before closing.
- A Quality Gate that is ⚠️: PHASE 4.5 records the table; the exception needs the
  user's approval in PHASE 5 — a violated principle is never a silent choice.

**Degrades** — none of the three ports blocks the design; each falls back to manual
and leaves the mark in `design.md`:

- `CONTRACT_LINT` unbound → review `<api-artifact>`'s syntax by hand (step 5,
  Check 1 fallback).
- `DIAGRAM_CHECK` unbound → review the diagram identifiers by hand, and note in
  `design.md` that there was no automatic validation.
- `CONTRACT_DIFF` unbound → no automatic breaking-change classification; note in
  `design.md` that `/sdd-sync` compares the contracts manually.
- `stack.SKILLS` unset/empty → load only what the project's
  `conventions.md`/`CLAUDE.md` require.

**Reverting** — a re-run rewrites `design.md` and everything under `docs/`, and two of
those are not story-scoped:

| Artifact | What a re-run costs |
|---|---|
| `docs/component.md` | It **accumulates across stories** (see `Never`). Regenerating it from scratch silently drops the components earlier stories added — the loss is invisible in the summary, which reports only this story's work |
| `docs/flows/<slug>.md` under `use-case` | A `modify` that gets written as a `create` leaves the unit with two documents for one flow, and `/sdd-sync` promotes both |

Before re-running on a story that already designed, confirm the previous artifacts are
recoverable from git. When they are not, read `component.md` and the existing flows
first and update them surgically, which is what `Never` requires anyway.

**Ports** — `CONTRACT_LINT`, `DIAGRAM_CHECK`, `CONTRACT_DIFF`: the gates over the
produced artifacts. This skill names capabilities, never tools — which command
implements each one is the profile's `ports` block. `CONTRACT_LINT` and
`DIAGRAM_CHECK` run in step 5's verification; `CONTRACT_DIFF` is `/sdd-sync`'s.

**Profile keys**

- `STORY_ID_PATTERN`, `WORKDIR_ACTIVE` — the story's id and workspace, written
  throughout this document as `spec-<number>` and `work/active/spec-<number>/`
- `WORKING_DIRECTORY` — the directory gate in `Requires`
- `API_CONTRACT`, `API_CONTRACT_MODE` — the contract's notation and whether the story
  emits a delta or a full file ("PHASE 4 — API contract")
- `DOC_UNIT`, `DIAGRAM_FORMAT` — which diagram artifacts to emit, in what
  notation
- `DOCS_MODULE`, `DOCS_UNIT_FLOWS`, `DOCS_UNIT_README`, `DOCS_ARCHITECTURE` — the
  living docs read for the reconciliation lookup (drafting PHASE 4, step 2) and the
  destinations `/sdd-sync` promotes to (docs block)
- `COMPONENT_TERM`, `ORM`, `MIGRATIONS`, `STACK_REFS` and the stack block — the term for a
  deployable unit, the persistence stack, and the per-stack templates (resolved across
  the listed packs, most specific first, generic fallback)
- `SKILLS` (stack block) — the best-practice skills to load before drafting (step 4)
- `ARTIFACT_LANGUAGE`, `OUTPUT_LANGUAGE`, `IDENTIFIER_LANGUAGE` — see "Output language"

---

## Flow

Run these six steps. Steps 2, 4 and 5 are the drafting PHASEs documented below
(1, 2, 3.5, 4, 4.5); you execute them yourself, in this same session.

### Step 1 — Preconditions (Requires)

Check every `Requires` row above. Any failure → stop with the listed message.

### Step 2 — Run PHASE 1 and PHASE 2

Load the context (PHASE 1) and identify the unknowns (PHASE 2). You come out holding
the unknowns to ask (max 5, each with a recommended answer), the reconciliation
inventory, and the Global Architecture Impact doubt.

If the context is too broken to analyze at all, stop here and take the blocker to the
user — don't design on top of it.

### Step 3 — Resolve the unknowns (PHASE 3)

For each unknown from PHASE 2, in priority order, ask ONE question at a time
with the `AskUserQuestion` tool — one call per unknown, never batched, since the
answer to one can change whether the next is even still relevant. Use your
recommended answer as the first option, labelled " (Recommended)".

- `question`: the unknown phrased as a direct question.
- `header`: a short label (max 12 chars) naming the unknown (e.g. "Pagination", "New field").
- `options`: 2-4 mutually exclusive choices, recommended first with " (Recommended)".
  The tool always offers an implicit "Other" — do not add one yourself.
- If the unknown has no natural discrete options (a specific value like a field name),
  ask it as a normal text question instead of forcing it into `AskUserQuestion`.

Rules: maximum 5 questions total across the whole session; never reveal upcoming
questions in advance; if PHASE 2 found no unknowns, skip this step.

Record each resolution immediately as one bullet for `## Design Decisions`:

```markdown
- **<unknown resolved>:** <chosen option> — <brief reason>
```

If this step is skipped (no unknowns), omit `## Design Decisions` from `design.md` —
never an empty header.

### Step 4 — Run PHASE 3.5, PHASE 4 and PHASE 4.5

Load the profile's `stack.SKILLS` best-practice skills, then produce every artifact:
the conditional technical research (3.5), the design files (4), and the constitution
and quality-gate validation (4.5). Carry step 3's `## Design Decisions` bullets in
(or omit the section entirely when there were none).

### Step 5 — Post-draft verification

Verify against the files on disk, not against what you meant to write:

1. **Check 1 — contract syntax:** call the `CONTRACT_LINT.run` port with
   `work/active/spec-<number>/docs/<api-artifact>` as `<file>`. Unbound → review by
   hand and note it in `design.md`.
2. **Check 2 — placeholders:** `grep -n '<[a-z]' work/active/spec-<number>/docs/<api-artifact>`
   must have zero matches.
3. **Diagram gate:** call the `DIAGRAM_CHECK.run` port over the Mermaid blocks.
   Unbound → review identifiers by hand and note it in `design.md`. A failing symbol
   that this story is about to create is expected — it stays as a known risk in
   `design.md`, never renamed to force a pass.
4. Confirm the structural headings are present: `## Global Architecture Impact`
   (always), `## Design Decisions` (only if step 3 asked), `## Data Modeling`
   (if and only if `docs/data-model.md` exists).

If a check fails → **fix-and-retry, max 3**: correct the artifact and re-verify. After
3 attempts, record the failure in `design.md` as a known risk and surface it in the
PHASE 5 summary.

### Step 6 — PHASE 5 close

Show the summary, surface the escalations, and stop for approval (see PHASE 5
below).

---

## Drafting PHASE 1: Load context

*Run inline, in the main agent.*

Extract the story number from the caller's input, then read:

1. `work/active/spec-<number>/spec.md` — extract:
   - The complete framing block (User Story, Defect, Technical Debt, …)
   - All Acceptance Criteria
   - Technical Context if present

2. `work/active/spec-<number>/context.md` — extract:
   - Affected <component>s (`COMPONENT_TERM`, e.g. microservice) and their modules
   - Existing entities with their fields
   - Existing DTOs available for reuse
   - The project's injection patterns
   - Gaps detected by /sdd-clarify

3. Read the conventions doc under `DOCS_ARCHITECTURE` (e.g.
   `docs/architecture/conventions.md`) — apply naming and code conventions
   throughout the design.

4. Read the project **constitution** if it exists — it is the source of
   non-negotiable principles and the quality gates validated in PHASE 4.5:

   ```bash
    [ -s docs/rules.md ] && echo "FOUND" || echo "NONE"
   ```

   If found, load its Articles and its active Quality Gates. If it does not
   exist (or is empty) → continue without it, and note in the PHASE 5 summary
   that no constitution was found (the developer may want to run `/sdd-rules`).

---

## Drafting PHASE 2: Analyze and identify unknowns

*Run inline, in the main agent — it produces the candidates; step 3 asks them.*

### What is already defined (do NOT list as unknowns)
- Fields that exist in context.md entities
- Behaviors explicitly described in acceptance criteria
- Patterns already present in context.md

### What needs resolution (candidates for questions)
- New field names and types not present in any existing entity or DTO
- Ambiguous behaviors in acceptance criteria
- Inter-service communication details not specified
- Pagination or filtering behavior not described
- Error handling behavior not specified

Build the internal list of unknowns. If it has more than 5 items, prioritize by
impact on architecture and DTOs — carry only the top 5 into step 3, each with a
recommended answer that can become the first question option.

---

## Drafting PHASE 3.5: Technical research (conditional)

*Run inline, in the main agent.*

Only for **non-trivial technical decisions** — produce `docs/research.md`
documenting the alternatives considered and why one was chosen. This captures
the "why" that would otherwise be lost, and is the input the constitution's
Anti-Abstraction / Simplicity gates are judged against in PHASE 4.5.

A decision is "non-trivial" (→ warrants a research entry) when it involves any of:
- Choosing between multiple valid approaches (e.g. sync HTTP vs Redis Streams,
  new table vs extending an existing one, polling vs webhook)
- A performance, consistency, or security trade-off
- Introducing a new dependency, pattern, or integration point
- Anything the constitution flags as needing justification

If every decision is obvious/forced by existing patterns in `context.md` → skip
this file entirely (do not create an empty `research.md`).

For each non-trivial decision, record in `docs/research.md`:

```markdown
## Decision: <title>

- **Context:** <what problem forces the decision>
- **Options evaluated:**
  1. <option A> — pros / cons
  2. <option B> — pros / cons
- **Chosen:** <option> — <reason, tied to an AC or to a constitution principle>
- **Rejected because:** <brief reason>
```

Anything decided here that changes a field or flow must stay consistent with
`api.yaml` / `data-model.md` produced in PHASE 4.

---

## Drafting PHASE 4: Produce design.md, docs/research.md, docs/diagram.md, <api-artifact> and docs/data-model.md

*Run inline, in the main agent.*

After all unknowns are resolved in step 3, generate the
complete design. Never embed the diagram, the schemas, or the entity/SQL inline
in `design.md`:

```bash
mkdir -p work/active/spec-<number>/docs/
```

---

## Drafting PHASE 4 — the diagram artifacts (mode-dependent)

*Run inline, in the main agent.*

Which files this phase writes depends on `DOC_UNIT` (profile, docs block).
**Read only the one this project declares** — the two are mutually exclusive, and the
other one describes artifacts this run will never produce:

| `DOC_UNIT` | What PHASE 4 writes | Where the instructions are |
|---|---|---|
| `full` (default) | `docs/diagram.md` (story sequence diagram) + `docs/component.md` (C4 Level 3, accumulated per module) | `references/full-mode.md` |
| `use-case` | `docs/flows/<slug>.md`, one per use case touched, each carrying its own inline `sequenceDiagram` | `references/flow-mode.md` |

`docs/data-model.md` (File 3) and `design.md` (File 4) are written in **both** modes —
they are below, not in either reference.

## Drafting PHASE 4 — API contract (applies in both design modes)

*Run inline, in the main agent.*

The contract artifact is produced per `API_CONTRACT_MODE` (profile, docs block). In
either mode it is **API-first**: it's written and approved **before** any code exists.
`/sdd-plan` generates DTOs that conform to this file field by field, never the other way
around. Consult `<STACK_REFS>/references/api-template.md` (if no pack in `STACK_REFS`
provides it: the local `references/api-template.md` — generic) for the structure and
rules.

Build it from:
- `context.md` existing entity/DTO fields (reuse exact names and types)
- Answers recorded in `## Design Decisions` (new fields)
- NEVER invent a field that doesn't come from one of those two sources

### When `API_CONTRACT_MODE = delta` (default)

Emit `docs/api.delta.yaml` — in `API_CONTRACT`'s notation (e.g. OpenAPI 3.1), with
**only** the new or modified `paths` and `components.schemas`, grouped by `tags` (one
per module). If an endpoint **modifies** an already-published contract, note it in
`design.md` so `/sdd-sync` calls the `CONTRACT_DIFF.run` port and classifies whether it's
breaking.

### When `API_CONTRACT_MODE = full`

Emit `docs/api.yaml` — the complete contract in `API_CONTRACT`'s notation, API-first.
The `info.title` starts with `spec-<number>`.

### Post-generation validation (mandatory, split between PHASE 4 and step 5)

`<api-artifact>` = `docs/api.delta.yaml` if `API_CONTRACT_MODE = delta`, or
`docs/api.yaml` if `full`.

After writing `<api-artifact>`:

- **Run Checks 2-5 here, with the file tools, and fix the file before moving on:**
  - **Check 2 — Unresolved placeholders:** `grep -n '<[a-z]'` over the file. There
    must be no matches. Any `<description>`, `<number>`, `<microservice-X>`, etc.
    left unreplaced must be removed or filled in with the actual value.
    The grep is deliberately blunt, so it also matches prose that legitimately
    contains `<` — a `description` reading "when the value is < the limit", for
    instance. Judge each match: a real placeholder gets filled in; legitimate prose
    gets rewritten to avoid the character (`is below the limit`), so the check stays
    a clean zero. Never silence it by narrowing the grep.
  - **Check 3 — Internal references resolve:** every `$ref: '#/components/schemas/<Name>'`
    must point to a schema that exists in `components.schemas` with that exact name.
  - **Check 4 — Required contract fields:** the document root declares `API_CONTRACT`'s
    version (e.g. `openapi: 3.1.0`); `info.title` starts with the item's ID; `tags`
    has at least one entry with `name` and `description`; all `paths` start with `/`;
    every operation has `operationId`, `summary`, and at least one `response`; every
    `requestBody` declaring `application/json` has a `schema`.
  - **Check 5 — Format consistency:** a field with `format: uuid`/`date-time`/`email`
    has parent `type: string`; a field with `enum` declares no redundant `type`.
- **Step 5 then re-runs Check 2 and adds Check 1 (contract syntax via the
  `CONTRACT_LINT.run` port) plus the diagram gate.** Re-running Check 2 against the
  file on disk is the point: it catches a placeholder you believed you had filled in.
  If a check fails, fix-and-retry, max 3; after that, record the failure in
  `design.md` as a known risk and surface it in the PHASE 5 summary.

---

### Files 1 and 2 — the diagram artifacts

They depend on `DOC_UNIT` and live in the reference for the mode this
project declares: `references/full-mode.md` (`diagram.md` + `component.md`) or
`references/flow-mode.md` (`flows/<slug>.md`). See "the diagram artifacts" above.

### File 3 — docs/data-model.md (both modes; only if a new/changed DB table is needed)

*Run inline, in the main agent.*

Schema definition per `ORM` + the migration in `MIGRATIONS`' form (e.g. a TypeORM
entity plus manual SQL), full definitions — never a sketch. Consult
`<STACK_REFS>/references/data-model-template.md` (if no pack in `STACK_REFS` provides
it: the local `references/data-model-template.md` — generic) for the exact structure.

Build it from:
- `context.md` existing entity fields (reuse names/types exactly when extending a table)
- Answers recorded in `## Design Decisions` (new fields)
- NEVER invent a field not backed by one of the two sources above

If no new/changed table is needed, skip this file entirely — do not create it.

### File 4 — design.md (both modes — narrative summary, links to docs/)

*Run inline, in the main agent.*

Consult `references/design-template.md` for the exact structure.

Contains:
- `## Design Decisions` (if PHASE 3 resolved any unknowns)
- A short prose summary of the flow + link to `docs/diagram.md`
- `## Module Components` — 1 sentence naming the new/modified
  component(s), linking to `docs/component.md` for the full diagram
- `## Global Architecture Impact` — **always present** (never
  conditional). This is what lets `/sdd-sync` promote instead of having to
  re-detect anything from a git diff. State explicitly:
  - **Does it touch global architecture? Yes/No.**
  - If **Yes**, name exactly what changed and at which C4 level:
    - New app/microservice, or new integration with a real external
      system/actor → **Level 1 (Context)**.
    - New module inside an existing app, new shared lib, or a new/removed
      integration between already-existing containers (another app, a broker,
      an external API) → **Level 2 (Container)**.
    - Include the specific node/edge to add or remove — `/sdd-sync` and
      `/sdd-docs` apply this verbatim, they don't re-derive it.
  - If **No**, one sentence confirming the change is scoped to this module's
    internals — no new app/module/integration crosses the module boundary.

  Determine this by comparing against what `context.md` (loaded in PHASE 1)
  already listed as existing modules/apps/integrations: if what this story
  introduces isn't already there, it's a **Yes**. If genuinely unsure, report
  it as one of PHASE 2's unknowns so step 3 asks — never leave it ambiguous.
- A per-<component> endpoint table (method + path + business description)
  linking to `<api-artifact>` (the produced contract) for the full schemas
- `## Data Modeling` (conditional — only if `docs/data-model.md` was
  produced; here just name the new table(s) and link to `docs/data-model.md`
  for the full entity/SQL — do not repeat the code)

Save:
- `work/active/spec-<number>/docs/research.md` (if PHASE 3.5 produced it)
- `work/active/spec-<number>/docs/diagram.md` (if `DOC_UNIT = story`)
- `work/active/spec-<number>/docs/component.md` (if `DOC_UNIT = story`, unless the story adds/changes zero internal components)
- `work/active/spec-<number>/docs/api.delta.yaml` (if `API_CONTRACT_MODE = delta`) or `docs/api.yaml` (if `full`)
- `work/active/spec-<number>/docs/data-model.md` (if applicable)
- `work/active/spec-<number>/design.md`
- `DOC_UNIT = use-case` only: complete `docs/flows/*.md`, each with its
  inline `sequenceDiagram`

---

## Drafting PHASE 4.5: Constitution & Quality Gates validation

*Run inline, in the main agent; exceptions are approved by the user in PHASE 5.*

Before presenting the design, validate it against the project's non-negotiable
principles. This is the design-time equivalent of Spec Kit's gates and the
constitution compliance check.

### If a constitution was loaded in PHASE 1

For each **Article**, confirm the design does not violate it. For each active
**Quality Gate**, mark it pass/fail with a one-line justification:

| Gate | Result | Justification |
|------|--------|---------------|
| Simplicity | ✅/⚠️ | <why no layers/abstractions were added without a use case> |
| Anti-Abstraction | ✅/⚠️ | <why the framework/pattern is used directly> |
| Integration-First | ✅/⚠️ | <`<api-artifact>` + contract tests defined before implementing> |
| Test-First | ✅/⚠️ | <the plan will write tests before the code — guaranteed in `/sdd-plan`> |

- If a gate **fails** (⚠️) → do not silently proceed. Either adjust the design
  to pass it, or record it as an **explicit, justified exception** in
  `design.md` (`## Constitution Exceptions`) and carry it to PHASE 5 for the
  user's approval. A violated principle is never a silent implementation choice.

### If no constitution exists

Apply the four gates above as **built-in defaults** anyway (Simplicity,
Anti-Abstraction, Integration-First, Test-First) — they are sound regardless —
and note in the summary that running `/sdd-rules` would make them enforceable
project-wide.

Record the gate table in `design.md` under `## Quality Gates Validation`
(see `references/design-template.md`).

---

## PHASE 5: STOP — await approval

After the verification passes and the escalations are handled:

1. Show a summary:
   - <component>s designed
   - New endpoints per <component> (paths from `<api-artifact>`)
   - New schemas created
   - Whether it includes a data model (and whether `docs/data-model.md` was generated)
   - Whether `docs/research.md` was generated (and how many decisions it documents)
   - The "Global Architecture Impact" verdict (Yes/No, and if Yes, which
     C4 level and which node/edge — this is what `/sdd-sync` will read to
     invoke `/sdd-docs` without re-analyzing it)
   - The Quality Gates validation result (all ✅, or which ones are ⚠️ with an exception)
   - Any escalations raised along the way (create/modify ambiguity, gate ⚠️)
     and their resolution
   - If there was no constitution, a mention that `/sdd-rules` would make it enforceable

2. Point the user to the artifacts for review — `design.md`, `<api-artifact>`
   (`api.delta.yaml` or `api.yaml`, per `API_CONTRACT_MODE`), `docs/diagram.md`,
   `docs/component.md`, `docs/data-model.md`, `docs/research.md`, `docs/flows/*.md`
   — with the API contract being the one the user most needs to validate carefully,
   and the Quality Gates table the compliance summary to confirm. Show the full
   contract only if the user asks.

3. Say:
   > "**STOP:** Review the full contract (`<api-artifact>`), the diagram and the data
   > model (if applicable) before continuing.
   > Once approved, `/sdd-plan` generates the DTOs and the entity/migration from these
   > files — a later change means regenerating them.
   > If something isn't right, say so now. When you're ready, run `/plan spec-<number>`."

4. Stop — do not start planning.

---

## Common Issues

| Issue | Cause | Resolution |
|-------|-------|------------|
| context.md not found | /sdd-clarify never ran | Tell the user to run /sdd-clarify first |
| `spec.md` has `[NEEDS CLARIFICATION]` markers | Unresolved ambiguities | STOP: run `/clarify spec-<number>` before designing |
| A Quality Gate fails (⚠️) | The design violates a principle | Adjust the design to pass it, or record a justified exception in `design.md` and approve it in PHASE 5 |
| No constitution | `/sdd-rules` never ran | Apply the 4 built-in gates by default; suggest `/sdd-rules` to make them enforceable |
| Undefined field in a schema | Ambiguous item | Ask in PHASE 3 before designing |
| Affected <component> not identified | Incomplete context.md | Ask the user before continuing |
| Diagram with no schema names on the arrows | Missing contract information | Resolve in PHASE 3 before diagramming |
| `component.md` already exists from an earlier story of the same module | It's a living per-module document, accumulated across stories | Read it first and update it surgically — never regenerate it from scratch, that would lose earlier stories' components |
| Unclear whether the story touches global architecture | The module/integration is ambiguous with respect to what `context.md` already lists | Resolve it in PHASE 3 as one more question — never leave "Global Architecture Impact" ambiguous, `/sdd-sync` and `/sdd-docs` trust that answer as written |
| New table not confirmed | Item ambiguous about persistence | Ask it as one of the 5 questions |
| `<api-artifact>` modified after /sdd-plan | Contract change after approval | Warn: run `/plan spec-<number>` again to regenerate the DTOs |
| You can't even list the unknowns in PHASE 2 | Missing context, or a spec that contradicts itself | Stop before drafting: show the blocker, fix the input (`/sdd-refine`/`/sdd-clarify`), then re-run |
| `CONTRACT_LINT` or `DIAGRAM_CHECK` fails in step 5 | A port is stricter than the file tools | Fix-and-retry (max 3) editing the artifact; after that, record it as a known risk in `design.md` |

---

## Example

**Input:** `/design spec-1933` — an endpoint that filters zones by service type,
already clarified. Profile: `API_CONTRACT_MODE: delta`, `DOC_UNIT: story`.

**Flow:**
1. **Step 1:** the four `Requires` rows pass — `spec.md`, `context.md`, and
   `grep -c 'NEEDS CLARIFICATION'` returns `0`.
2. **Step 2 (PHASE 1-2):** loads the artifacts and the constitution
   (`docs/rules.md` found). PHASE 2 raises two unknowns: whether the filter paginates,
   and whether an unknown service type is a 400 or an empty 200.
3. **Step 3 (PHASE 3):** asks them **one at a time** — the second question changes
   depending on the first. Both answers become `## Design Decisions` bullets.
4. **Step 4 (PHASE 3.5, 4, 4.5):** no `research.md` (both decisions were forced by
   existing patterns). Writes `docs/api.delta.yaml` with the path and the two schemas,
   `docs/diagram.md`, and updates the module's existing `docs/component.md`
   surgically. No `## Data Modeling` — the story adds no table. The four gates pass.
5. **Step 5:** `CONTRACT_LINT` is unbound → syntax reviewed by hand and noted in
   `design.md`. Check 2 (`grep -n '<[a-z]'`) returns nothing. `DIAGRAM_CHECK` flags
   `FilterZonesUseCase` as unknown — expected, this story creates it — so it stays
   recorded as a known risk instead of renamed.
6. **Step 6 (PHASE 5):** summary + STOP for review.

**Output:**
> "Designed `catalog-ms`: 1 endpoint on the `zones` collection, 2 schemas, no data model.
> Global Architecture Impact: **No**. Quality Gates: 4/4 ✅.
> `CONTRACT_LINT` unbound — contract reviewed manually.
> **STOP:** review `docs/api.delta.yaml` before continuing. When ready, `/plan spec-1933`."

---

## Output language
**Conversational output** follows `~/.agents/references/chat-conventions.md` - the six blocks (announce, progress, question, summary, stop, handoff).

**Artifact prose follows `ARTIFACT_LANGUAGE`** (profile, language block — falls back to
`OUTPUT_LANGUAGE` if the project doesn't declare it): the prose of `design.md`,
`docs/research.md`, `docs/diagram.md`, `docs/component.md`, `docs/data-model.md`,
`docs/flows/*.md`, plus the `summary` and `description` fields of the API contract and
the labels of the diagrams. Never translate them to English on your own.

The **section headings** stay English regardless of that key (`## Design Decisions`,
`## Global Architecture Impact` — `/sdd-sync`, `/sdd-plan` and `/sdd-docs` read them by name).

The **identifiers** you design — paths, schema names, `operationId`, fields,
endpoints, table and column names — follow `IDENTIFIER_LANGUAGE` (profile, language
block). They are what `/sdd-plan` turns into code, so name them in the language that key
declares and match the existing code; the skill carries no default of its own.

**Chat interaction follows the user's language** (`OUTPUT_LANGUAGE` in the profile).
The message samples in this document are written in English; render them in the
user's language when that differs.
