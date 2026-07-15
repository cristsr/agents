---
name: scan
description: >
  Scans the codebase and documentation for a given story to produce a context.md
  with all reusable artifacts found. Use when the user says "/scan sm-XXX",
  "scan story", "analizar historia", "escanear contexto", or provides a story
  number and asks to read the codebase before planning.
  Do NOT use for planning (use /plan), designing (use /design), or executing (use /build).
---

# Scan

## Overview

Read the story, identify affected microservices, explore the codebase and
available documentation, and produce `work/active/sm-<number>/context.md`
with everything found — organized by microservice, with absolute paths.

**Announce at start:** "Escaneando el contexto para sm-<number>."

**Output:** `work/active/sm-<number>/context.md`

---

## Perfil del proyecto (leer primero, siempre)

Antes de cualquier otra cosa, leé `.agents/profile.md` (en la raíz del proyecto actual): define el patrón de ID
de historia, las rutas de artefactos, la rama base, el **stack objetivo** y los
**paths de documentación** de este proyecto. Todo lo que esta skill busca en el
código (estructura de módulos, entidades, DTOs, servicios) sale de la sección 7
del perfil. Si no existe, avisá al usuario que lo cree copiando `~/.agents/sdd-profile.template.md` a `.agents/profile.md` del proyecto, y detené: sin perfil no conocés las convenciones de este proyecto.

**Los literales de este documento son solo un ejemplo de resolución** (el perfil de Smart Mobility).
Los valores reales salen del `profile.md` del proyecto en el que estés trabajando — si difieren, mandan los del perfil:

| En este documento | Clave en profile.md |
|---|---|
| `sm-<number>` | `STORY_ID_PATTERN` |
| `work/active/sm-<number>/` | `WORKDIR_ACTIVE` |
| microservicio | `COMPONENT_TERM` |
| `develop` | `BASE_BRANCH` |
| `docs/architecture/services.md` | `DOCS_COMPONENTS_INDEX` |
| `docs/services/<micro>/README.md`, `.../architecture.md` | `DOCS_COMPONENT_README`, `DOCS_COMPONENT_ARCH` |
| `src/modules/` y artefactos NestJS/TypeORM (entidad, module.ts, DTO, servicio abstracto) | sección 7 «Stack y arquitectura» |
| subagente `code-explorer` | `EXPLORER_SUBAGENT` (si el agente no soporta subagentes, explorar inline) |

---

## CRITICAL: Before scanning anything

1. Extract the story number from the user input — look for `sm-XXXX` or a plain number.
   If not found, ask: "¿Cuál es el número de la historia?"
2. Verify `work/active/sm-<number>/hu.md` exists.
   If missing, stop: "No encontré `work/active/sm-<number>/hu.md`.
   Ejecutá `/hu` primero para estructurar la historia."

---

## PHASE 1: Read the story

1. Read `work/active/sm-<number>/hu.md` — extract:
   - Historia de Usuario (Como / Quiero / Para)
   - Criterios de Aceptación completos
   - Notas Técnicas si existen

2. Read `docs/architecture/services.md` to identify affected microservices.
   Apply the microservice identification guide against the story content.
   List every microservice affected — there may be more than one.

3. If the affected microservices are not clear from the story content:
   - Register as unknown: "Microservicio afectado no identificado con certeza"
   - Ask: "¿Qué microservicio(s) afecta esta historia?
     (ej: sm-capabilities-ms, sm-graphql-fb-ms)"
   - Wait for answer before continuing.

---

## PHASE 2: Verify affected microservices are on fresh base code (read-only)

`/scan` never mutates git state — it does not checkout branches or pull. It only
**checks** whether each affected microservice is on the base branch (`develop`)
and up to date, so the scan reads current code. Preparing the repos (checkout +
pull) is the job of the dedicated `/sync` skill.

For EACH microservice identified in PHASE 1, inspect (read-only):

```bash
git -C <microservice> branch --show-current
git -C <microservice> status --porcelain
git -C <microservice> fetch --dry-run 2>&1 | head -1   # ¿hay algo por traer?
```

- If a microservice is **not on `develop`**, or has **uncommitted changes**, or
  is **behind its remote** → do NOT touch it. Warn the user and recommend
  running `/sync` first:
  > "`<microservice>` no está en `develop` actualizado (rama actual: `<rama>`).
  > El scan va a leer el código tal como está. Si querés escanear sobre la base
  > fresca, ejecutá `/sync <microservice>` primero y volvé a correr el scan."

