---
name: design
description: >
  Reads hu.md and context.md to produce a complete API-first technical design:
  a Mermaid sequence diagram, an OpenAPI 3.1 contract, and data model if needed.
  Use when the user says "/design sm-XXX", "diseñar historia", "crear diseño",
  "especificación técnica", or has completed /scan and wants to define what to build.
  Do NOT use before /scan is complete. Do NOT use for planning tasks (use /plan).
---

# design

## Overview

Read the story requirements and the existing codebase context, resolve any
ambiguities about new data through targeted questions, and produce the
contract API-first: `docs/api.yaml` is approved **before** any NestJS code
exists — `/plan` generates DTOs that conform to it, never the reverse.

**Announce at start:** "Diseñando especificación técnica para sm-<number>."

**Output:**
- `work/active/sm-<number>/docs/research.md` — alternativas técnicas evaluadas + rationale (solo si hay decisiones no triviales)
- `work/active/sm-<number>/docs/diagram.md` — diagrama de secuencia
- `work/active/sm-<number>/docs/api.yaml` — contrato OpenAPI (fuente de verdad)
- `work/active/sm-<number>/docs/data-model.md` — entidad TypeORM + migración SQL (solo si hay tabla nueva)
- `work/active/sm-<number>/design.md` — resumen narrativo (incluye validación de quality gates)

---

## Perfil del proyecto (leer primero, siempre)

Antes de cualquier otra cosa, leé `.agents/profile.md` (en la raíz del proyecto actual): define las rutas de
artefactos, el idioma de salida, el **formato de contrato API**, el **formato de
diagrama**, el **stack objetivo** (lenguaje del código de dominio, ORM, estilo de
migración) y la constitución del proyecto que valida los quality gates. Si no
existe, avisá al usuario que lo cree copiando `~/.agents/sdd-profile.template.md` a `.agents/profile.md` del proyecto, y detené: sin perfil no conocés las convenciones de este proyecto.

**Los literales de este documento son solo un ejemplo de resolución** (el perfil de Smart Mobility).
Los valores reales salen del `profile.md` del proyecto en el que estés trabajando — si difieren, mandan los del perfil:

| En este documento | Clave en profile.md |
|---|---|
| `sm-<number>` | `STORY_ID_PATTERN` |
| `work/active/sm-<number>/` | `WORKDIR_ACTIVE` |
| salida en español | `OUTPUT_LANGUAGE` |
| OpenAPI 3.1 (`api.yaml`) | `API_CONTRACT` |
| diagrama Mermaid | `DIAGRAM_FORMAT` |
| entidad TypeORM + migración SQL manual | `ORM`, `MIGRATIONS` (sección 7) |
| NestJS / DTOs | sección 7 «Stack y arquitectura» |

---

## CRITICAL: Verify inputs exist

Extract the story number from user input. Then verify:

```bash
[ -f work/active/sm-<number>/hu.md ]      || echo "MISSING: hu.md"
[ -f work/active/sm-<number>/context.md ] || echo "MISSING: context.md"
```

- If `hu.md` missing → stop:
  "No encontré `work/active/sm-<number>/hu.md`.
  Ejecutá `/hu sm-<number>` primero."

- If `context.md` missing → stop:
  "No encontré `work/active/sm-<number>/context.md`.
  Ejecutá `/scan sm-<number>` primero."

## CRITICAL: Ambiguity gate — zero unresolved markers

The spec must be unambiguous before any contract is designed. Check for
unresolved `[NEEDS CLARIFICATION]` markers left by `/hu`:

```bash
grep -c 'NEEDS CLARIFICATION' work/active/sm-<number>/hu.md
```

If the count is greater than `0` → **STOP** (do not design):
> "`hu.md` todavía tiene <N> marcadores `[NEEDS CLARIFICATION]` sin resolver.
> Diseñar un contrato sobre ambigüedades produce DTOs y comportamientos
> potencialmente incorrectos. Ejecutá `/clarify sm-<number>` para resolverlos
> antes de `/design`."

Only proceed when the count is `0`. This mirrors the industry standard (Spec
Kit): specifications must reach zero ambiguity markers before implementation
planning begins.

