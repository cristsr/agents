# design.md Template

Save to `work/active/spec-<number>/design.md` using exactly this structure.
Remove sections marked as conditional if they do not apply.

`design.md` is the narrative summary — full machine-readable contracts live
in `work/active/spec-<number>/docs/` (see `<STACK_REFS>/references/api-template.md` for the
API contract and `<STACK_REFS>/references/data-model-template.md` for `docs/data-model.md`).
Never embed the full diagram, DTO/schema definitions, or the
entity/migration SQL inline here — reference the files in `docs/`
instead.

---

```markdown
# design: spec-<number>

## Design Decisions

<!-- OPTIONAL: Include only if PHASE 3 resolved at least one unknown via
     questions. Omit this section entirely if design.md was produced with
     zero ambiguities (everything was already defined in spec.md/context.md). -->

- **<unknown resolved>:** <chosen option> — <brief reason>

## Cross-Service Flow

<1-2 sentence summary of what the flow does — the full diagram is in `docs/diagram.md`>

## Module Components

<1 sentence: which new/modified component(s) this story introduces
(use case, aggregate, port, adapter) — the full diagram (C4 Level 3,
the whole module, not just the delta) is in `docs/component.md`>.

## Global Architecture Impact

<!-- ALWAYS present, never conditional — it's what lets /sync promote
     without having to re-detect anything from a git diff. -->

**Does it touch global architecture?** Yes / No.

<!-- If Yes: name exactly what changes and at which C4 level, with the
     concrete node/edge to add or remove — /sync and /architecture apply it
     verbatim, they don't re-infer it.
     If No: one sentence confirming the scope is internal to the module. -->

- **Level:** Context (Level 1) / Container (Level 2) / N/A
- **Change:** <new app/microservice | new module | new external
  integration | removed integration | new actor | none>
- **Concrete node/edge:** <what /architecture must add/remove, or
  "N/A" if the answer was No>

## Contracts per Service

### <component-1>

| Method | Path | Business description |
|--------|------|----------------------|
| POST | /resource/search | <what it solves, not just the HTTP verb> |

> Full request/response schemas, validations and response codes: `docs/api.yaml` (tag `<microservice-1>`).

---

### <component-2>  ← repeat if there is more than one

[same structure]

---

## Data Modeling  ← omit if there is no new table

New entity(ies): `table_name`.

> Full entity/schema and SQL migration: `docs/data-model.md`.

## Quality Gates Validation

<!-- Always present. If a constitution is loaded, validate its gates; if not,
     apply the four built-in gates by default. -->

| Gate | Result | Justification |
|------|--------|---------------|
| Simplicity | ✅/⚠️ | <one-line justification> |
| Anti-Abstraction | ✅/⚠️ | <one-line justification> |
| Integration-First | ✅/⚠️ | <one-line justification> |
| Test-First | ✅/⚠️ | <one-line justification> |

## Constitution Exceptions  ← omit if every gate passed (✅)

<!-- OPTIONAL: only if a gate fails (⚠️) and the decision is to proceed anyway
     with a justification approved by the user in PHASE 5. -->

- **<Gate/Article violated>:** <why the exception is made> — approved by the user.
```

## Language rules

- Section headings: English. They are structural — `/sync` reads
  `## Global Architecture Impact` and `## Design Decisions` by name.
- Prose, justifications, business descriptions: `ARTIFACT_LANGUAGE` (profile,
  section 5 — falls back to `OUTPUT_LANGUAGE`).
- Class names, paths, endpoints, table names: verbatim from the code.
