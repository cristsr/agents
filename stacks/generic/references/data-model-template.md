# data-model-template.md (generic — stack-agnostic)

Save to `work/active/sm-<number>/docs/data-model.md` using exactly this
structure. Only generate this file if the story requires a new DB table or
a change to an existing one — omit entirely otherwise (no empty file).

This is the data model contract: schema definition (per the project's ORM) +
migration SQL, kept separate from `design.md` (narrative) and the API contract
(HTTP) because it has its own audience (whoever reviews/runs the migration) and
its own consumer in `/plan` (the schema + migration tasks read this file
directly, field by field).

---

```markdown
# Modelado de datos: sm-<number>

## NombreEntidad

### Definición de esquema (según ORM del proyecto)

\`\`\`<language del ORM — p.ej. typescript, python>
@Entity / Model / Table('nombre_tabla')
export class NombreEntidad {
  id: <tipo PK, p.ej. uuid>;
  fieldName: <tipo>;
  createdAt: <tipo timestamp>;
  updatedAt: <tipo timestamp>;
}
\`\`\`

### Migración SQL

\`\`\`sql
CREATE TABLE nombre_tabla (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
\`\`\`

---

### NombreEntidad2  ← repetir si hay más de una tabla nueva

[misma estructura]
```

## Rules
- One `## NombreEntidad` block per new/changed table.
- Schema field names/types must match the SQL column names/types exactly —
  `/plan`'s "Entity field consistency" check (PHASE 3.5) compares them directly.
- Field names here should match `context.md` where the field already exists
  on a related entity (reuse, don't rename without reason).
- If a field is also exposed in the API contract, the
  naming should match unless there's a documented reason (e.g. internal
  column vs. public field) — flag the mismatch in `## Decisiones de Diseño`
  in `design.md` if intentional.
- El estilo del bloque «Definición de esquema» (decoradores, nomenclatura de
  columnas) sale del stack del proyecto (`STACK_REFS` / profile sección 7:
  `ORM`, `DTO_STYLE`, `IDENTIFIER_LANGUAGE`).
