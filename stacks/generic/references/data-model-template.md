# data-model-template.md (generic — stack-agnostic)

Save to `work/active/spec-<number>/docs/data-model.md` using exactly this
structure. Only generate this file if the story requires a new DB table or
a change to an existing one — omit entirely otherwise (no empty file).

This is the data model contract: schema definition (per the project's ORM) +
migration SQL, kept separate from `design.md` (narrative) and the API contract
(HTTP) because it has its own audience (whoever reviews/runs the migration) and
its own consumer in `/plan` (the schema + migration tasks read this file
directly, field by field).

---

```markdown
# Data model: spec-<number>

## EntityName

### Schema definition (per the project's ORM)

\`\`\`<ORM language — e.g. typescript, python>
@Entity / Model / Table('table_name')
export class EntityName {
  id: <PK type, e.g. uuid>;
  fieldName: <type>;
  createdAt: <timestamp type>;
  updatedAt: <timestamp type>;
}
\`\`\`

### SQL migration

\`\`\`sql
CREATE TABLE table_name (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
\`\`\`

---

### EntityName2  ← repeat if there is more than one new table

[same structure]
```

## Rules
- One `## EntityName` block per new/changed table.
- Schema field names/types must match the SQL column names/types exactly —
  `/plan`'s "Entity field consistency" check (PHASE 3.5) compares them directly.
- Field names here should match `context.md` where the field already exists
  on a related entity (reuse, don't rename without reason).
- If a field is also exposed in the API contract, the
  naming should match unless there's a documented reason (e.g. internal
  column vs. public field) — flag the mismatch in `## Design Decisions`
  in `design.md` if intentional.
- The style of the "Schema definition" block (decorators, column naming) comes from
  the project's stack (`STACK_REFS` / profile section 7: `ORM`, `DTO_STYLE`,
  `IDENTIFIER_LANGUAGE`).
- Headings in English (structural); prose in `ARTIFACT_LANGUAGE` (profile,
  section 5); table and column names verbatim from the schema.
