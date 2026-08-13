---
name: design
description: >
  Reads spec.md and context.md to produce an API-first technical design delta
  (DESIGN_OUTPUT_MODE): per-flow docs carrying their own inline Mermaid diagram
  (one per use case), an OpenAPI delta scoped to the story, and a data model
  if needed. /sync reconciles the delta into the unit's living docs.
  Use when the user says "/design spec-XXXX", "design the story", "create the
  design", "technical specification", or has completed /clarify and wants to
  define what to build.
  Do NOT use before /clarify is complete. Do NOT use for planning tasks (use /plan).
  Do NOT use for system-wide architecture (C4 Level 1/2 — actors, external
  systems, apps/microservices) — that's /architecture, invoked by /sync.
---

# design

## Overview

Read the story requirements and the existing codebase context, resolve any
ambiguities about new data through targeted questions, and produce the contract
API-first (`API_CONTRACT`, e.g. OpenAPI 3.1): `<api-artifact>` is approved
**before** any code exists — `/plan` generates the DTOs that conform to it, never
the reverse.

**Announce at start:** "Designing the technical specification for spec-<number>."

**Output** — two independent axes, both in the profile (section 8):

**Axis 1 — `API_CONTRACT_MODE` (OpenAPI contract, default `delta`):**
- `delta` (default): `work/active/spec-<number>/docs/api.delta.yaml` — **only** the paths
  and schemas the item adds or changes (grouped by module/tag). `/sync` merges it into
  the module's canonical `api.yaml` (creating it if it doesn't exist).
- `full`: `work/active/spec-<number>/docs/api.yaml` — the complete contract per story;
  `/sync` copies it as is.

**Axis 2 — `DESIGN_OUTPUT_MODE` (diagrams/model, default `full`):**
- `full` (default, Markdown/Mermaid): `docs/diagram.md` + `docs/component.md` per story.
- `full-flow` (only if the project adopted docs-as-code with Mermaid):
  a complete `docs/flows/<use-case>.md`, with its `sequenceDiagram` inline — one file
  per use case touched, which `/sync` replaces in the unit's living docs.

In both modes the following are also produced, where applicable:
- `work/active/spec-<number>/docs/research.md` — technical alternatives evaluated + rationale (only if there are non-trivial decisions)
- `work/active/spec-<number>/docs/data-model.md` — entity + migration (only if a new table/data type is involved)
- `work/active/spec-<number>/design.md` — narrative summary + affected flows + quality gates validation

---

## Project profile (read first, always)

Read `.agents/profile.md` at the root of the current project before anything else. If it
doesn't exist, tell the user to copy `~/.agents/sdd-profile.template.md` to
`.agents/profile.md` and stop — without a profile you don't know this project's
conventions.

Any path, command, framework or diagram notation shown in this document is an example
resolution; the profile's value wins. The keys this skill reads are listed under
**Profile keys** in the `Contract` below.

---

## Contract

What this skill needs, what it guarantees to the next stage, and what it may not do.
**Check every `Requires` row before any other work** — a failed precondition stops
the design at the start, not halfway through a contract.

**Requires**

| Condition | Check | If it fails |
|---|---|---|
| You are in the project's working directory | `pwd` == `WORKING_DIRECTORY` (absolute path, from the profile) | `cd` there before running anything |
| `spec.md` exists | `[ -f work/active/spec-<number>/spec.md ]` | Stop: "I couldn't find `work/active/spec-<number>/spec.md`. Run `/spec spec-<number>` first." |
| `context.md` exists | `[ -f work/active/spec-<number>/context.md ]` | Stop: "I couldn't find `work/active/spec-<number>/context.md`. Run `/clarify spec-<number>` first." |
| **Ambiguity gate:** zero unresolved markers | `grep -c 'NEEDS CLARIFICATION' work/active/spec-<number>/spec.md` returns `0` | Stop, do not design: "`spec.md` still has `<N>` unresolved `[NEEDS CLARIFICATION]` markers. Designing a contract on top of ambiguities produces potentially incorrect DTOs and behaviors. Run `/clarify spec-<number>` to resolve them before `/design`." |

`/clarify` closes its own run with that same `grep -c` at `0`. A spec that still
carries markers is therefore a spec `/clarify` never finished: the gate catches a
broken handoff, and no marker is minor enough to design past.

