---
floors:
  references/flow-template.md: template.md
---

# flow-md

One use case, documented whole: its diagram **inline**, the business rules it enforces, the
errors it raises and what it answers. It is the `use-case` unit of documentation — under
`DOC_UNIT = story` (the default) no file of this shape exists, and the story's diagram pair
takes its place.

The diagram lives inside the document on purpose: there is no separate model to keep in step
and no view id to point at, so the picture and its semantics are edited together, in one file.

## Identity

- `work/active/spec-<number>/docs/flows/<slug>.md`, one per use case the story touches.
- Under `DOC_UNIT = story` it does not exist, and nothing looks for it.
- Promoted to `DOCS_UNIT_FLOWS` = `<unit>/flows/<slug>.md`, replaced **whole**. Git keeps the
  previous version.
- `template.md` is the floor, overridden by a pack's `references/flow-template.md`. That floor
  is the seam for the diagramming tool: a project on another notation supplies its own from its
  pack, and nothing else changes.

## Requires

| Condition | If it fails |
|---|---|
| The documentation unit is resolved — the code root the flow documents. A `command` whose handler lives in a lib yields `libs/<lib>/docs/flows/`, not `apps/<app>/docs/` | Ask. Documentation lives next to the code it describes, and a flow filed under the wrong root is one nobody finds |
| The identity is resolved **before** writing: the living docs inventoried for the `use_case` slug, its `entrypoint` and its `command`, and the module's canonical `api.yaml` for `path` + method and `operationId` | Writing blind turns a modification into a duplicate |
| On a `modify`, the living file has been read | Read it first: a rewrite that drops `introduced_by` erases when the flow appeared |

## Shape

`template.md` is the floor, and the front matter it declares is the norm: `use_case`, `module`,
`trigger`, `entrypoint`, `command`, `invariants`, `introduced_by`, `last_modified_by`,
`status`. **There is no `view:` key.** Then a ` ```mermaid ` block with a `sequenceDiagram`,
the use case's name, one or two paragraphs on what the flow does, `## Rules` with the
verifiable business rules, `## Errors` as a condition/exception/code/HTTP table, and
`## Response`. `status` is `active`, `deprecated` or `removed`.

## Generation

- `trigger` comes from the nature of the primary adapter, not from the HTTP verb. For
  `trigger: rest`, `entrypoint` matches a `path` in the module's canonical `api.yaml`.
- **`create`:** `introduced_by` and `last_modified_by` are both this story. **`modify`:** keep
  `introduced_by`, move `last_modified_by`.
- **Reuse the identity verbatim.** If the endpoint, the command or the event already exists, it
  is never a `create` — it is a `modify` of that flow: same slug, same `operationId`. Never
  mint a parallel document: one use case lives in exactly one file, and its evolution is git
  plus `last_modified_by`.
- **A translation is 1:1** — same message order, the same participants and the same text. No
  `alt`/`opt` the original did not have: errors read better in the `## Errors` table.
- Diagram identifiers are verbatim from the code, and the *visible* name is what the gate
  resolves. External actors (`Client`, `User`, `Postgres`, `Keycloak`) are exempt. In a
  `flowchart`, `X("Name")` must resolve; `X[("table")]` and `subgraph` don't.
- Prose in `ARTIFACT_LANGUAGE`; front-matter keys, headings and diagram identifiers verbatim.

## Validation

`DIAGRAM_CHECK.run` over the document's Mermaid block. A symbol this story is about to create
is pending: the gate failing on it is expected, it is recorded as a known risk in `design.md`,
and it is never renamed to force a pass. Unbound → the identifiers are reviewed by hand and
`design.md` says so.

## Mutability

**Mutable:** the sequence diagram (a step, a participant rename, a hop) when the flow was
simplified or changed, and the surrounding prose.
**Read-only:** the front matter's `use_case` — it is the identity promotion reconciles by,
exactly like an operation's `operationId`. Renaming it turns a modification into a duplicate.

Clarifying prose is minor. Changing the flow significantly — a new hop, a new participant — is
**structural**: the plan is re-run before the build.

## Guarantees

- **It is the implementation order**: each hop in the inline diagram is a step of the work, and
  no separate diagram file is needed while this artifact exists.
- **Promotion replaces it whole**, keeping the living file's `introduced_by` and setting
  `last_modified_by`; a `status: deprecated` or `removed` flow is marked, never deleted.
- **The diagram is the document**: rules, errors and response travel with it, so one use case is
  never reconciled across two files.