- If everything is clean and current → continue silently.

The scan proceeds either way (it reads whatever is checked out) — the warning is
so the developer decides whether the current code is the right base to scan.

---

## PHASE 3: Scan each affected microservice

Delegate the exploration to the `code-explorer` subagent — it runs
read-only and returns structured findings, keeping the heavy file reading
out of this conversation's context.

If more than one microservice is affected, launch one `code-explorer`
call per microservice **in parallel** (multiple `Agent` tool calls in the
same response).

For each affected microservice, invoke `Agent` with:
- `subagent_type:` el valor de `EXPLORER_SUBAGENT` del perfil (por defecto
  `"code-explorer"`, un agente global agnóstico en `~/.claude/agents/`). Si el
  perfil dice `ninguno` o el agente anfitrión no soporta subagentes, explorá
  inline con Read/Grep/Glob y saltá al paso siguiente.
- `model:` el valor de `EXPLORER_MODEL` del perfil (por defecto `"sonnet"` si el
  perfil no lo declara). **Pasalo siempre explícito**, aunque el agente lo traiga
  en su frontmatter: algunas versiones de Claude Code ignoran ese campo, y este
  parámetro es el único punto donde el proyecto puede elegir el modelo.
- A prompt that includes:
  1. The microservice name and the story keywords to search for
  2. Instruction to first read `docs/services/<microservice>/README.md` and
     `docs/services/<microservice>/architecture.md`
  3. Instruction to locate the affected module under
     `<microservice>/src/modules/` using the story keywords
  4. Instruction to consult `references/scan-guide.md` for exact paths and
     what to read/skip per file type
  5. Instruction to check `docs/services/<microservice>/` for documentation
     gaps
  6. Instruction to return findings in the agent's standard output format

If the subagent reports it could not locate the module:
- Register as unknown: "Módulo no encontrado en <microservice>"
- Ask: "¿Sabés dónde está el módulo relacionado en <microservice>?
  Podés darme el path o keywords para buscar."
- Wait for answer before continuing.

Record each subagent's returned findings verbatim for use in PHASE 5:
- Module path
- Entity file path + field names and types
- Module.ts path + current providers list
- Canonical use case path + injection pattern
- DTO barrel path + exported class names
- Service abstract path + method signatures
- Documentation gaps found
- Any unknowns encountered

---

## PHASE 4: Resolve unknowns

Before writing context.md, review all registered unknowns.

If any unknowns exist:
- List them all at once — do NOT ask one by one if multiple exist
- Wait for the user to resolve all of them before continuing

Format:
> "Encontré las siguientes incógnitas antes de continuar:
>
> 1. [incógnita 1]
> 2. [incógnita 2]
>
> ¿Podés ayudarme a resolverlas?"

If no unknowns → proceed directly to PHASE 5.

---

## PHASE 5: Write context.md

Consult `references/context-template.md` for the exact file structure to produce.

Save the filled template to `work/active/sm-<number>/context.md`.

---

## PHASE 6: Confirm and hand off

After saving `context.md`:

1. Show a brief summary:
   - Microservicios escaneados
   - Módulos encontrados
   - Gaps detectados (si hay)

2. Say:
   "Contexto guardado en `work/active/sm-<number>/context.md`.
   Revisalo y cuando estés listo ejecutá `/design sm-<number>`."

3. Stop — do not start designing.

---

## Common Issues

| Issue | Cause | Resolution |
|-------|-------|------------|
| `hu.md` no encontrado | `/hu` no ejecutado | Detener y pedir que ejecute `/hu sm-<number>` primero |
| Módulo no encontrado en el microservicio | Módulo nuevo o con nombre distinto | Registrar como unknown y preguntar al usuario |
| Microservicio no identificado | HU ambigua o sin keywords claros | Preguntar: "¿Qué microservicio(s) afecta esta historia?" |
| Entidad no encontrada | Módulo usa MongoDB o estructura distinta | Registrar gap en context.md y continuar |
| Documentación ausente | `docs/services/<micro>/` no existe | Registrar como gap: "Sin documentación en docs/services/<micro>/" |
| Múltiples unknowns acumulados | Historia compleja o codebase desconocido | Listar todos juntos en PHASE 4, no uno por uno |