**Produces** — this is what `/plan` and `/sync` look for

- `design.md` with `## Global Architecture Impact`, **always present, never
  conditional**: Yes/No and, if Yes, the C4 level plus the concrete node/edge.
  `/sync` reads this section by name and hands it to `/architecture` verbatim — it
  re-derives nothing from the diff (PHASE 4, File 4).
- `design.md` with `## Design Decisions` whenever PHASE 3 resolved at least one
  unknown — omitted entirely, never left as an empty header, when it resolved none.
  `/sync` copies it verbatim into the cumulative `docs/decisions.md`.
- `design.md` with `## Module Components`, the endpoint table per <component>,
  `## Quality Gates Validation` (for the PHASE 5 review), and `## Data Modeling`
  **if and only if** `docs/data-model.md` exists — `/plan` stops when that pairing
  is broken.
- `<api-artifact>` — `docs/api.delta.yaml` if `API_CONTRACT_MODE = delta`,
  `docs/api.yaml` if `full` — having passed all 5 post-generation checks, zero
  unreplaced `<placeholder>` matches among them. `/plan` reads it as the source of
  truth for DTOs, never `design.md`.
- The diagram artifacts the mode dictates: `docs/diagram.md` + `docs/component.md`
  when `DESIGN_OUTPUT_MODE = full`; `docs/flows/<slug>.md`, each carrying its inline
  `sequenceDiagram`, when `full-flow`.
- `docs/data-model.md` and `docs/research.md` only where they apply.

Two of those guarantees are **countable, not a matter of judgment**, and both are
checked by running a command rather than by re-reading the artifact: the ambiguity
gate in `Requires` (`grep -c 'NEEDS CLARIFICATION'` = `0`, so every design rests on a
spec with no open markers) and Check 2 of the contract validation (`grep -n '<[a-z]'`
over `<api-artifact>` = no matches). One marker or one placeholder left is a stop.

`## Design Decisions` and `## Global Architecture Impact` are structural headings —
`/sync` looks them up literally. Translating either one breaks the close-out.

**Writes** — nothing outside this list

- `work/active/spec-<number>/design.md`
- `work/active/spec-<number>/docs/` — `<api-artifact>`, `diagram.md`,
  `component.md`, `flows/*.md`, `data-model.md`, `research.md`