---

## PHASE 1: Load context

1. Read `work/active/sm-<number>/hu.md` — extract:
   - Historia de Usuario completa
   - Todos los Criterios de Aceptación
   - Notas Técnicas si existen

2. Read `work/active/sm-<number>/context.md` — extract:
   - Microservicios afectados y sus módulos
   - Entidades existentes con sus campos
   - DTOs existentes disponibles para reutilizar
   - Patrones de inyección del proyecto
   - Gaps detectados por /scan

3. Read `docs/architecture/conventions.md` — apply naming and code conventions
   throughout the design.

4. Read the project **constitution** if it exists — it is the source of
   non-negotiable principles and the quality gates validated in PHASE 4.5:

   ```bash
   [ -s constitution.md ] && echo "FOUND" || echo "NONE"
   ```

   If found, load its Articles and its active Quality Gates. If it does not
   exist (or is empty) → continue without it, and note in the PHASE 5 summary
   that no constitution was found (the developer may want to run `/constitution`).

---

## PHASE 2: Analyze and identify unknowns

Before asking any questions, analyze what is already defined vs what needs
to be resolved.

### What is already defined (do NOT ask about these)
- Fields that exist in context.md entities
- Behaviors explicitly described in acceptance criteria
- Patterns already present in context.md

### What needs resolution (candidates for questions)
- New field names and types not present in any existing entity or DTO
- Ambiguous behaviors in acceptance criteria
- Inter-service communication details not specified
- Pagination or filtering behavior not described
- Error handling behavior not specified

Build an internal list of unknowns. If the list has more than 5 items,
prioritize by impact on architecture and DTOs — ask only the top 5.

---

## PHASE 3: Resolve unknowns (speckit pattern)

If unknowns exist, ask them ONE AT A TIME using the `AskUserQuestion` tool —
one call per unknown, never batched, since the answer to one can change
whether the next is even still relevant.

### Question format

For each unknown, call `AskUserQuestion` with a single question:

- `question`: the unknown phrased as a direct question.
- `header`: a short label (max 12 chars) naming the unknown (e.g. "Paginación", "Campo nuevo").
- `options`: 2-4 mutually exclusive choices. Put the recommended choice
  **first** and append " (Recomendado)" to its `label`. Use each option's
  `description` to give the 1-2 sentence reason a human would otherwise
  put in a "Recomendación:" line.
- The tool always offers an implicit "Other" — that covers any free-text
  answer outside the listed options, so do not add an "Otra" option yourself.

If the unknown has no natural discrete options (e.g. it's actually asking
for a specific value like a field name or limit), ask it as a normal
text question instead of forcing it into `AskUserQuestion` — the tool is
for choices, not open data capture.

### Rules
- Maximum 5 questions total across the whole session
- One `AskUserQuestion` call per unknown — wait for the answer before the next
- Never reveal upcoming questions in advance
- If no unknowns exist → skip this phase entirely and proceed to PHASE 4

### Record each resolution

As soon as a question is answered, record it as one bullet for the
`## Decisiones de Diseño` section (see `references/design-template.md`):

```markdown
- **<unknown resuelto>:** <opción elegida> — <razón breve>
```

If PHASE 3 is skipped entirely (no unknowns), omit the section from
`design.md` — do not write an empty header.

### Question priority order
1. New field names and types (blocks DTO design)
2. Inter-service DTO contracts (blocks sequence diagram)
3. Ambiguous acceptance criteria (blocks behavior definition)
4. Error handling behavior (blocks HTTP response design)
5. Pagination or filtering specifics (blocks request DTO design)

---

## PHASE 3.5: Technical research (conditional)

Only for **non-trivial technical decisions** — produce `docs/research.md`
documenting the alternatives considered and why one was chosen. This captures
the "why" that would otherwise be lost, and is the input the constitution's
Anti-Abstraction / Simplicity gates are judged against in PHASE 4.5.

A decision is "non-trivial" (→ warrants a research entry) when it involves any of:
- Choosing between multiple valid approaches (e.g. sync HTTP vs Redis Streams,
  new table vs extending an existing one, polling vs webhook)
