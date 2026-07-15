# Refine Guide — Mutability Rules & Coherence Checks

Reference for the `/refine` skill. Defines what can and cannot be changed per artifact,
and the coherence rules to apply after each change.

---

## hu.md — Mutability Rules

### Mutable sections

| Section | What can change | Examples |
|---------|----------------|---------|
| Historia de Usuario — Como / Quiero / Para | Correcting wording or role name | "operador" → "administrador" |
| AC body text | Correcting or clarifying the criterion | Fix ambiguous wording, add missing detail |
| AC title (heading) | Renaming the short label | "AC-1: Filtro" → "AC-1: Filtro por tipo de servicio" |
| AC added | New criterion added | Add AC-3 for a missing edge case |
| AC removed | Criterion confirmed out of scope | Remove AC-2 at PO request |
| Notas Técnicas | Adding/removing technical constraints | Add external dependency note |
| Fuera de Alcance | Adding/removing out-of-scope items | Add "No incluye notificaciones push" |

### Read-only sections (do NOT modify)

| Section | Why |
|---------|-----|
| `# sm-<number>:` header number | Story number never changes |
| Title after the colon | Comes from Jira — only change if user confirms the Jira title changed |

### Change classification for hu.md

**Minor change (no downstream action needed):**
- Wording correction in Como / Quiero / Para
- AC title rename (short label only)
- Minor clarification in AC body (meaning unchanged)
- Notas Técnicas or Fuera de Alcance edits

**Structural change (warn: re-run /scan):**
- Adding a new AC
- Removing an existing AC
- Significantly rewriting an AC body (meaning changes)
- Changing the story title

---

## context.md — Mutability Rules

### Mutable sections

| Section | What can change | Examples |
|---------|----------------|---------|
| Microservicios afectados | Correcting micro names if wrong | `sm-capability-ms` → `sm-capabilities-ms` |
| Entidad TypeORM — campos | Adding missing fields, correcting types | Add `deletedAt: Date`, fix `string` → `UUID` |
| Module providers | Adding missing providers, correcting class names | Add `ZoneTypeRepository` |
| DTOs existentes | Adding missing exported DTOs | Add `ZoneTypeResponseDto` |
| Gaps detectados | Resolving a gap (mark as resolved), adding new gaps | "Resuelto: campo confirmado como `serviceTypeId`" |
| Patrón de inyección | Correcting wrong constructor signature | Fix wrong param name |
| Servicio abstracto — métodos | Adding missing abstract methods | Add `findByType(type: string): Promise<Zone[]>` |

### Read-only sections (do NOT modify)

| Section | Why |
|---------|-----|
| `# context: sm-<number>` header | Identifies the artifact |
| Historia resumida | Derived from `hu/sm-<number>.md` — if wrong, the hu.md is the source to fix |
| Absolute paths of module folders | Structural — re-run /scan if structure changed |

---

## design.md — Mutability Rules

`design.md` only holds the narrative summary — DTOs, endpoint paths/methods,
the full diagram, and the full data model moved to `docs/api.yaml`,
`docs/diagram.md`, and `docs/data-model.md` (see their own mutability
rules below).

### Mutable sections

| Section | What can change | Examples |
|---------|----------------|---------|
| Decisiones de Diseño | Correcting or adding a recorded decision | Fix the reasoning text |
| Resumen del flujo (prosa) | Clarifying the 1-2 sentence summary | Wording only |
| Tabla de endpoints — descripción de negocio | Clarifying the business description column | Minor edits — NOT the método/ruta, those live in `api.yaml` |
| Modelado de datos — nombre de tabla | Correcting the table name reference | Wording only — NOT the entity/SQL, those live in `data-model.md` |

### Read-only sections (do NOT modify)

| Section | Why |
|---------|-----|
| `# design: sm-<number>` header | Identifies the artifact |
| Microservice section headers (`### sm-<micro>`) | Structural — re-run /design if micros change |
| Endpoints — método/ruta | Use `/refine api` — `api.yaml` is the source of truth for these |
| Modelado de datos — entidad/SQL | Use `/refine data-model` — `data-model.md` is the source of truth for these |

---

## docs/api.yaml — Mutability Rules

### Mutable sections

| Section | What can change | Examples |
|---------|----------------|---------|
| `info.description` | Clarifying the contract description | Wording only |
| `paths.<path>.<method>` | Correcting the route or HTTP method | `/zones/type` → `/zones/filter` |
| `responses` (per path) | Adding missing codes, correcting descriptions | Add `404: Zona no encontrada` |
| `components.schemas.<Schema>.properties` | Renaming/adding/removing fields | `type` → `serviceTypeId` |
| `components.schemas.<Schema>.properties.<field>.type/format/enum` | Correcting the field's type | `string` → `string[]` |
| `required` array | Adding/removing a field from required | Mark `serviceTypeId` as required |

### Read-only sections (do NOT modify)

| Section | Why |
|---------|-----|
| `openapi:` version line | Structural — never change without explicit user request |
| `tags` list | Must match the microservices in `context.md` — re-run `/design` if micros change |

---

## docs/diagram.md — Mutability Rules

### Mutable sections

| Section | What can change | Examples |
|---------|----------------|---------|
| Mermaid sequence diagram | Adjusting flow if simplified/changed | Add a step, rename participant, add a new hop |

The whole file is one section — there's nothing else to subdivide.

---

## docs/data-model.md — Mutability Rules

### Mutable sections

