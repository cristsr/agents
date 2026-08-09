# docs/data-model.md Template

Save to `work/active/sm-<number>/docs/data-model.md` using exactly this
structure. Only generate this file if the story requires a new DB table or
a change to an existing one — omit entirely otherwise (no empty file).

This is the data model contract: TypeORM entity + migration SQL, kept
separate from `design.md` (narrative) and `docs/api.yaml` (HTTP contract)
because it has its own audience (whoever reviews/runs the migration) and
its own consumer in `/plan` (the entity + migration tasks read this file
directly, field by field).

---

```markdown
# Modelado de datos: sm-<number>

## NombreEntidad

### Entidad TypeORM

\`\`\`typescript
@Entity('nombre_tabla')
export class NombreEntidad {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  fieldName: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
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
- Entity field names/types must match the SQL column names/types exactly —
  `/plan`'s "Entity field consistency" check (PHASE 3.5) compares them directly.
- Field names here should match `context.md` where the field already exists
  on a related entity (reuse, don't rename without reason).
- If a field is also exposed in the API contract (`docs/api.yaml`), the
  naming should match unless there's a documented reason (e.g. internal
  column vs. public field) — flag the mismatch in `## Decisiones de Diseño`
  in `design.md` if intentional.
