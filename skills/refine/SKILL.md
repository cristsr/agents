---
name: refine
description: >
  Refines hu.md, context.md, design.md, docs/api.yaml, docs/diagram.md, or
  docs/data-model.md for a story without re-running /hu, /scan, or /design.
  Use when the user says "/refine sm-XXX", "refinar hu", "refinar contexto",
  "ajustar diseño", "corregir el context", "hay un campo mal en el design",
  "quiero cambiar el schema", "actualizar el context", "modificar el diseño",
  "ajustar un AC", "cambiar la historia", "corregir el api.yaml", "ajustar el
  diagrama", "cambiar la entidad", "ajustar la migración", or has reviewed an
  artifact and wants to make targeted or guided corrections.
  Do NOT use to regenerate from scratch (use /hu, /scan, or /design).
  Do NOT use to modify plan.md (use /plan to regenerate it).
---

## Instructions

Execute the following phases in order.

---

## Perfil del proyecto (leer primero, siempre)

Antes de cualquier otra cosa, leé `.agents/profile.md` (en la raíz del proyecto actual): define el patrón de ID
de historia, las rutas de artefactos, el idioma de salida y el stack objetivo. Si
no existe, avisá al usuario que lo cree copiando `~/.agents/sdd-profile.template.md` a `.agents/profile.md` del proyecto, y detené: sin perfil no conocés las convenciones de este proyecto.

**Los literales de este documento son solo un ejemplo de resolución** (el perfil de Smart Mobility).
Los valores reales salen del `profile.md` del proyecto en el que estés trabajando — si difieren, mandan los del perfil:

| En este documento | Clave en profile.md |
|---|---|
| `sm-<number>` | `STORY_ID_PATTERN` |
| `work/active/sm-<number>/` | `WORKDIR_ACTIVE` |
| salida en español | `OUTPUT_LANGUAGE` |
| entidad TypeORM · migración · `api.yaml` OpenAPI · diagrama Mermaid | sección 7 + `API_CONTRACT`/`DIAGRAM_FORMAT` |

---

## PHASE 1: Resolve target

### Step 1 — Extract story number

Extract `sm-<number>` from the input. If not present, ask:
> "¿Para qué historia? (ej: sm-1933)"

### Step 2 — Determine target artifact

Parse the input for an explicit type keyword: `hu`, `context`, `design`,
`api` (or "openapi", "contrato", "yaml"), `diagrama`/`diagram`,
`data-model`/`modelo de datos`/`entidad`/`migración`, or
`research`/`investigación`/`alternativas`.

| Target | File |
|--------|------|
| `hu` | `work/active/sm-<number>/hu.md` |
| `context` | `work/active/sm-<number>/context.md` |
| `design` | `work/active/sm-<number>/design.md` |
| `api` | `work/active/sm-<number>/docs/api.yaml` |
| `diagram` | `work/active/sm-<number>/docs/diagram.md` |
| `data-model` | `work/active/sm-<number>/docs/data-model.md` |
| `research` | `work/active/sm-<number>/docs/research.md` |