Not `spec.md` or `context.md` (that's `/clarify`, or `/refine` for a correction), not
`plan.md` (that's `/plan`), not the unit's living docs (that's `/sync` — this skill
only *reads* them, in PHASE 4 step 2), and not `DOCS_ARCHITECTURE`: C4 Level 1/2
belongs to `/architecture`.

**Never** — regardless of how obvious the field or the name looks

- Write a field into `<api-artifact>` or `docs/data-model.md` that comes from neither
  `context.md` nor an answer recorded in `## Design Decisions`.
- Mint a new flow when the `entrypoint`/`command`/`operationId` already exists in the
  living docs — that is a `modify`, never a `create` (PHASE 4, step 2).
- Rename a diagram node to make `MODEL_VALIDATE_CMD` pass. The gate failing on a class
  this item is about to create is expected; record it as a known risk instead.
- Regenerate `docs/component.md` from scratch when the module already has one — it
  accumulates across stories and gets updated surgically.

**Escalates** — PHASE 3, at most 5 unknowns, one `AskUserQuestion` call each: anything
that blocks a DTO, a contract or a behavior, plus any doubt about whether the story
touches global architecture. Writing a vague `## Global Architecture Impact` instead
of asking is not an option — `/sync` and `/architecture` apply that answer verbatim.

**Degrades** — none of the three tool keys blocks the design; each falls back to
manual and leaves the mark in `design.md`:

- `YAML_VALIDATE_CMD` at `—` → review `<api-artifact>`'s syntax by hand (Check 1).
- `MODEL_VALIDATE_CMD` at `—` → review the diagram identifiers by hand, and note in
  `design.md` that there was no automatic validation.
- `API_DIFF_TOOL` at `—` → no automatic breaking-change classification; note in
  `design.md` that `/sync` compares the contracts manually.

**Profile keys**

- `STORY_ID_PATTERN`, `WORKDIR_ACTIVE` — the story's id and workspace, written
  throughout this document as `spec-<number>` and `work/active/spec-<number>/`
- `WORKING_DIRECTORY` — the directory gate in `Requires`
- `API_CONTRACT`, `API_CONTRACT_MODE` — the contract's notation and whether the story
  emits a delta or a full file ("PHASE 4 — API contract")
- `DESIGN_OUTPUT_MODE`, `DIAGRAM_FORMAT` — which diagram artifacts to emit, in what
  notation
- `DOCS_MODULE_API`, `DOCS_UNIT_FLOWS`, `DOCS_MODULE_ARTIFACTS`, `DOCS_UNIT_README`,
  `DOCS_ARCHITECTURE` — the living docs read for the reconciliation lookup (PHASE 4,
  step 2) and the destinations `/sync` promotes to (section 8)
- `MODEL_VALIDATE_CMD`, `YAML_VALIDATE_CMD`, `API_DIFF_TOOL` — the gates over the
  produced artifacts (section 10)
- `COMPONENT_TERM`, `ORM`, `MIGRATIONS`, `STACK_REFS` and section 7 — the term for a
  deployable unit, the persistence stack, and the per-stack templates
- `ARTIFACT_LANGUAGE`, `OUTPUT_LANGUAGE`, `IDENTIFIER_LANGUAGE` — see "Output language"

---

## PHASE 1: Load context

Extract the story number from the user's input, then run the `Requires` checks above
before reading anything else.

1. Read `work/active/spec-<number>/spec.md` — extract:
   - The complete framing block (User Story, Defect, Technical Debt, …)
   - All Acceptance Criteria
   - Technical Context if present

2. Read `work/active/spec-<number>/context.md` — extract:
   - Affected <component>s (`COMPONENT_TERM`, e.g. microservice) and their modules
   - Existing entities with their fields
   - Existing DTOs available for reuse
   - The project's injection patterns
   - Gaps detected by /clarify

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
   that no constitution was found (the developer may want to run `/constitution`).

---

## PHASE 2: Analyze and identify unknowns

Before asking any questions, analyze what is already defined vs what needs
to be resolved.

### What is already defined (do NOT ask about these)
- Fields that exist in context.md entities
- Behaviors explicitly described in acceptance criteria
- Patterns already present in context.md

### What needs resolution (candidates for questions)
- New field names and types not present in any existing entity or DTO
- Ambiguous behaviors in acceptance criteria
- Inter-service communication details not specified
- Pagination or filtering behavior not described
- Error handling behavior not specified

Build an internal list of unknowns. If the list has more than 5 items,
prioritize by impact on architecture and DTOs — ask only the top 5.

---

## PHASE 3: Resolve unknowns (speckit pattern)

If unknowns exist, ask them ONE AT A TIME using the `AskUserQuestion` tool —
one call per unknown, never batched, since the answer to one can change
whether the next is even still relevant.

### Question format

For each unknown, call `AskUserQuestion` with a single question:

- `question`: the unknown phrased as a direct question.
- `header`: a short label (max 12 chars) naming the unknown (e.g. "Pagination", "New field").
- `options`: 2-4 mutually exclusive choices. Put the recommended choice
  **first** and append " (Recommended)" to its `label`. Use each option's
  `description` to give the 1-2 sentence reason a human would otherwise
  put in a "Recommendation:" line.
- The tool always offers an implicit "Other" — that covers any free-text
  answer outside the listed options, so do not add an "Other" option yourself.

If the unknown has no natural discrete options (e.g. it's actually asking
for a specific value like a field name or limit), ask it as a normal
text question instead of forcing it into `AskUserQuestion` — the tool is
for choices, not open data capture.

### Rules
- Maximum 5 questions total across the whole session
- One `AskUserQuestion` call per unknown — wait for the answer before the next
- Never reveal upcoming questions in advance
- If no unknowns exist → skip this phase entirely and proceed to PHASE 4

### Record each resolution

As soon as a question is answered, record it as one bullet for the
`## Design Decisions` section (see `references/design-template.md`):

```markdown
- **<unknown resolved>:** <chosen option> — <brief reason>
```

If PHASE 3 is skipped entirely (no unknowns), omit the section from
`design.md` — do not write an empty header.

### Question priority order
1. New field names and types (blocks DTO design)
2. Inter-service DTO contracts (blocks sequence diagram)
3. Ambiguous acceptance criteria (blocks behavior definition)
4. Error handling behavior (blocks HTTP response design)
5. Pagination or filtering specifics (blocks request DTO design)

---

## PHASE 3.5: Technical research (conditional)

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

## PHASE 4: Produce design.md, docs/research.md, docs/diagram.md, <api-artifact> and docs/data-model.md

After all unknowns are resolved, generate the complete design. Never embed the
diagram, the schemas, or the entity/SQL inline in `design.md`:

```bash
mkdir -p work/active/spec-<number>/docs/
```

---

## PHASE 4 — FLOW MODE (when `DESIGN_OUTPUT_MODE = full-flow`)

This mode **replaces** the "File 1/2/3" sections below (which are the `full` default).
The unit of documentation is the **use case (flow)**, not the item. The item is a set
of operations over flows: `create` | `modify` | `deprecate`.

**Algorithm:**

1. **Derive the affected use cases.** From `spec.md`, map each AC to a flow:
   `(module, use-case, trigger)`, where `trigger` is one of `rest`, `cron`, `queue`,
   `domain-event`, `cli`. Determine the `entrypoint` (REST route, cron/job/event name)
   and the `command`/query it fires.

2. **Reconciliation lookup — resolve identity against the living docs (avoids duplicates).**
   Before marking anything, read each affected module's living docs and inventory the
   existing **identity keys**:
   - `DOCS_UNIT_FLOWS` (`flows/*.md`) → every `use_case` (slug), its `entrypoint` and `command`.
   - `DOCS_MODULE_API` (`api.yaml`) → every `path` + method and their `operationId`.

   For each use case derived in step 1, look for a match by **any** of these keys
   (strongest to weakest): same `entrypoint`+`command` → same `operationId` /
   `path`+method → same slug by intent. Hard rule: **if the endpoint, the command or
   the event already exists, it is NEVER a `create` — it is a `modify` of the existing
   flow.**

   - **Match → `modify`:** reuse the existing `use_case` (slug), `view` id and
     `operationId` **verbatim**. The delta overlays the current flow, it doesn't create
     a parallel one. Read the current `flows/<slug>.md` to respect its `introduced_by`
     and history.
   - **No match → `create`:** mint a new kebab slug that **doesn't collide** with any
     slug/viewId/operationId in the inventory.
   - **Removal → `deprecate`/`remove`:** mark the existing flow by its slug; don't
     invent a new one.

   If you're torn between `create` and `modify` (the endpoint is similar but not
   identical), treat it as `modify` and note the ambiguity in `design.md` so the
   reviewer confirms — over-merging is cheaper than duplicating.


3. **Emit a complete `docs/flows/<slug>.md`, with its diagram inline** — there's no
   separate model to maintain. Follow `references/flow-template.md`:
   - Mandatory frontmatter: `use_case`, `module`, `trigger`, `entrypoint`, `command`,
     `invariants`, `introduced_by`, `last_modified_by`, `status`. **There is no `view:` key.**
   - A ` ```mermaid ` block with a `sequenceDiagram` showing the use case's path: who
     fires it, which components it passes through and what gets persisted.
   - Prose: what the flow does, verifiable business rules, error table and response.
   - For `create`: `introduced_by` = `last_modified_by` = this item.
     For `modify`: keep `introduced_by`, set `last_modified_by` = this item.

   **Identifier convention (CI validates it — breaking it breaks the build).** The
   diagram gate (`MODEL_VALIDATE_CMD`) verifies that every identifier names a real
   symbol in the code the flow documents:

   - **The visible name is checked, not the alias.** In `participant CB as CommandBus`,
     `CommandBus` is what resolves; `CB` stays free for the diagram's legibility.
   - **Use the exact class name**, port or exception —
     `ReverseConfirmedTransactionHandler`, not a description.
   - **External actors are exempt:** `Client`, `User`, `Postgres`, `Keycloak`.
   - In a `flowchart`, the shape declares the node class: `X("Name")` must resolve;
     `X[("table")]` (cylinder) and `subgraph` don't.

   ```mermaid
   sequenceDiagram
     actor Client
     participant C as AccountsController
     participant CB as CommandBus
     participant H as OpenAccountHandler
     participant A as Account
     participant ES as EventStore

     Client->>C: POST /accounts (OpenAccountRequestDto)
     C->>CB: dispatch(OpenAccountCommand)
     CB->>H: handle
     H->>A: Account.open(...) — validates AC-2
     H->>ES: append(AccountOpened)
   ```

4. **Update the component `flowchart` only if needed.** If the item adds or removes
   components from the unit, include in `design.md` the ` ```mermaid ` block with the
   updated `flowchart`, grouped by hexagonal layer (`domain` / `application` /
   `infrastructure`), so `/sync` carries it into `DOCS_UNIT_README`. If the item
   doesn't change the module's structure — only the path of a flow — **omit it**: don't
   rewrite the component diagram on every story.

5. **Resolve the documentation unit, not the "module".** A flow's destination is
   `<unit>/flows/<slug>.md`, where the unit is the code root the flow documents. Hard
   rule: **documentation lives next to the code it describes.** If the `command` and
   its handler live in a lib, the flow goes to `libs/<lib>/docs/flows/`, not under
   `apps/<app>/docs/`. When the destination isn't obvious, resolve it by the real
   location of the `command`'s class.

6. **Emit the API contract per `API_CONTRACT_MODE`** — see the "PHASE 4 — API contract"
   section below (it applies equally in both design modes).

7. **`design.md` references the flows by slug** — it never embeds a monster diagram
   spanning several modules. The "Affected Flows" section lists `create`/`modify`/
   `deprecate` with their trigger and entrypoint; the "Components" section describes
   the delta in one sentence and only includes the `flowchart` if step 4 applied.

8. **Validate the diagrams:** run the profile's `MODEL_VALIDATE_CMD` (section 10 —
   default `npm run docs:validate`) to confirm every identifier in every Mermaid block
   resolves to a real symbol. If the key is `—` → manual review, and note in
   `design.md` that there was no automatic validation.

   The typical error is naming a component that doesn't exist yet because this item is
   going to create it. That's expected: the gate runs against the repo, and the symbol
   will appear once `/build` writes the code. Note it as pending in `design.md` — as a
   known risk — instead of renaming the node to "make the gate pass": the diagram must
   name the class that will be created, with the name it will be created under.