| Section | What can change | Examples |
|---------|----------------|---------|
| Entidad TypeORM — campos | Adding/removing/renaming Entity fields | Add `@Column serviceTypeId` |
| Migración SQL — columnas | Keeping in sync with entity changes | Add column to `CREATE TABLE` |

### Read-only sections (do NOT modify)

| Section | Why |
|---------|-----|
| `# Modelado de datos: sm-<number>` header | Identifies the artifact |
| Entity/table headers (`## NombreEntidad`) | Structural — re-run `/design` if the set of tables changes |

This file only exists if the story has a new/changed table — if it
doesn't exist, there is nothing to refine here; redirect to `/design`.

---

## Coherence Rules (apply after every change)

### Rule 1: context.md field renamed → check api.yaml

If a field name is renamed in context.md:
- Read `docs/api.yaml`
- Search for the old field name in `components.schemas`
- If found: warn the user:
  > "⚠️ `docs/api.yaml` referencia el campo `<old>` en un schema. ¿Querés actualizar el contrato también?"

### Rule 2: api.yaml schema field renamed → check plan.md

If a schema field is renamed in `docs/api.yaml`:
- Check if `work/active/sm-<number>/plan.md` exists
- If it does: warn the user:
  > "⚠️ plan.md puede referenciar `<old>` en las DTOs generadas. Ejecutá `/plan sm-<number>` para regenerarlo, o editá el plan manualmente."

### Rule 3: api.yaml path added → structural change

If a new path/operation is added to `docs/api.yaml`:
- Always warn:
  > "⚠️ Agregaste un endpoint nuevo. Este es un cambio estructural — ejecutá `/plan sm-<number>` para que las nuevas tareas queden incluidas."

### Rule 4: data-model.md field added/removed → check plan.md

If the data model (Entity + SQL in `docs/data-model.md`) changes:
- Check if `work/active/sm-<number>/plan.md` exists
- If it does: warn:
  > "⚠️ El modelado de datos cambió. Revisá que la tarea de entidad/migración SQL del plan esté actualizada, o ejecutá `/plan sm-<number>` de nuevo."

### Rule 8: diagram.md flow changed → check api.yaml

If the sequence diagram changes (new hop, new participant):
- Read `docs/api.yaml`
- If the new hop implies an endpoint not present in `api.yaml`: warn:
  > "⚠️ El diagrama ahora muestra una llamada a `<servicio>` que no está en `docs/api.yaml`. ¿Falta documentar ese endpoint?"

### Rule 6: hu.md AC added or removed → check context.md and design.md

If an AC is added or removed from hu.md:
- Check if `work/active/sm-<number>/context.md` exists
- If it does: warn:
  > "⚠️ Agregaste/eliminaste un AC. Si context.md ya fue generado, puede quedar desactualizado. Ejecutá `/scan sm-<number>` para regenerarlo."
- Check if `work/active/sm-<number>/design.md` exists
- If it does: warn:
  > "⚠️ design.md también puede quedar desactualizado. Después de re-escanear, ejecutá `/design sm-<number>`."

### Rule 7: hu.md AC body significantly rewritten → flag for review

If the meaning of an AC changes (not just wording):
- After applying, warn:
  > "⚠️ El contenido del AC-N cambió de forma significativa. Revisá que context.md y design.md sigan siendo coherentes con el nuevo criterio."

### Rule 5: validate every change against hu.md ACs

`hu.md` is the source of truth. Apply this rule **before** every change, in both Modo Directo and Modo Guiado.

**How to apply:**

1. From the ACs loaded in PHASE 1, identify which ones relate to the section being changed.
2. Display those ACs briefly above the section content so the user sees the constraint.
3. Scan the proposed change for contradictions:
   - New field not mentioned in any AC → warn: "Este campo no aparece en los ACs. ¿Es un ajuste técnico o un requisito nuevo?"
   - Field removal when an AC requires it → warn: "El AC-N exige `<campo>`. Eliminarlo puede romper la historia."
   - Endpoint change inconsistent with the described flow → warn: "El AC-N describe este flujo como `<descripción>`. El cambio propuesto puede alterarlo."
4. If contradiction detected, show the AC and ask:
   > "Este cambio puede contradecir el AC-N: '<texto del AC>'. ¿Confirmás que el cambio es correcto igualmente?"
5. Wait for explicit confirmation before applying.
6. If no ACs are directly relevant, note: "No encontré ACs directamente relacionados con esta sección." and proceed normally.

---

## Change classification: minor vs structural

Use this classification to determine the handoff message.

### hu.md — Minor change (no downstream action)
- Wording correction in Como / Quiero / Para
- AC title rename (label only)
- Minor clarification in AC body (meaning unchanged)
- Notas Técnicas or Fuera de Alcance edits

### hu.md — Structural change (re-run /scan, then /design)
- Adding a new AC
- Removing an existing AC
- Significantly rewriting an AC body
- Changing the story title

### context.md / design.md / api.yaml / diagram.md / data-model.md — Minor change (continue with existing plan/build)
- Correcting a business description (design.md endpoint table, api.yaml descriptions)
- Fixing an HTTP response description in api.yaml
- Adding a missing gap resolution to context.md
- Renaming a diagram participant without changing the call structure

### context.md / design.md / api.yaml / diagram.md / data-model.md — Structural change (re-run /plan before /build)
- Adding a new endpoint/path in api.yaml
- Renaming/adding/removing a schema field in api.yaml
- Adding or removing a microservice from the flow
- Adding/removing/renaming a field in the data model (`docs/data-model.md` — Entity + SQL)
- Changing the sequence diagram flow significantly (new hop, new participant)
- Renaming the use case or controller class
