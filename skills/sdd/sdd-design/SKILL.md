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

Read the story's requirements and the codebase context, resolve what blocks a field, a
contract or a behavior by asking, and produce the story's artifacts — the API contract
first among them. The result is **API-first**: `<api-artifact>` is approved **before** any
code exists, and `/sdd-plan` generates the DTOs that conform to it, never the reverse.

**The skill runs in the main agent, start to finish** — it loads the context, asks the
questions, writes every artifact, and verifies its own output through the `CONTRACT_LINT`
and `DIAGRAM_CHECK` ports.

> **Why not a drafting subagent:** designing is one sequential actor's job, and this
> document is its instructions. A subagent would have to re-read this file cold, then hand
> its state to a second cold subagent — paying the whole context twice over for work that
> has no parallelism to win back. Delegate for fan-out or for discardable bulk, never to
> move sequential work off your own desk.

**Announce at start:** "Designing the technical specification for spec-<number>."

**Output** — each artifact's path, condition and rules are stated once, in its own contract
under `~/.agents/contracts/artifacts/`; PHASE 4 lists the six and the order to write them
in. Two profile axes select their shape:

| Axis | Default | The other value |
|---|---|---|
| `API_CONTRACT_MODE` | `delta` — only what the story adds or changes, merged by `/sdd-sync` into the module's canonical `api.yaml` | `full` — the complete contract per story, copied as is |
| `DOC_UNIT` | `story` — `docs/diagram.md` + `docs/component.md`, scoped to this item | `use-case` — one living `docs/flows/<slug>.md` per use case, replaced whole by `/sdd-sync` |

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
>
> **This skill runs only at `tier: full`.** `standard` and `fast` have no design to produce
> either: no API contract, no data model and no sequence diagram, and `/sdd-plan` requires
> none of them at `standard` — at `fast` it never runs at all. What the omitted design costs
> is paid elsewhere, and deliberately: `standard` keeps `/sdd-clarify`'s `context.md` and an
> atomic plan whose contracts are signatures and invariants, and `fast` keeps
> `## Change Surface` in `spec.md` — the files and symbols the change is confined to —
> closing the story with `## AC Coverage` in that same artifact. If you are invoked on
> either tier, say so and stop; the story is not missing a step. The way in is raising the
> tier: `/sdd-refine` on `spec.md`, not a design run, because the tier is what decides
> whether this stage exists.

**Requires**

| Condition | Check | If it fails |
|---|---|---|
| The story runs at `tier: full` | `spec.md`'s front matter carries no `tier`, or `tier: full` | Stop: "`spec-<number>` runs at a reduced tier, which omits the design stage — there is no API contract, no data model and no sequence diagram to produce, and `/sdd-plan` requires none of them. Raising the tier is `/sdd-refine` on `spec.md`, not a design run." |
| You are in the project's working directory | `pwd` == `WORKING_DIRECTORY` (absolute path, from the profile) | `cd` there before running anything |
| `spec.md` exists | `[ -f work/active/spec-<number>/spec.md ]` | Stop: "I couldn't find `work/active/spec-<number>/spec.md`. Run `/spec spec-<number>` first." |
| `context.md` exists | `[ -f work/active/spec-<number>/context.md ]` | Stop: "I couldn't find `work/active/spec-<number>/context.md`. Run `/clarify spec-<number>` first." |
| **Ambiguity gate:** zero unresolved markers | `grep -c 'NEEDS CLARIFICATION' work/active/spec-<number>/spec.md` returns `0` | Stop, do not design: "`spec.md` still has `<N>` unresolved `[NEEDS CLARIFICATION]` markers. Designing a contract on top of ambiguities produces potentially incorrect DTOs and behaviors. Run `/clarify spec-<number>` to resolve them before `/sdd-design`." |

`/sdd-clarify` closes its own run with that same `grep -c` at `0`. A spec that still
carries markers is therefore a spec `/sdd-clarify` never finished: the gate catches a
broken handoff, and no marker is minor enough to design past.

**Produces** — the artifacts PHASE 4 writes, each governed by its contract under
`~/.agents/contracts/artifacts/`. What `/sdd-plan` and `/sdd-sync` look for is therefore
stated once, there: the normative headings of `design.md` and the two sections the close-out
copies verbatim (`design-md`), the contract file's two shapes and its five checks
(`api-contract`), the pairing between `## Data Modeling` and `docs/data-model.md`
(`data-model-md`), and the diagram artifact `DOC_UNIT` dictates (`diagram-story` /
`flow-md`).

