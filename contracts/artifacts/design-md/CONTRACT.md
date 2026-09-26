---
headings:
  - Global Architecture Impact
  - Module Components
  - Quality Gates Validation
---

# design-md

The narrative of one story's design: the flow in prose, the decisions taken, the components
touched, the impact on the global architecture and the quality-gate result. Every
machine-readable counterpart lives in `docs/` and is **linked**, never embedded.

## Identity

- `work/active/spec-<number>/design.md` — beside `spec.md` and `context.md`, not under `docs/`.
- Written in the `tdd` carril only: a story in `build_mode: evidence` has no design.
- `template.md` is the floor.

## Requires

| Condition | If it fails |
|---|---|
| `spec.md` and `context.md` exist, with no `[NEEDS CLARIFICATION]` marker left | Stop — the gate the whole stage passes |
| Every artifact it links exists: `## Data Modeling` present **if and only if** `docs/data-model.md` exists, and the contract file and the mode's diagram artifact exist | Stop. A named artifact the plan cannot read is a plan it cannot write |
| `## Global Architecture Impact` is decided, not deferred — comparing this story against the modules, apps and integrations `context.md` lists as existing | Ask: it is one of the design's own unknowns. A vague answer is not an option, because it is applied verbatim downstream |

## Shape

`template.md` is the floor. The headings marked *checked* are declared in this file's front
matter, because a script looks them up by name.

| Heading | |
|---|---|
| `# design: spec-<number>` | The story's id |
| `## Design Decisions` | **Conditional** — present iff at least one unknown was resolved, never an empty header. Read verbatim into the cumulative decision log |
| `## Cross-Service Flow` | One or two sentences, plus a link to the diagram artifact |
| `## Module Components` | *checked* — one sentence naming the components added or changed, linking to `docs/component.md` |
| `## Global Architecture Impact` | *checked* — **always present.** Yes/No, and when Yes the C4 level plus the concrete node or edge. Read verbatim, re-derived from no diff |
| Endpoint table per <component> | Method, path and business description, linking to the contract for the schemas |
| `## Data Modeling` | **Conditional** — iff `docs/data-model.md` exists. Names the tables and links; the entity and the SQL are not repeated |
| `## Quality Gates Validation` | *checked* — always present |
| `## Constitution Exceptions` | **Conditional** — only for a gate that failed and that the user approved proceeding on |

Never embed the diagram, the DTO or schema definitions, or the entity and migration SQL: each
has a file of its own, and a second copy is a second source of truth.

## Generation

Written **after** the artifacts it links, describing them: each `docs/` file is named once,
with the reason a reader would open it. Prose follows `ARTIFACT_LANGUAGE`; the headings stay
in English. The endpoint table's method and path project the API contract, and `## Data
Modeling`'s table names project `docs/data-model.md` — when a projection and its source
disagree, the source wins and this file is corrected.

## Validation

`~/.agents/scripts/validate-artifacts.mjs` reads the `headings` declared above, over the file
on disk:

- `## Global Architecture Impact` missing → an **error**; present with no recognisable yes/no
  answer → an **error**, because nothing downstream can decide from it.
- `## Module Components` and `## Quality Gates Validation` missing → a **warning**.

No port is involved, so nothing degrades here. `scripts/test/contracts.test.mjs` asserts this
list equal to the validator's own, so a rename on either side goes red.

## Mutability

**Mutable:** the decisions; the flow prose; a component's role; the architecture verdict,
including flipping it to Yes when a refinement adds an integration; a business description; a
table name.

**Read-only:** the artifact header; the `### <component>` headings (a change in the set of
components is a design run, not an edit); the endpoint table's method and path (the contract
owns them); `## Data Modeling`'s entity and SQL (`data-model.md` owns them); the gate table
(re-evaluated, never edited into passing).

Correcting prose is minor. Flipping the architecture verdict, or changing the set of
components, is **structural**: the plan is re-run before the build.

## Guarantees

- **It is the narrative, not the source of truth**: it names the schemas and the entity and
  links to them. `## Data Modeling` being present is what says `docs/data-model.md` exists.
- **Two sections are read verbatim** — `## Global Architecture Impact`, which decides whether
  the system-level C4 documentation is refreshed, and `## Design Decisions`.
- **It is where a reader starts**, following the links for the machine-readable detail.
