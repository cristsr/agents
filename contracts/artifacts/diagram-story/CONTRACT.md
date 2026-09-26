# diagram-story

The story-scoped picture of how the change works: a sequence diagram of the data travelling
between <component>s, and the C4 Level 3 view of the module's internal building blocks. Two
files, emitted together, and only under `DOC_UNIT = story` (the default) — under `use-case`
the flow documents carry their own inline diagram instead, and neither file is produced.

## Identity

- `docs/diagram.md` — the story's sequence diagram, always emitted in this mode.
- `docs/component.md` — the module's C4 Level 3 view, emitted unless the story adds and
  changes zero internal components (a purely configuration change, for instance).
- Notation is `DIAGRAM_FORMAT` (profile, docs block). `docs/component.md` accumulates into
  `<DOCS_MODULE>/<module>/component.md`; `docs/diagram.md` is promoted as it stands.
- `template.md` is the floor.

`component.md` is a **living, per-module document** that accumulates across stories, exactly as
the system-level `containers.md` does. `diagram.md` belongs to one story.

## Requires

| Condition | If it fails |
|---|---|
| The components are known — `context.md`'s affected components and the API contract's `tags` | Read them first. A participant invented here is a name the gate cannot resolve and the plan cannot implement |
| `DOCS_MODULE` resolves the module's docs folder | Ask — the modular destination is a project convention, not a guess |
| On a re-run, the living `component.md` has been read, where it exists | Read it first: regenerating it drops what earlier stories added, invisibly |

## Shape

- **`docs/diagram.md`** — one `sequenceDiagram` under a `# Flow diagram: spec-<number>`
  heading. Every <component> in order; each arrow labelled with the method, the path and the
  schema name, matching the contract's `operationId` and schema names; `->>` for requests,
  `-->>` for responses; the initiating actor is a participant; internal hops are shown too.
- **`docs/component.md`** — the module's internals grouped by hexagonal layer (`domain` /
  `application` / `infrastructure`), one node per component: the use case(s)/handler(s), the
  aggregate(s)/entity(ies), the port(s)/repository(ies) and the adapters implementing them. It
  is **not** under `DOCS_ARCHITECTURE`: C4 Level 1 and 2 belong to another document.

Identifiers are verbatim from the code, and the *visible* name is what the gate resolves. In a
`flowchart` the shape declares the node class: `X("Name")` must resolve; `X[("table")]`
(cylinder) and `subgraph` don't.

## Generation

`diagram.md` follows the API contract — the same operations, the same schema names — and what
`context.md` says each component does. `component.md` comes from `context.md`'s existing
components plus what this story adds; where the promoted file exists, it is updated
**surgically**. Labels and prose follow `ARTIFACT_LANGUAGE`; names stay verbatim.

## Validation

`DIAGRAM_CHECK.run` over both documents' Mermaid blocks: every identifier must name a real
symbol. A class this story is about to create is a **pending symbol** — the gate failing on it
is expected, it is recorded as a known risk in `design.md`, and it is never renamed to force a
pass. Renaming a node to buy a green check is the one repair that is always wrong: it makes the
diagram describe something other than the code. Unbound → the identifiers are reviewed by hand
and `design.md` says so.

## Mutability

`diagram.md` is one diagram: adjusting the flow, adding a step, or renaming a participant
without changing the call structure is a correction. A significant change to the flow is
**structural** — the plan is re-run before the build.

`component.md` accumulates, so the only legal edit is the surgical addition of this story's
components. It is never regenerated from scratch.

## Guarantees

- **`component.md` accumulates, and that is load-bearing**: the living per-module document
  gains this story's components and keeps the ones still in force.
- **`diagram.md` belongs to one story**, and is promoted as it stands.
- **The diagrams are the work**: a hop is a step of the implementation order, a node is a
  building block of the module.