Two of those guarantees are **countable, not a matter of judgment**, and both are checked by
running a command rather than by re-reading an artifact: the ambiguity gate in `Requires`
(`grep -c 'NEEDS CLARIFICATION'` = `0`, so every design rests on a spec with no open
markers) and check 2 of the API contract (`grep -n '<[a-z]'` over `<api-artifact>` = no
matches). One marker or one placeholder left is a stop.

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

**Degrades** — none of the ports blocks the design; each falls back to manual and leaves its
mark in `design.md`. The per-artifact behavior lives in each contract's own `Degrades`
section; the one that belongs to this skill alone is `stack.SKILLS` unset or empty → load
only what the project's `conventions.md`/`CLAUDE.md` require.

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

Run these six steps, in order. Steps 2, 4 and 5 are the drafting PHASEs documented below;
you execute them yourself, in this same session.

### Step 1 — Preconditions (Requires)

Check every `Requires` row above. Any failure → stop with the listed message.

### Step 2 — Run PHASE 1 and PHASE 2

Work through `references/interview.md`: that reading is what produces the unknowns to ask
(max 5, each with a recommended answer), the reconciliation inventory, and the Global
Architecture Impact doubt.

If the context is too broken to analyze at all, stop here and take the blocker to the
user — don't design on top of it.

### Step 3 — Resolve the unknowns (PHASE 3)

For each unknown from PHASE 2, in priority order, ask ONE question at a time with the
`AskUserQuestion` tool — one call per unknown, never batched, since the answer to one can
change whether the next is still relevant. Use your recommended answer as the first option,
labelled " (Recommended)". The field mechanics and the question wording are in
`references/interview.md`.

Rules: maximum 5 questions total across the whole session; never reveal upcoming questions
in advance; if PHASE 2 found no unknowns, skip this step — and then omit
`## Design Decisions` from `design.md` entirely, never as an empty header.

Record each resolution immediately as one bullet for `## Design Decisions`:

```markdown
- **<unknown resolved>:** <chosen option> — <brief reason>
```

### Step 4 — Run PHASE 4 and PHASE 4.5

Load the profile's `stack.SKILLS` best-practice skills, then produce the story's artifacts
in the order PHASE 4 lists, reading each artifact's contract before writing it. Carry step
3's `## Design Decisions` bullets into `design.md` — or omit the section entirely when there
were none. Then validate the design against the project's constitution (PHASE 4.5).

### Step 5 — Post-draft verification

Verify against the files on disk, not against what you meant to write:

1. **The contract's validation:** run the `## Validation` section of
   `~/.agents/contracts/artifacts/api-contract/CONTRACT.md` over
   `work/active/spec-<number>/docs/<api-artifact>`. Check 2 is re-run here, against the
   file on disk, on purpose: it catches a placeholder you believed you had filled in.
2. **Diagram gate:** call the `DIAGRAM_CHECK.run` port over the Mermaid blocks.
   Unbound → review identifiers by hand and note it in `design.md`. A failing symbol
   that this story is about to create is expected — it stays as a known risk in
   `design.md`, never renamed to force a pass.
3. Confirm `design.md` carries every heading the `design-md` contract declares — the
   always-present ones and the conditional ones this run actually produced.

If a check fails → **fix-and-retry, max 3**: correct the artifact and re-verify. After
3 attempts, record the failure in `design.md` as a known risk and surface it in the
PHASE 5 summary.

### Step 6 — PHASE 5 close

Show the summary, surface the escalations, and stop for approval (see PHASE 5
below).

---

## Drafting PHASE 4: the story's artifacts

*Run inline, in the main agent.*

Six artifacts, five of them conditional, each with a contract under
`~/.agents/contracts/artifacts/` that fixes its identity, what may feed its fields, its shape
and its validation. **Read the contract before writing its artifact** — this skill produces
them, it does not own their rules.

```bash
mkdir -p work/active/spec-<number>/docs/
```

| Artifact | Written when | Contract |
|---|---|---|
| `docs/research.md` | a non-trivial technical decision was taken | `research-md` |
| the diagram artifacts — `docs/diagram.md` + `docs/component.md`, or one `docs/flows/<slug>.md` per use case | always; `DOC_UNIT` decides which | `diagram-story` / `flow-md` |
| `docs/<api-artifact>` | always — `API_CONTRACT_MODE` decides `api.delta.yaml` or `api.yaml` | `api-contract` |
| `docs/data-model.md` | a table is added or changed | `data-model-md` |
| `design.md` | always, and written last | `design-md` |

