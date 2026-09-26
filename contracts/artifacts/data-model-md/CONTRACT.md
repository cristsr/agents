---
floors:
  references/data-model-template.md: template.md
---

# data-model-md

The persistence contract of one story: the schema definition in the project's ORM and the
migration that creates or changes it, in full. It is a file of its own because it has a
different audience (whoever reviews and runs the migration) and a different consumer: the
schema and migration tasks are written from it, field by field.

## Identity

- `work/active/spec-<number>/docs/data-model.md`.
- It exists when the story adds a new table or changes an existing one, and does not exist
  otherwise — never an empty file, never a placeholder section.
- It pairs with `design.md`'s `## Data Modeling`: present **if and only if** this file is.
- `template.md` is the floor, overridden by a pack's `references/data-model-template.md`.

## Requires

| Condition | If it fails |
|---|---|
| A criterion or `context.md` names a table, column or persistence change | Skip the file entirely — designing a schema nothing asks for is scope the plan will faithfully implement |
| Every field traces to a field already in `context.md` (exact name and type), or to a `design.md` `## Design Decisions` bullet | Don't write it. Ask, or drop the field |
| `ORM` and `MIGRATIONS` are resolved from the profile | Ask which stack — the schema's form is not something to guess |

## Shape

One `## EntityName` per new or changed table, each with:

- `### Schema definition (per the project's ORM)` — a fenced block in the ORM's language. The
  floor shows the generic form; a pack's override, the concrete one (decorators, column naming).
- `### SQL migration` — a fenced `sql` block, in `MIGRATIONS`' form.

Whatever the stack: **names and types match exactly between the two blocks** (the
entity-field-consistency check compares them, column by column); field names match
`context.md` where the field already exists on a related entity; a field also exposed in the
API contract keeps the same name there, unless `## Design Decisions` records why it differs;
full definitions, never a sketch. Headings in English, prose in `ARTIFACT_LANGUAGE`, names
verbatim from the schema.

## Generation

Built from `context.md`'s entity fields and from `design.md`'s `## Design Decisions` — nothing
else is a source. The block's style (decorators, column naming, key types) comes from the
project's stack; names follow `IDENTIFIER_LANGUAGE`. Written **before** the plan, whose entity
and migration tasks are a projection of it: a schema invented during planning is a schema
nobody decided.

## Validation

No script and no port. Two mechanical checks hold it:

1. **The pairing** — `design.md` carries `## Data Modeling` if and only if this file exists.
   The plan stage refuses to start when the pairing breaks, in either direction.
2. **Field consistency** — the plan re-reads this file and verifies that the entity and the
   migration tasks carry the same names and types, and no field this file does not have.

## Mutability

**Mutable:** the entity's fields, and the migration's columns kept in step with them.
**Read-only:** the artifact header and the `## EntityName` headings — a change in the set of
tables is a design run, not an edit.

Any field change is **structural**: the plan is re-run before the build. If the file does not
exist, there is nothing to correct here and the change belongs to a design run.

## Guarantees

- **It is the source of truth for the entity and the migration**, field by field: a generated
  entity or migration that disagrees with it is the defect, not the reverse.
- **It wins no argument with the narrative**: `design.md` names the tables and links here; the
  columns and their types are this file's.
- **It travels with the story**, and it is what a later correction to the persistence model is
  checked against.