- A performance, consistency, or security trade-off
- Introducing a new dependency, pattern, or integration point
- Anything the constitution flags as needing justification

If every decision is obvious/forced by existing patterns in `context.md` → skip
this file entirely (do not create an empty `research.md`).

For each non-trivial decision, record in `docs/research.md`:

```markdown
## Decisión: <título>

- **Contexto:** <qué problema fuerza la decisión>
- **Opciones evaluadas:**
  1. <opción A> — pros / contras
  2. <opción B> — pros / contras
- **Elegida:** <opción> — <razón, ligada a un AC o a un principio de la constitución>
- **Descartadas por:** <razón breve>
```

Anything decided here that changes a field or flow must stay consistent with
`api.yaml` / `data-model.md` produced in PHASE 4.

---

## PHASE 4: Produce design.md, docs/research.md, docs/diagram.md, docs/api.yaml and docs/data-model.md

After all unknowns are resolved, generate the complete design. Never embed the
diagram, the schemas, or the entity/SQL inline in `design.md`:

```bash
mkdir -p work/active/sm-<number>/docs/
```

### File 1 — docs/diagram.md (always)

Shows how data flows between microservices. Use Mermaid format:

```markdown
# Diagrama de flujo: sm-<number>

\`\`\`mermaid
sequenceDiagram
  actor Usuario
  participant BFF as sm-graphql-fb-ms
  participant Capabilities as sm-capabilities-ms

  Usuario->>BFF: POST /recurso/search (RequestDto)
  BFF->>Capabilities: POST /recurso/search (RequestDto)
  Capabilities-->>BFF: ResponseDto
  BFF-->>Usuario: ResponseDto
\`\`\`
```

Rules for the diagram:
- Show every microservice in the flow, in order
- Label each arrow with: HTTP method + path + schema name (matching the
  operation/schema names used in `docs/api.yaml`)
- Use `-->>` for responses, `->>` for requests
- Include the actor (Usuario/Sistema) as the initiator
- If a microservice calls another internally, show that hop too

### File 2 — docs/api.yaml (always, if any endpoint is new or changes)

The actual contract — OpenAPI 3.1, API-first: this is written and approved
**before** any NestJS code exists. `/plan` will generate DTOs that conform
to this file field-by-field, never the other way around.

Consult `references/api-template.md` for the exact structure and rules.

Build it from:
- `context.md` existing entity/DTO fields (reuse names and types exactly)
- Answers recorded in `## Decisiones de Diseño` (new fields)
- NEVER invent a field not backed by one of the two sources above

### File 3 — docs/data-model.md (conditional, only if a new/changed DB table is needed)

The TypeORM entity + migration SQL, full definitions. Consult
`references/data-model-template.md` for the exact structure.

Build it from:
- `context.md` existing entity fields (reuse names/types exactly when extending a table)
- Answers recorded in `## Decisiones de Diseño` (new fields)
- NEVER invent a field not backed by one of the two sources above

If no new/changed table is needed, skip this file entirely — do not create it.

### File 4 — design.md (narrative summary, links to docs/)

Consult `references/design-template.md` for the exact structure.

Contains:
- `## Decisiones de Diseño` (if PHASE 3 resolved any unknowns)
- A short prose summary of the flow + link to `docs/diagram.md`
- A per-microservice endpoint table (method + path + business description)
  linking to `docs/api.yaml` for the full schemas
- `## Modelado de datos` (conditional — only if `docs/data-model.md` was
  produced; here just name the new table(s) and link to `docs/data-model.md`
  for the full entity/SQL — do not repeat the code)

Save:
- `work/active/sm-<number>/docs/research.md` (if PHASE 3.5 produced it)
- `work/active/sm-<number>/docs/diagram.md`
- `work/active/sm-<number>/docs/api.yaml`
- `work/active/sm-<number>/docs/data-model.md` (if applicable)
- `work/active/sm-<number>/design.md`

---

## PHASE 4.5: Constitution & Quality Gates validation

