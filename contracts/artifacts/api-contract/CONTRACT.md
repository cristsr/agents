---
floors:
  references/api-template.md: template.md
  references/openapi-to-dto-mapping.md: openapi-to-dto-mapping.md
---

# api-contract

The API contract of one story: what the endpoints accept and return, written **before** any
code exists. It is the source of truth the generated DTOs come from, and the document a human
approves before implementation starts.

## Identity

- `api.delta.yaml` under `API_CONTRACT_MODE = delta` (the default) — only the `paths` and
  `components.schemas` this story adds or changes, grouped by `tags`, one per module.
  `api.yaml` under `full` — the complete contract for the story.
- Either way at `work/active/spec-<number>/docs/`, in `API_CONTRACT`'s notation (profile, docs
  block — e.g. OpenAPI 3.1). One file per story, however many <component>s it touches.
- It exists in the `tdd` carril only: a story in `build_mode: evidence` has no API contract.

## Requires

| Condition | If it fails |
|---|---|
| `spec.md` and `context.md` exist, with no `[NEEDS CLARIFICATION]` marker left | Stop before writing — a contract over an open ambiguity produces wrong DTOs |
| Every field traces to a field already in `context.md` (exact name and type), or to a `design.md` `## Design Decisions` bullet | Don't write it. Ask, or drop the field |
| Under `delta`, the module's canonical `<DOCS_MODULE>/<module>/api.yaml` has been read, where it exists | Writing blind turns a modification into a duplicate |

## Shape

`template.md` is the floor; a pack shipping `references/api-template.md` overrides it. Normative:

- The root declares `API_CONTRACT`'s version; `info.title` starts with the story's id.
- `tags` holds at least one entry with `name` and `description`.
- Under `delta`, `paths` carries only what this story adds or changes. Every path starts with
  `/`; one endpoint is one `path` plus one `operationId`.
- Every operation has `operationId`, `summary` and at least one `response`; every
  `application/json` request body has a `schema`.
- Response descriptions state the business case, never a generic "Success".
- `required` defines mandatoriness: a field absent from it is optional downstream.
- `format` (`uuid`, `date-time`, `email`) wherever it applies — it maps to the stack's
  validators. `enum` for a closed value set, not `type: string` with the options in prose.
- `summary` and `description` follow `ARTIFACT_LANGUAGE`; paths, schema names and
  `operationId` follow `IDENTIFIER_LANGUAGE`.

## Generation

**API-first**: approved before any code exists, with the DTOs conforming to it, never the
reverse. Built from `context.md`'s entity and DTO fields plus `design.md`'s `## Design
Decisions` — nothing else is a source.

- Under `delta`, an endpoint that **modifies** an already-published contract is flagged in
  `design.md`, so the change gets classified with `CONTRACT_DIFF.run`.
- No framework DTO snippets in `design.md`: they are generated code.
- The field-by-field conversion to a class is `openapi-to-dto-mapping.md`, the floor a pack
  may override with its own decorators and validators.

## Validation

Checks 2-5 run with the file tools as it is written; check 1 runs afterwards, on disk.

1. `CONTRACT_LINT.run` with `<api-artifact>`. Unbound → reviewed by hand, and `design.md`
   records that there was no automatic check.
2. `grep -n '<[a-z]' <api-artifact>` has zero matches. The grep is deliberately blunt, so it
   also catches prose containing `<`: a real placeholder is filled in, legitimate prose is
   reworded (`is below the limit`). Never silence it by narrowing the grep.
3. Every `$ref: '#/components/schemas/<Name>'` resolves to a schema of that exact name.
4. Root version, `info.title`, a `tags` entry, `/`-prefixed paths, and
   `operationId`/`summary`/response per operation, a `schema` per JSON body.
5. `format` implies a parent `type: string`; `enum` carries no redundant `type`.

A failure is fix-and-retry, **max 3**; then it is recorded in `design.md` as a known risk and
surfaced at the close. Never a reason to weaken a check.

## Mutability

**Mutable:** `info.description`; a path or method; a path's `responses`; a schema's
`properties`; a property's `type`/`format`/`enum`; the `required` array.

**Read-only:** the version line (structural), `tags` (they mirror `context.md`'s components),
and an existing operation's `operationId` — it is the identity promotion reconciles by, so
renaming it turns a modification into a second operation.

Correcting a description is minor. Adding an endpoint, or renaming/adding/removing a schema
field, is **structural**: the plan is re-run before the build.

## Guarantees

- **It is the source of truth for what is generated from it**: every field of a generated
  class traces back to a field here, through `openapi-to-dto-mapping.md` — never to the
  narrative design, which only links to it.
- **An approved contract is not re-derived**: the implementation is checked against it, and a
  client collection exported from it, without introducing a field it does not carry.
- **Promotion merges, it does not append**: under `delta`, each `path` and each
  `components.schemas` replaces its counterpart in the canonical file, everything untouched is
  kept, and the canonical `info.title` never changes; the result is classified with
  `CONTRACT_DIFF.run`. Under `full`, the file is promoted as it stands.