Write them in that order: `design.md` describes the files beside it, and each of its
conditional sections keys on which of them exist. The contract stays **API-first**
throughout — approved before any code exists, with the plan generating the DTOs that
conform to it field by field, never the reverse.

Under `DOC_UNIT = use-case`, the diagram row has an extra step that belongs to this skill
rather than to the artifact: `references/flow-mode.md` is the reconciliation algorithm —
derive the use cases from the acceptance criteria, inventory the living identities, and
decide `create` / `modify` / `deprecate` **before** writing anything.

Never embed the diagram, the schemas or the entity/SQL inline in `design.md`: each has its
own file, and a second copy is a second source of truth.

---

## Drafting PHASE 4.5: Constitution & Quality Gates validation

*Run inline, in the main agent; exceptions are approved by the user in PHASE 5.*

Validate the design against the project's non-negotiable principles: confirm it violates no
Article of the constitution, and mark each active Quality Gate pass or fail with a one-line
justification, recorded in `design.md` under `## Quality Gates Validation` in the shape the
`design-md` contract's floor gives it.

With no constitution, apply the four built-in gates anyway — Simplicity, Anti-Abstraction,
Integration-First, Test-First — and say in the summary that `/sdd-rules` would make them
enforceable project-wide.

A gate that **fails** (⚠️) is never a silent choice: adjust the design to pass it, or record
an explicit, justified exception under `## Constitution Exceptions` and carry it to PHASE 5
for the user's approval.

---

## PHASE 5: STOP — await approval

Once verification passes and the escalations are handled:

1. Summarise what was produced: the <component>s, the new endpoints and schemas, whether
   `docs/data-model.md` and `docs/research.md` were generated, the **Global Architecture
   Impact verdict** (Yes/No, and if Yes the C4 level and the node/edge — this is what
   `/sdd-sync` reads to invoke `/sdd-docs` without re-analysing anything), the Quality
   Gates result, and every escalation with its resolution. If no constitution was found,
   say that `/sdd-rules` would make the gates enforceable.
2. Point the user at the artifacts for review — `design.md`, `<api-artifact>`
   (`api.delta.yaml` or `api.yaml`, per `API_CONTRACT_MODE`), the diagram artifacts,
   `docs/data-model.md`, `docs/research.md` — naming the API contract as the one to
   validate most carefully and the gate table as the compliance summary. Show the full
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

The 4 that **interrupt a run** — it stops, or the call goes back to the user.
Every other failure mode is in `references/common-issues.md`, with its cause and
resolution.

| Issue | Cause | Resolution |
|-------|-------|------------|
| context.md not found | /sdd-clarify never ran | Tell the user to run /sdd-clarify first |
| `spec.md` has `[NEEDS CLARIFICATION]` markers | Unresolved ambiguities | STOP: run `/clarify spec-<number>` before designing |
| A Quality Gate fails (⚠️) | The design violates a principle | Adjust the design to pass it, or record a justified exception in `design.md` and approve it in PHASE 5 |
| You can't even list the unknowns in PHASE 2 | Missing context, or a spec that contradicts itself | Stop before drafting: show the blocker, fix the input (`/sdd-refine`/`/sdd-clarify`), then re-run |

---

## Example

A full worked run — a design run and the artifacts it leaves — is in
`references/example.md`. Read it when the shape of the output is in doubt.

---

## Output language
**Conversational output** follows `~/.agents/references/chat-conventions.md` - the six blocks (announce, progress, question, summary, stop, handoff).

**Artifact prose follows `ARTIFACT_LANGUAGE`** (language block): the prose of `design.md`,
`docs/research.md`, `docs/diagram.md`, `docs/component.md`, `docs/data-model.md`,
`docs/flows/*.md`, plus the `summary` and `description` fields of the API contract and
the labels of the diagrams.

The **section headings** stay English regardless of that key (`## Design Decisions`,
`## Global Architecture Impact` — `/sdd-sync`, `/sdd-plan` and `/sdd-docs` read them by name).

The **identifiers** you design — paths, schema names, `operationId`, fields,
endpoints, table and column names — follow `IDENTIFIER_LANGUAGE` (profile, language
block). They are what `/sdd-plan` turns into code, so name them in the language that key
declares and match the existing code; the skill carries no default of its own.
