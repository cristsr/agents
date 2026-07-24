---
name: plan
description: >
  Generates a detailed TDD implementation plan from the approved design artifacts
  (hu.md, context.md, design.md) and saves it to work/active/sm-<number>/plan.md.
  Use when the user says "/plan sm-XXX", "generar plan", "crear plan de implementación",
  "planear historia", or has completed /design and wants TDD tasks.
  Do NOT use before /design is complete and approved.
  Do NOT use for executing tasks (use /build).
---

# plan

## Overview

Read the three approved artifacts, determine implementation order from the
sequence diagram, and produce a complete TDD plan organized by microservice.

**Announce at start:** "Generando plan de implementación para sm-<number>."

**Output:** `work/active/sm-<number>/plan.md`

---

## Perfil del proyecto (leer primero, siempre)

Antes de cualquier otra cosa, leé `.agents/profile.md` (en la raíz del proyecto actual): define las rutas de
artefactos, el idioma de salida, el **stack objetivo** (framework, ORM, estilo de
DTOs) y el **framework de tests** que ancla el ciclo TDD. Si no existe, avisá que
lo creen desde la plantilla y detené.

**Los literales de este documento son solo un ejemplo de resolución** (el perfil de Smart Mobility).
Los valores reales salen del `profile.md` del proyecto en el que estés trabajando — si difieren, mandan los del perfil:

| En este documento | Clave en profile.md |
|---|---|
| `sm-<number>` | `STORY_ID_PATTERN` |
| `work/active/sm-<number>/` | `WORKDIR_ACTIVE` |
| microservicio | `COMPONENT_TERM` |
| Jest / `*.spec.ts` | `TEST_FRAMEWORK` |
| NestJS · DTOs · OpenAPI→DTO | sección 7 «Stack y arquitectura» + `API_CONTRACT` |

---

## CRITICAL: Verify inputs exist

Extract the story number from user input. Then verify:

```bash
[ -f work/active/sm-<number>/hu.md ]          || echo "MISSING: hu.md"
[ -f work/active/sm-<number>/context.md ]      || echo "MISSING: context.md"
[ -f work/active/sm-<number>/design.md ]       || echo "MISSING: design.md"
[ -f work/active/sm-<number>/docs/diagram.md ] || echo "MISSING: docs/diagram.md"
[ -f work/active/sm-<number>/docs/api.yaml ]   || echo "MISSING: docs/api.yaml"
```

- If `hu.md` missing → stop:
  "No encontré `work/active/sm-<number>/hu.md`.
  Ejecutá `/hu sm-<number>` primero."

- If `context.md` missing → stop:
  "No encontré `work/active/sm-<number>/context.md`.
  Ejecutá `/scan sm-<number>` primero."

- If `design.md`, `docs/diagram.md` or `docs/api.yaml` are missing → stop:
  "No encontré los artefactos de diseño completos para sm-<number>.
  Ejecutá `/design sm-<number>` primero."

- If `design.md` contains a `## Modelado de datos` section but
  `docs/data-model.md` does not exist → stop:
  "`design.md` indica un modelo de datos nuevo pero no encontré
  `docs/data-model.md`. Ejecutá `/design sm-<number>` de nuevo."

---

## PHASE 1: Load artifacts

1. Read `work/active/sm-<number>/hu.md` — extract:
   - All acceptance criteria — these drive the test cases
   - Business rules and edge cases

2. Read `work/active/sm-<number>/context.md` — extract:
   - Affected microservices
   - Existing module paths per microservice
   - Injection patterns (how use cases are registered)
   - Existing DTOs available for reuse
   - Current providers in each module.ts

3. Read `work/active/sm-<number>/design.md` — extract:
   - Endpoint table per microservice (business description)
   - Whether `## Modelado de datos` is present (signals a new/changed table
     exists — the actual entity/SQL lives in `docs/data-model.md`)

4. Read `work/active/sm-<number>/docs/diagram.md` — the sequence diagram
   determines microservice implementation order (PHASE 2).

5. Read `work/active/sm-<number>/docs/api.yaml` — this is the **source of
   truth** for DTOs, never `design.md`:
   - Every path + operation → the endpoint a controller task must expose
   - Every schema in `components.schemas` → one DTO class, field-by-field
   - Every response code + description → the HTTP response cases a task must test