Then produce **File 3** (`docs/data-model.md`, if it applies) and **File 4**
(`design.md`) below — those two run in **both** modes, and File 4 is where
`## Global Architecture Impact` becomes mandatory — and jump to **PHASE 4.5** (quality
gates). Only "File 1" and "File 2" are `full`-mode only; the API contract
("PHASE 4 — API contract") applies in both modes.

---

## PHASE 4 — API contract (applies in both design modes)

The contract artifact is produced per `API_CONTRACT_MODE` (profile, section 8). In
either mode it is **API-first**: it's written and approved **before** any code exists.
`/plan` generates DTOs that conform to this file field by field, never the other way
around. Consult `<STACK_REFS>/references/api-template.md` (default if `STACK_REFS`
isn't defined: the local `references/api-template.md` — generic) for the structure and
rules.

Build it from:
- `context.md` existing entity/DTO fields (reuse exact names and types)
- Answers recorded in `## Design Decisions` (new fields)
- NEVER invent a field that doesn't come from one of those two sources

### When `API_CONTRACT_MODE = delta` (default)

Emit `docs/api.delta.yaml` — in `API_CONTRACT`'s notation (e.g. OpenAPI 3.1), with
**only** the new or modified `paths` and `components.schemas`, grouped by `tags` (one
per module). If an endpoint **modifies** an already-published contract, note it in
`design.md` so `/sync` runs `API_DIFF_TOOL` (profile section 10 — a typical resolution
is `oasdiff`) and classifies whether it's breaking.

### When `API_CONTRACT_MODE = full`

Emit `docs/api.yaml` — the complete contract in `API_CONTRACT`'s notation, API-first.
The `info.title` starts with `spec-<number>`.

### Post-generation validation (mandatory, before continuing)

`<api-artifact>` = `docs/api.delta.yaml` if `API_CONTRACT_MODE = delta`, or
`docs/api.yaml` if `full`.

After writing `<api-artifact>`, run this validation in order. If any check
fails, **fix the file and re-validate** (max 3 retries). If the failure
persists after 3 attempts, report it in `design.md` as a known risk.

**Check 1 — YAML is syntactically valid:**

Run the profile's `YAML_VALIDATE_CMD` (section 10). The default is a chain of
validators: Python + PyYAML, else Node + js-yaml, else `npx js-yaml`:

```bash
python -c "import yaml; yaml.safe_load(open('work/active/spec-<number>/docs/<api-artifact>', encoding='utf-8'))" 2>&1
```

If Python + PyYAML is not available, use Node:

```bash
node -e "const fs=require('fs');const yaml=require('js-yaml');yaml.load(fs.readFileSync('work/active/spec-<number>/docs/<api-artifact>','utf8'))" 2>&1
```

If neither is available, use `npx js-yaml`:

```bash
npx js-yaml work/active/spec-<number>/docs/<api-artifact> > /dev/null 2>&1 && echo OK || echo FAIL
```

If `YAML_VALIDATE_CMD` is `—` (project with no declared validator) → manual
validation: review the file for indentation/syntax errors.

If parsing fails → fix the syntax error the parser reports and re-run the check.

**Check 2 — Unresolved placeholders:**

```bash
grep -n '<[a-z]' work/active/spec-<number>/docs/<api-artifact>
```

There must be no matches. Any `<description>`, `<number>`,
`<microservice-X>`, etc. left unreplaced must be removed or filled in
with the actual value.

**Check 3 — Internal references resolve:**

Every `$ref: '#/components/schemas/<Name>'` must point to a schema that
exists in `components.schemas` with that exact name. Perform a manual
review: read `<api-artifact>` and confirm that for every `$ref` there is
a matching entry in `components.schemas`.

**Check 4 — Required contract fields:**

Confirm that:
- the document root declares `API_CONTRACT`'s version (e.g. `openapi: 3.1.0`)
- `info.title` starts with the item's ID (`STORY_ID_PATTERN` from the profile)
- `tags` has at least one entry with `name` and `description`
- All `paths` start with `/`
- Every operation has `operationId`, `summary`, and at least one `response`
- Every `requestBody` declaring `application/json` has a `schema`

**Check 5 — Format consistency:**

If a field uses `format: uuid`, `format: date-time`, or `format: email`,
its parent `type` must be `string`. If a field uses `enum`, it must not
declare a redundant `type` (it is inferred from the enum values).

Only proceed to the next files once all 5 checks pass.

---

### File 1 — docs/diagram.md (`DESIGN_OUTPUT_MODE = full` only — always, in that mode)

Shows how data flows between <component>s. Use `DIAGRAM_FORMAT` (e.g. Mermaid):

```markdown
# Flow diagram: spec-<number>

\`\`\`mermaid
sequenceDiagram
  actor User
  participant BFF as gateway-ms
  participant Capabilities as catalog-ms

  User->>BFF: POST /resource/search (RequestDto)
  BFF->>Capabilities: POST /resource/search (RequestDto)
  Capabilities-->>BFF: ResponseDto
  BFF-->>User: ResponseDto
\`\`\`
```

Rules for the diagram:
- Show every <component> in the flow, in order
- Label each arrow with: HTTP method + path + schema name (matching the
  operation/schema names used in `<api-artifact>`, the produced contract)
- Use `-->>` for responses, `->>` for requests
- Include the actor (User/System) as the initiator
- If a <component> calls another internally, show that hop too

### File 2 — docs/component.md (C4 Level 3 — `DESIGN_OUTPUT_MODE = full` only, almost always)

Shows the affected module's internal building blocks: use case(s)/handler(s), domain
aggregate(s)/entity(ies), port(s)/repository(ies) and the infrastructure adapters that
implement them. This is the C4 Level 3 view — it lives inside the module, not under
`DOCS_ARCHITECTURE` (that's Level 1-2, managed by `/architecture`, invoked by `/sync`).

Rules:
- Resolve the module's promoted destination with `DOCS_MODULE_ARTIFACTS`
  (`apps/<app>/docs/<module>/component.md`). If it already exists (an earlier story
  left it), **read it first** and update it surgically: add this story's new
  components without deleting the ones still in force — it's a living per-module
  document, just as `containers.md` is at the system level.
- If it doesn't exist yet, generate it from scratch out of the module's existing
  components in `context.md` + what this story adds.
- `DIAGRAM_FORMAT`, grouped by layer (`domain` / `application` / `infrastructure`),
  one node per component.
- It is omitted only if the story adds and modifies zero of the module's internal
  components (for example, a purely configuration change) — that shouldn't be the
  typical case.

### File 3 — docs/data-model.md (both modes; only if a new/changed DB table is needed)

Schema definition per `ORM` + the migration in `MIGRATIONS`' form (e.g. a TypeORM
entity plus manual SQL), full definitions — never a sketch. Consult
`<STACK_REFS>/references/data-model-template.md` (default if `STACK_REFS` isn't defined:
the local `references/data-model-template.md` — generic) for the exact structure.

Build it from:
- `context.md` existing entity fields (reuse names/types exactly when extending a table)
- Answers recorded in `## Design Decisions` (new fields)
- NEVER invent a field not backed by one of the two sources above

If no new/changed table is needed, skip this file entirely — do not create it.

### File 4 — design.md (both modes — narrative summary, links to docs/)

Consult `references/design-template.md` for the exact structure.

Contains:
- `## Design Decisions` (if PHASE 3 resolved any unknowns)
- A short prose summary of the flow + link to `docs/diagram.md`
- `## Module Components` — 1 sentence naming the new/modified
  component(s), linking to `docs/component.md` for the full diagram
- `## Global Architecture Impact` — **always present** (never
  conditional). This is what lets `/sync` promote instead of having to
  re-detect anything from a git diff. State explicitly:
  - **Does it touch global architecture? Yes/No.**
  - If **Yes**, name exactly what changed and at which C4 level:
    - New app/microservice, or new integration with a real external
      system/actor → **Level 1 (Context)**.
    - New module inside an existing app, new shared lib, or a new/removed
      integration between already-existing containers (another app, a broker,
      an external API) → **Level 2 (Container)**.
    - Include the specific node/edge to add or remove — `/sync` and
      `/architecture` apply this verbatim, they don't re-derive it.
  - If **No**, one sentence confirming the change is scoped to this module's
    internals — no new app/module/integration crosses the module boundary.

  Determine this by comparing against what `context.md` (loaded in PHASE 1)
  already listed as existing modules/apps/integrations: if what this story
  introduces isn't already there, it's a **Yes**. Never leave it ambiguous —
  if genuinely unsure, ask the user as part of PHASE 3 rather than writing a
  vague answer here.
- A per-<component> endpoint table (method + path + business description)
  linking to `<api-artifact>` (the produced contract) for the full schemas
- `## Data Modeling` (conditional — only if `docs/data-model.md` was
  produced; here just name the new table(s) and link to `docs/data-model.md`
  for the full entity/SQL — do not repeat the code)

Save:
- `work/active/spec-<number>/docs/research.md` (if PHASE 3.5 produced it)
- `work/active/spec-<number>/docs/diagram.md` (if `DESIGN_OUTPUT_MODE = full`)
- `work/active/spec-<number>/docs/component.md` (if `DESIGN_OUTPUT_MODE = full`, unless the story adds/changes zero internal components)
- `work/active/spec-<number>/docs/api.delta.yaml` (if `API_CONTRACT_MODE = delta`) or `docs/api.yaml` (if `full`)
- `work/active/spec-<number>/docs/data-model.md` (if applicable)
- `work/active/spec-<number>/design.md`
- `DESIGN_OUTPUT_MODE = full-flow` only: complete `docs/flows/*.md`, each with its
  inline `sequenceDiagram`

---

## PHASE 4.5: Constitution & Quality Gates validation

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
| Test-First | ✅/⚠️ | <the plan will write tests before the code — guaranteed in `/plan`> |

- If a gate **fails** (⚠️) → do not silently proceed. Either adjust the design
  to pass it, or record it as an **explicit, justified exception** in
  `design.md` (`## Constitution Exceptions`) for the user to approve in
  PHASE 5. A violated principle is never a silent implementation choice.

### If no constitution exists

Apply the four gates above as **built-in defaults** anyway (Simplicity,
Anti-Abstraction, Integration-First, Test-First) — they are sound regardless —
and note in the summary that running `/constitution` would make them enforceable
project-wide.

Record the gate table in `design.md` under `## Quality Gates Validation`
(see `references/design-template.md`).

---

## PHASE 5: STOP — await approval

After saving the files:

1. Show a summary:
   - <component>s designed
   - New endpoints per <component> (paths from `<api-artifact>`)
   - New schemas created
   - Whether it includes a data model (and whether `docs/data-model.md` was generated)
   - Whether `docs/research.md` was generated (and how many decisions it documents)
   - The "Global Architecture Impact" verdict (Yes/No, and if Yes, which
     C4 level and which node/edge — this is what `/sync` will read to
     invoke `/architecture` without re-analyzing it)
   - The Quality Gates validation result (all ✅, or which ones are ⚠️ with an exception)
   - If there was no constitution, a mention that `/constitution` would make it enforceable

2. Show the full content of `docs/research.md` (if generated), `docs/diagram.md`,
   `docs/component.md` (if generated), `<api-artifact>` (`api.delta.yaml` or `api.yaml`,
   per `API_CONTRACT_MODE`), `docs/data-model.md`
   (if generated), and `design.md` for review — with the API contract being the
   contract the user most needs to validate carefully, and the Quality Gates
   table the compliance summary to confirm.

3. Say:
   > "**STOP:** Review the full contract (`<api-artifact>`), the diagram and the data
   > model (if applicable) before continuing.
   > Once approved, `/plan` generates the DTOs and the entity/migration from these
   > files — a later change means regenerating them.
   > If something isn't right, say so now. When you're ready, run `/plan spec-<number>`."

4. Stop — do not start planning.

---

## Common Issues

| Issue | Cause | Resolution |
|-------|-------|------------|
| context.md not found | /clarify never ran | Tell the user to run /clarify first |
| `spec.md` has `[NEEDS CLARIFICATION]` markers | Unresolved ambiguities | STOP: run `/clarify spec-<number>` before designing |
| A Quality Gate fails (⚠️) | The design violates a principle | Adjust the design to pass it, or record a justified exception in `design.md` and approve it in PHASE 5 |
| No constitution | `/constitution` never ran | Apply the 4 built-in gates by default; suggest `/constitution` to make them enforceable |
| Undefined field in a schema | Ambiguous item | Ask in PHASE 3 before designing |
| Affected <component> not identified | Incomplete context.md | Ask the user before continuing |
| Diagram with no schema names on the arrows | Missing contract information | Resolve in PHASE 3 before diagramming |
| `component.md` already exists from an earlier story of the same module | It's a living per-module document, accumulated across stories | Read it first and update it surgically — never regenerate it from scratch, that would lose earlier stories' components |
| Unclear whether the story touches global architecture | The module/integration is ambiguous with respect to what `context.md` already lists | Resolve it in PHASE 3 as one more question — never leave "Global Architecture Impact" ambiguous, `/sync` and `/architecture` trust that answer as written |
| New table not confirmed | Item ambiguous about persistence | Ask it as one of the 5 questions |
| `<api-artifact>` modified after /plan | Contract change after approval | Warn: run `/plan spec-<number>` again to regenerate the DTOs |

---

## Output language

**Artifact prose follows `ARTIFACT_LANGUAGE`** (profile, section 5 — falls back to
`OUTPUT_LANGUAGE` if the project doesn't declare it): the prose of `design.md`,
`docs/research.md`, `docs/diagram.md`, `docs/component.md`, `docs/data-model.md`,
`docs/flows/*.md`, plus the `summary` and `description` fields of the API contract and
the labels of the diagrams. Never translate them to English on your own.

Two things stay in English regardless of that key: the **section headings**
(`## Design Decisions`, `## Global Architecture Impact` — `/sync`, `/plan` and
`/architecture` read them by name) and the **identifiers** — paths, schema names,
`operationId`, fields, endpoints, table and column names (`IDENTIFIER_LANGUAGE`).

**Chat interaction follows the user's language** (`OUTPUT_LANGUAGE` in the profile).
The message samples in this document are written in English; render them in the
user's language when that differs.