- If explicit → skip to Step 3 with that target (verify its file exists; if not, STOP:
  "No encontré `<file>`. Ejecutá `/design sm-<number>` primero — `api.yaml` y `diagram.md`
  se generan junto con `design.md`." — for `data-model`, if `design.md` exists but has
  no `## Modelado de datos` section, say instead: "Esta historia no tiene modelo de
  datos nuevo.")
- If not explicit → check existence of `hu.md`, `context.md`, `design.md`:

```bash
for f in hu.md context.md design.md; do
  [ -f "work/active/sm-<number>/$f" ] && echo "$f: EXISTS" || echo "$f: -"
done
```

| hu.md | context.md | design.md | Candidate options | Ask via |
|-------|-----------|-----------|--------------------|---------|
| exists | — | — | hu.md, context.md (aún no existe), design.md (aún no existe) | `AskUserQuestion` (3 opciones) |
| exists | exists | not exists | hu.md, context.md | `AskUserQuestion` (2 opciones) |
| exists | not exists | exists | hu.md, design.md/api.yaml/diagram.md/data-model.md (si aplica) | `AskUserQuestion` (2 opciones) |
| exists | exists | exists | hu.md, context.md, design.md, api.yaml, diagram.md, data-model.md (si existe) | Texto plano numerado — son hasta 6 candidatos y `AskUserQuestion` admite máximo 4 opciones |
| not exists | exists | exists | context.md, design.md/api.yaml/diagram.md/data-model.md (si aplica) | `AskUserQuestion` (2 opciones) |
| not exists | exists | not exists | target = context | (sin pregunta, target directo) |
| not exists | not exists | exists | design.md, api.yaml, diagram.md, data-model.md (si existe) | `AskUserQuestion` (hasta 4 opciones — si data-model.md no existe, quedan 3) |
| none | none | none | STOP → "No encontré ningún artefacto. Ejecutá `/hu sm-<number>` primero." | — |

Para las filas marcadas `AskUserQuestion`: `question: "¿Qué querés refinar?"`,
`header: "Artefacto"`, una opción por candidato con su nombre de archivo
como `label` y una `description` de una línea sobre qué contiene.

`api.yaml` and `diagram.md` only ever exist alongside `design.md` (all three
are produced together by `/design`); `data-model.md` exists alongside them
only if the story has a new/changed table — never offer them as options if
`design.md` doesn't exist.

### Step 3 — Load hu.md for validation (if target ≠ hu)

If the target is `context`, `design`, `api`, `diagram`, `data-model`, or `research`, read `work/active/sm-<number>/hu.md` and keep in working memory:
- **Título** de la historia
- **Criterios de aceptación (ACs)** numerados
- **Reglas de negocio** si las hay

If `hu.md` does not exist: skip this step (continue without AC validation).

These ACs are used as validation anchors in PHASE 3A and 3B.

If the target **is** `hu`: skip this step — `hu.md` is the artifact being edited, not the reference.

---

## PHASE 2: Detect mode

Read the full input after the command and story number.

- If the input contains a **description of a specific change** (field name, path correction, new endpoint, etc.) → **Direct Mode** → go to PHASE 3A
- If the input has **no change description** → **Guided Mode** → go to PHASE 3B

---

## PHASE 3A: Direct Mode (targeted change)

1. Read the full artifact from its file (per the Step 2 lookup table —
   `api` and `diagram` live under `docs/`, not at the story root)
2. Locate the section most relevant to the described change — use the section order lists from PHASE 3B as reference, or consult `references/refine-guide.md` for the full mutability rules per section
3. Show the **ACs from hu.md** that are relevant to this section (1–3 lines max), then show the **current content** of the section
4. Check if the proposed change contradicts any AC (see Rule 5 in `references/refine-guide.md`). If yes, warn before asking for confirmation.
5. Ask: "¿Es esto lo que querés cambiar? Confirmá o indicá qué ajustar exactamente."
6. Wait for confirmation
7. Apply the change using Edit
8. Show a brief before/after summary
9. Apply coherence checks (see `references/refine-guide.md`)
10. Go to PHASE 4

---

## PHASE 3B: Guided Mode (section-by-section review)

Read the artifact. Review **one section at a time** in this order:

### For hu.md:
1. Historia de Usuario (Como / Quiero / Para)
2. Criterios de Aceptación — revisar uno a uno: mostrar el texto de cada AC y preguntar si está correcto
3. Notas Técnicas (si existe la sección)
4. Fuera de Alcance (si existe la sección)

> Note: when refining `hu.md`, there is no external AC reference to validate against — the ACs themselves are what's being corrected. Apply judgment: flag changes that look like scope creep vs. wording fixes.

### For context.md:
1. Microservicios afectados
2. Entidad TypeORM (campos)
3. Module providers
4. DTOs existentes
5. Gaps detectados

### For design.md:
1. Decisiones de Diseño (solo si existe)
2. Resumen del flujo (1-2 oraciones — el diagrama completo se refina con `/refine diagram`)
3. Tabla de endpoints por microservicio (descripción de negocio)
4. Modelado de datos (solo el nombre de la tabla y el link — el detalle completo
   se refina con `/refine data-model`)

> Los schemas (campos, tipos, validaciones) y los códigos de respuesta ya no
> viven en `design.md` — usar `/refine api` para esos cambios. La entidad
> TypeORM y la migración SQL tampoco — usar `/refine data-model`.

### For api.yaml (target = api):
1. `info` (título, descripción del contrato)
2. Por cada path: request schema (campos, tipos, `required`)
3. Por cada path: response schemas y códigos HTTP
4. `components.schemas` compartidos entre paths

> Si `plan.md` ya existe y se cambia un nombre de campo o un path, advertir
> en PHASE 4 — las DTOs generadas dejarán de coincidir.

### For diagram.md (target = diagram):
1. El diagrama completo (un solo bloque Mermaid — revisar de una vez, no por sub-secciones)

### For data-model.md (target = data-model):
1. Por cada entidad: campos de la entidad TypeORM (nombre, tipo, decoradores)
2. Por cada entidad: columnas de la migración SQL (deben coincidir 1:1 con los campos)

> Si `plan.md` ya existe y se cambia un nombre de campo, advertir en PHASE 4 —
> la tarea de entidad/migración generada dejará de coincidir.

### For research.md (target = research):
1. Por cada decisión: contexto y opciones evaluadas
2. Por cada decisión: opción elegida y razón (ligada a un AC o a la constitución)

> Si al refinar research cambia la opción elegida y eso afecta un campo o flujo,
> advertir en PHASE 4 que `api.yaml`/`data-model.md` deben quedar consistentes,
> y que si `plan.md` ya existe hay que regenerarlo.

### Per section:
1. Show the **ACs from hu.md** that justify or constrain this section (1–3 lines max, inline), then show the current content of the section
2. Ask via `AskUserQuestion`: `question: "¿Está correcto esta sección?"`,
   `header: "Sección"`, options `"Sí, está correcto"` / `"Necesito ajustar algo"`.
   If the user picks "Necesito ajustar algo" (or uses "Other" to describe the
   change directly), continue the exchange in plain text to capture exactly
   what to change — `AskUserQuestion` only gates the yes/no decision, not the
   content of the edit itself.
3. If changes: check the proposed change against ACs (Rule 5 in `references/refine-guide.md`) before applying; apply with Edit, show diff, continue to next section
4. If correct: move to next section immediately
5. **Maximum 5 sections per session.** If more sections exist, summarize and ask
   via `AskUserQuestion` (`header: "Continuar"`, options `"Sí, seguir con la próxima sección"` /
   `"No, es suficiente por ahora"`).

After all sections reviewed → go to PHASE 4.

---

## PHASE 4: Coherence checks + Handoff

### Before warning to re-run /plan: check if code is already built

Every "ejecutá `/plan sm-<number>` de nuevo" warning below assumes `plan.md`
either doesn't exist yet or has no completed tasks. Before showing any such
warning, check:

```bash
grep -c '\[X\]' work/active/sm-<number>/plan.md 2>/dev/null || echo 0
```

If `plan.md` exists AND has at least one `[X]` task → the story is already
built. Replace the "ejecutá `/plan` de nuevo" warning with:
> "⚠️ Este cambio es estructural y `plan.md` ya tiene tareas completadas —
> regenerarlo perdería ese progreso. Si el cambio corrige un defecto en código
> ya construido por una ambigüedad de `hu.md`, usá `/hotfix sm-<number>` en
> vez de `/plan`. Si el alcance es mayor (microservicio/endpoint/tabla nueva),
> sí conviene regenerar el plan completo con `/plan sm-<number>` — confirmá
> cuál es el caso."

### Coherence checks (always apply after any change)

Consult `references/refine-guide.md` for the full coherence rules. Summary:

| Change made in | Check |
|----------------|-------|
| hu.md — AC added or removed | Warn: "Este cambio es estructural. Si ya existe context.md, ejecutá `/scan sm-<number>` para regenerarlo." |
| hu.md — wording correction only | No downstream action required. |
| context.md — field renamed | Warn if `docs/api.yaml` references the old name |
| design.md — endpoint description changed | Warn: "Este cambio es estructural. Ejecutá `/plan sm-<number>` para actualizar el plan." |
| api.yaml — schema field renamed/added/removed, or path added | Warn if plan.md exists: "El contrato cambió. Ejecutá `/plan sm-<number>` para regenerar las DTOs y la trazabilidad." |
| diagram.md — flow changed | Warn if `api.yaml` doesn't reflect the new hop: "Revisá si `api.yaml` necesita un endpoint nuevo para este hop." |
| data-model.md — entity field added/removed/renamed | Warn: "El modelado de datos cambió. Si ya existe un plan, revisá que la tarea de migración SQL esté actualizada." |

**NEVER modify plan.md from this skill.** Only warn the user.

### Handoff message

> Cualquier mensaje de esta tabla que diga "ejecutá `/plan` de nuevo" debe
> reemplazarse por el mensaje de `/hotfix` definido arriba si `plan.md` ya
> tiene tareas `[X]`.

| Artifact refined | Message |
|-----------------|---------|
| hu.md (wording only) | "Historia actualizada en `work/active/sm-<number>/hu.md`. Los cambios son menores — los artefactos existentes siguen siendo válidos." |
| hu.md (AC added/removed/major) | "Historia actualizada en `work/active/sm-<number>/hu.md`. Los cambios son estructurales — ejecutá `/scan sm-<number>` para regenerar el contexto." |
| context.md | "Contexto actualizado en `work/active/sm-<number>/context.md`. Cuando estés listo ejecutá `/design sm-<number>`." |
| design.md (minor change) | "Diseño actualizado en `work/active/sm-<number>/design.md`. Los cambios son menores — podés continuar con el plan existente y ejecutar `/build sm-<number>`." |
| design.md (structural change) | "Diseño actualizado en `work/active/sm-<number>/design.md`. Los cambios son estructurales — ejecutá `/plan sm-<number>` para regenerar el plan antes de hacer build." |
| api.yaml | "Contrato actualizado en `work/active/sm-<number>/docs/api.yaml`. Si ya existe `plan.md`, ejecutá `/plan sm-<number>` de nuevo para regenerar las DTOs antes de `/build`." |
| diagram.md | "Diagrama actualizado en `work/active/sm-<number>/docs/diagram.md`. Verificá que `api.yaml` siga reflejando el mismo flujo." |
| data-model.md | "Modelado de datos actualizado en `work/active/sm-<number>/docs/data-model.md`. Si ya existe `plan.md`, ejecutá `/plan sm-<number>` de nuevo para regenerar la tarea de entidad/migración." |
| research.md | "Investigación actualizada en `work/active/sm-<number>/docs/research.md`. Si cambió una decisión elegida, verificá que `api.yaml`/`data-model.md` sigan consistentes y regenerá el plan si ya existía." |

Stop — do not start planning or building.

---

## Common Issues

| Issue | Cause | Resolution |
|-------|-------|------------|
| hu.md no existe y se pide refinar hu | /hu no ejecutado | STOP: "Ejecutá `/hu sm-<number>` primero para crear la historia." |
| context.md y design.md no existen | /scan no ejecutado | Ofrecer refinar hu.md si existe, o STOP: "Ejecutá `/hu` y `/scan` primero." |
| design.md no existe pero sí context.md | /design no ejecutado | Ofrecer refinar context.md o hu.md solamente. |
| Cambio en hu.md contradice ACs existentes | Scope creep o corrección real | Mostrar el AC afectado, pedir confirmación explícita antes de aplicar. |
| plan.md ya existe (sin tareas `[X]`) y hay cambio estructural en hu/design | Artefacto refinado después de planear, pero antes de construir | Advertir: "plan.md puede quedar desactualizado. Ejecutá `/plan sm-<number>` para regenerarlo." |
| plan.md ya existe CON tareas `[X]` y hay cambio estructural | Defecto post-build por gap de clarificación | Redirigir a `/hotfix sm-<number>` — no regenerar el plan, ver nota en PHASE 4. |
| Usuario pide refinar plan.md | Fuera del scope de esta skill | Redirigir: "Para modificar el plan ejecutá `/plan sm-<number>` de nuevo o editá plan.md manualmente." |
| Sección no encontrada en el artefacto | Artifact incompleto o con formato diferente | Mostrar el artifact completo y preguntar qué sección aplica. |

---

## Example

### Direct Mode — refinando design.md

**Input:**
> `/refine design sm-1933` — el campo en el DTO debería ser `serviceTypeId` en vez de `type`

**Flujo:**
1. Target = design (explícito). Lee `work/active/sm-1933/hu.md` → extrae ACs: AC-2 "el campo se llama serviceTypeId en el contrato"
2. Modo = Directo (cambio descripto)
3. Lee design.md → localiza sección DTOs → muestra los ACs relevantes y el contenido actual:
   > **ACs relevantes:** AC-2 — "el campo se llama serviceTypeId en el contrato"
   ```typescript
   export class FilterZonesRequestDto {
     @IsNotEmpty()
     type: string;
   }
   ```
4. Confirma: "¿Querés renombrar `type` a `serviceTypeId`?" (sin contradicción de ACs → procede)
5. Aplica cambio
6. Coherencia: plan.md existe → advierte
7. Handoff: "Diseño actualizado. Cambio menor — podés continuar con el build."

---

### Direct Mode — refinando hu.md

**Input:**
> `/refine hu sm-1933` — el AC-2 debería decir "retorna lista vacía con código 200" en vez de solo "retorna lista vacía"

**Flujo:**
1. Target = hu (explícito). No se carga referencia externa — el hu.md es el artefacto a editar.
2. Modo = Directo (cambio descripto)
3. Lee `work/active/sm-1933/hu.md` → localiza AC-2:
   ```
   ### AC-2: Sin resultados retorna lista vacía
   Si no hay resultados, retorna lista vacía.
   ```
4. Confirma: "¿Querés actualizar AC-2 para incluir el código 200?"
5. Aplica cambio (wording correction, no AC agregado/eliminado)
6. Coherencia: cambio menor → no requiere re-scan
7. Handoff: "Historia actualizada. Los cambios son menores — los artefactos existentes siguen siendo válidos."

---

### Guided Mode — refinando context.md

**Input:**
> `/refine context sm-1933`

**Flujo:**
1. Target = context (explícito). Lee `work/active/sm-1933/hu.md` → extrae ACs en memoria
2. Modo = Guiado (sin cambio descripto)
3. Muestra sección "Microservicios afectados" con ACs relacionados:
   > **ACs relevantes:** AC-1 — "el sistema registra zonas en el servicio de capacidades"
   ```
   - sm-capabilities-ms
   ```
   → "¿Está correcto?"
4. Usuario: "sí"
5. Muestra sección "Entidad TypeORM" con ACs relacionados → usuario: "falta el campo `deletedAt`"
6. Aplica cambio, continúa
7. Al finalizar: "Contexto actualizado. Cuando estés listo ejecutá `/design sm-1933`."