Before presenting the design, validate it against the project's non-negotiable
principles. This is the design-time equivalent of Spec Kit's gates and the
constitution compliance check.

### If a constitution was loaded in PHASE 1

For each **Article**, confirm the design does not violate it. For each active
**Quality Gate**, mark it pass/fail with a one-line justification:

| Gate | Resultado | Justificación |
|------|-----------|---------------|
| Simplicity | ✅/⚠️ | <por qué no se agregaron capas/abstracciones sin caso de uso> |
| Anti-Abstraction | ✅/⚠️ | <por qué se usa el framework/patrón directo> |
| Integration-First | ✅/⚠️ | <`api.yaml` + contract tests definidos antes de implementar> |
| Test-First | ✅/⚠️ | <el plan escribirá tests antes del código — se garantiza en `/plan`> |

- If a gate **fails** (⚠️) → do not silently proceed. Either adjust the design
  to pass it, or record it as an **explicit, justified exception** in
  `design.md` (`## Excepciones a la constitución`) for the user to approve in
  PHASE 5. A violated principle is never a silent implementation choice.

### If no constitution exists

Apply the four gates above as **built-in defaults** anyway (Simplicity,
Anti-Abstraction, Integration-First, Test-First) — they are sound regardless —
and note in the summary that running `/constitution` would make them enforceable
project-wide.

Record the gate table in `design.md` under `## Validación de Quality Gates`
(see `references/design-template.md`).

---

## PHASE 5: STOP — await approval

After saving the files:

1. Show a summary:
   - Microservicios diseñados
   - Endpoints nuevos por micro (paths de `docs/api.yaml`)
   - Schemas nuevos creados
   - Si incluye modelo de datos o no (y si se generó `docs/data-model.md`)
   - Si se generó `docs/research.md` (y cuántas decisiones documenta)
   - Resultado de la validación de Quality Gates (todos ✅, o cuáles ⚠️ con excepción)
   - Si no había constitución, mención de que `/constitution` la haría exigible

2. Show the full content of `docs/research.md` (if generated), `docs/diagram.md`,
   `docs/api.yaml`, `docs/data-model.md` (if generated), and `design.md` for
   review — with `api.yaml` being the contract the user most needs to validate
   carefully, and the Quality Gates table the compliance summary to confirm.

3. Say:
   > "**STOP:** Revisá el contrato completo (`docs/api.yaml`), el diagrama y el modelo
   > de datos (si aplica) antes de continuar.
   > Una vez aprobado, `/plan` genera las DTOs y la entidad/migración de NestJS a partir
   > de estos archivos — un cambio posterior implica regenerarlas.
   > Si algo no es correcto, indicalo ahora. Cuando estés listo ejecutá `/plan sm-<number>`."

4. Stop — do not start planning.

---

## Common Issues

| Issue | Cause | Resolution |
|-------|-------|------------|
| context.md no encontrado | /scan no ejecutado | Indicar al usuario que ejecute /scan primero |
| `hu.md` tiene marcadores `[NEEDS CLARIFICATION]` | Ambigüedades sin resolver | STOP: ejecutar `/clarify sm-<number>` antes de diseñar |
| Un Quality Gate falla (⚠️) | El diseño viola un principio | Ajustar el diseño para pasarlo, o registrar excepción justificada en `design.md` y aprobarla en PHASE 5 |
| No hay constitución | `/constitution` nunca se ejecutó | Aplicar los 4 gates built-in por default; sugerir `/constitution` para hacerlos exigibles |
| Campo en schema no definido | HU ambigua | Preguntar en PHASE 3 antes de diseñar |
| Micro afectado no identificado | context.md incompleto | Preguntar al usuario antes de continuar |
| Diagrama sin nombres de schema en flechas | Falta información de contratos | Resolver en PHASE 3 antes de diagramar |
| Tabla nueva no confirmada | HU ambigua sobre persistencia | Preguntar como una de las 5 preguntas |
| api.yaml modificado después de /plan | Cambio de contrato post-aprobación | Advertir: ejecutar `/plan sm-<number>` de nuevo para regenerar las DTOs |