6. If `design.md` has a data model section, read
   `work/active/sm-<number>/docs/data-model.md` — this is the **source of
   truth** for the entity/migration task, never `design.md`:
   - Every entity field + type → the `@Column` definition and SQL column
   - Every SQL column → must match the entity field name/type exactly

6b. If `work/active/sm-<number>/docs/research.md` exists, read it — the chosen
    options and their rationale constrain how tasks should implement each
    decision (do not re-litigate a decision already recorded there).

6c. Read the project constitution if it exists — its Articles are non-negotiable
    and the generated tasks MUST respect them; `/design` already validated the
    Quality Gates, so here just avoid producing tasks that violate an Article:

    ```bash
    [ -s docs/rules.md ] && echo "FOUND" || echo "NONE"
    ```

7. Read `docs/architecture/testing.md` — apply TDD task format and test commands throughout.
8. Read `docs/architecture/conventions.md` — apply naming conventions throughout.
9. Consult `references/plan-header-template.md` — required header format.
10. Consult `references/task-structure-template.md` — required task format.
11. Consult `references/openapi-to-dto-mapping.md` — exact mapping from
    `api.yaml` schema fields to NestJS decorators for the DTO task(s).

---

## PHASE 2: Determine implementation order

Read the sequence diagram in `design.md`.

Identify the call chain:
- Which microservice initiates the flow (usually BFF or scheduling-ms)
- Which microservice provides the core data (usually capabilities-ms)
- Which microservices are in between

**Implementation order rule:**
Implement from the data provider outward to the consumer.
Example: if BFF calls capabilities-ms, implement capabilities-ms first,
then BFF.

Record the ordered list of microservices before writing any tasks.

### Detect independent groups (parallelizable)

If 3+ microservices are affected, check whether any of them have **no call
relationship** with each other in the sequence diagram (neither calls the
other, directly or transitively). Group those into independent groups —
e.g. "Grupo A: sm-capabilities-ms → sm-graphql-fb-ms" and "Grupo B:
sm-users-ms" when sm-users-ms doesn't interact with the other two.

If only 1-2 microservices are affected, or all of them are connected in a
single call chain, skip this — there is nothing to parallelize.

Record the groups (if any) — they are used in PHASE 3 to mark tasks `[P]`
and in the header template.

---

## PHASE 3: Generate plan.md

Consult `references/plan-header-template.md` for the exact header structure.

### Header

Consult `references/plan-header-template.md` for the exact header structure.

### Tarea 0 — Preparar ramas (always first)

Create git branch preparation for ALL affected microservices.
Ask the user for the branch name before continuing:

> "¿Cuál es el nombre de la rama? Usá inglés para la descripción.
> (ej: feat/SM-<number>-short-english-description o fix/SM-<number>-short-english-description)"

Include steps for each affected microservice:
```bash
git -C <microservice> checkout -b <branch-name>
```

Note: preparing the base branch (`git checkout develop` + `git pull`) is done by
the dedicated `/sync` skill, not by `/scan`. Tarea 0 assumes each affected
microservice is already on an up-to-date `develop` — if the developer skipped
`/sync`, the branch is created off whatever is currently checked out. Do not add
checkout/pull-of-develop steps here; if the base looks stale, recommend `/sync`.

### Tasks per microservice (in sequence diagram order)

For EACH microservice, in the order determined in PHASE 2,
generate tasks following this order when applicable:

```
Tarea N   — Entidad TypeORM + migración SQL
            (only if design.md has data model section — use the exact
            entity/SQL from docs/data-model.md, never invent fields)

Tarea N+1 — DTOs de request y response
            (use exact field names and types from design.md)

Tarea N+2 — Puerto de dominio (abstract class)
            (add new method signatures to existing abstract service)

Tarea N+3 — Caso de uso
            (new use case class with execute() method)

Tarea N+4 — Repositorio / adapter
            (implement new method in existing repository)

Tarea N+5 — Controller + registro en módulo
            (add endpoint + register use case in module providers)
```

**CRITICAL for multi-micro plans:**
- Clearly mark which microservice each task belongs to
- Use the microservice name as a section header between groups
- Tasks for micro-2 only start after micro-1 tasks are complete,
  UNLESS micro-1 and micro-2 belong to different independent groups
  detected in PHASE 2 — in that case, mark every task header in both
  groups with a trailing `[P]` (e.g. `### Tarea 3: DTOs de request [P]`)
  to signal `/build` they can be executed using parallel tool calls.

### Task format

Consult `references/task-structure-template.md` for the exact format.

Each task MUST have:
- Exact file paths (absolute from monorepo root)
- Complete TypeScript code — never "add validation here"
- TDD cycle: test fails → implement → test passes
- Expected output for every bash command
- One mock per external dependency

**Tests must cover:**
- Each acceptance criterion from hu.md → at least one test case
- Edge cases mentioned in hu.md
- Error scenarios (invalid input, DB failure, etc.)

### Final task — Run full test suite

Always include as the last task:

```bash
cd <microservice>
npx jest src/modules/<module>/ --no-coverage
cd ..
```

Esperado: PASS — todos los tests del módulo pasando.

If multiple microservices: run for each one.

---

## PHASE 3.5: Verify traceability (Analyze)

Before saving, run this consistency check across the three artifacts —
do NOT skip it even if the plan "looks complete":

1. **AC → Task coverage:** for every AC in `hu.md`, list which Tarea(s)
   exercise it (via the test written in that task). Build the table:

   | AC | Cubierto por |
   |----|-------------|
   | AC-1 | Tarea 2, Tarea 5 |

   If any AC has zero tasks mapped → add the missing task now, before
   saving. Never save a plan with an uncovered AC.

2. **DTO field consistency:** every field name used in a task's DTO code
   must match exactly (name and type, per `references/openapi-to-dto-mapping.md`)
   the field defined in `docs/api.yaml`'s `components.schemas`. If a
   mismatch is found, fix the task — `api.yaml` is the source of truth,
   never invent a different name in the plan.

3. **Endpoint coverage:** every path + operation in `docs/api.yaml` must
   have a corresponding controller task. Every response code documented
   in `api.yaml` must have a corresponding test case in some task.

4. **Entity field consistency:** if `docs/data-model.md` exists, verify every
   field appears in the entity task and the migration task with the same
   name and type as `docs/data-model.md` — that file is the source of truth,
   never invent a different name in the plan.

Include the AC → Task table in the plan header (see
`references/plan-header-template.md`).

---

## PHASE 4: Save and hand off

After saving `work/active/sm-<number>/plan.md`:

1. Show a brief summary:
   - Total de tareas generadas
   - Microservicios afectados en orden de implementación
   - Si incluye entidad + migración o no
   - Estimación de alcance (número de archivos a crear/modificar)

2. Say:
   "Plan guardado en `work/active/sm-<number>/plan.md`.
   Revisá las secciones de diseño primero y cuando estés listo
   ejecutalo con `/build sm-<number>`."

3. Stop — do not start executing.

---

## Common Issues

| Issue | Cause | Resolution |
|-------|-------|------------|
| Orden de micros no claro | Diagrama de secuencia ambiguo | Leer el diagrama completo, inferir por dirección de flechas |
| Campo en test no definido | design.md incompleto | Usar solo campos confirmados en design.md |
| Use case sin registro en módulo | Tarea omitida | Siempre incluir paso de registro en module.ts |
| Test sin AC que lo justifique | Test inventado | Cada test debe mapear a un AC de hu.md |
| Ruta relativa en imports | Convención violada | Usar rutas absolutas desde src/ |

---

## Example

**Input:** `/plan sm-1933` con design.md que define un endpoint en `sm-capabilities-ms`.

**plan.md resultante (fragmento):**

```markdown
# sm-1933: Filtrar zonas por tipo de servicio — Plan de Implementación

**Historia:** `work/active/sm-1933/`
**Microservicio(s):** `sm-capabilities-ms`
**Objetivo:** Exponer endpoint de filtrado de zonas por tipo de servicio.

---

### Tarea 0: Preparar rama de trabajo
...

### Tarea 1: DTOs de request y response

**Archivos:**
- Crear: `sm-capabilities-ms/src/domain/zones/infrastructure/entry-points/dtos/filter-zones-by-type.dto.ts`
- Test: (sin test unitario para DTOs puros)

**Step 1: Crear FilterZonesByTypeRequestDto**
...
```

**Salida al usuario:**
> Plan guardado en `work/active/sm-1933/plan.md`. Revisá las secciones de diseño y ejecutalo con `/build sm-1933`.
