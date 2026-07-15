---
name: build
description: >
  Executes a written TDD implementation plan autonomously, task by task,
  marking each task as completed in plan.md. Use when the user says
  "/build sm-XXX", "ejecutar plan", "implementar plan", "build story",
  or references a plan file (work/active/sm-*/plan.md).
  Do NOT use to write plans (use /plan). Do NOT use for general coding
  questions or quick fixes.
---

# build

## Overview

Load the implementation plan, review it critically, execute ALL tasks
autonomously without stopping between them, and mark each task as [X]
upon completion. Ask for review only once all tasks are complete.

**Announce at start:** "Ejecutando plan sm-<number>."

**Core principle:** Full autonomous execution — mark progress, review at the end.

---

## Perfil del proyecto (leer primero, siempre)

Antes de cualquier otra cosa, leé `.agents/profile.md` (en la raíz del proyecto actual): define las rutas de
artefactos, el idioma de salida, el **stack objetivo** y el **framework de tests**
que gobierna el ciclo TDD (rojo → verde → refactor). Si no existe, avisá que lo
creen desde la plantilla y detené.

**Los literales de este documento son solo un ejemplo de resolución** (el perfil de Smart Mobility).
Los valores reales salen del `profile.md` del proyecto en el que estés trabajando — si difieren, mandan los del perfil:

| En este documento | Clave en profile.md |
|---|---|
| `sm-<number>` | `STORY_ID_PATTERN` |
| `work/active/sm-<number>/` | `WORKDIR_ACTIVE` |
| Jest / `*.spec.ts` | `TEST_FRAMEWORK` |
| NestJS · TypeORM · `src/modules/` | sección 7 «Stack y arquitectura» |

---

## CRITICAL: Verify inputs

Extract the story number from user input. Then verify:

```bash
[ -f work/active/sm-<number>/plan.md ] || echo "MISSING: plan.md"
```

If missing → stop:
"No encontré `work/active/sm-<number>/plan.md`.
Ejecutá `/plan sm-<number>` primero."

---

## CRITICAL: Never execute on main or master

Before executing Task 0, verify the current branch:

```bash
git branch --show-current
```

If the result is `main` or `master` → stop immediately:
"Estás en la rama `main`/`master`. Cambiá a la rama de trabajo antes de continuar."

---

## CRITICAL: Never execute commits

Version control is managed by the user.
Never run `git add`, `git commit`, or `git push` at any point.

---

## Step 1: Review plan critically

1. Read `work/active/sm-<number>/plan.md` completely
2. Check for already completed tasks — look for [X] markers:
   - If tasks are already marked [X] → resume from the first incomplete task
   - If no tasks are marked → start from the beginning
3. **Verify traceability (Analyze gate):** read the "Trazabilidad AC → Tareas" table
   in the plan header and read `work/active/sm-<number>/hu.md`'s ACs.
   - Confirm every AC in `hu.md` appears in the table mapped to at least one task.
   - If an AC is missing from the table → STOP: "El plan no cubre AC-<N> (`<texto del AC>`).
     Ejecutá `/plan sm-<number>` de nuevo para regenerarlo o agregá la tarea faltante
     manualmente antes de continuar." Do not silently add tasks yourself — this is a
     planning gap, not an execution decision.
4. Identify any other concerns, gaps, or blockers before starting
5. If concerns exist → raise them and wait for resolution before proceeding
6. If no concerns → create a TodoWrite with all pending tasks and proceed
7. Note which tasks (if any) are marked `[P]` and which independent group they
   belong to — used in Step 2 to batch parallel execution.

---

## Step 2: Execute ALL tasks autonomously

Execute every pending task in the plan sequentially, EXCEPT tasks marked `[P]`
(see below).

For each task:
1. Mark task as in_progress in TodoWrite
2. Follow each step exactly as written — do not skip or reorder steps
3. Run every verification specified in the plan (tests, expected outputs)
4. Upon successful completion → mark task as [X] in plan.md:
   - Find the task header: ### Tarea N: ...
   - Add [X] at the end: ### Tarea N: ... [X]
5. Mark task as completed in TodoWrite
6. Continue immediately to the next task — do not wait for user input

**Do NOT stop between tasks.**

### Executing `[P]` tasks (parallel groups)

When the next pending tasks belong to different independent `[P]` groups
(per the plan header's "Grupos de implementación"), execute them together:
- Issue the Edit/Write/Bash tool calls for one task from each group in the
  same response (multiple tool calls in parallel), instead of one task at a time.
- Still run each group's own test verification independently — do not skip
  a group's test because another group's test passed.
- Mark each task [X] independently as soon as its own verification passes.
- Tasks within the *same* `[P]` group still execute in written order — only
  tasks across *different* groups are batched together.
- If a `[P]` task unexpectedly touches a file already modified by a
  different group in the same batch, stop that batch and fall back to
  sequential execution for the remaining tasks — the plan's grouping was wrong.

The only valid reasons to stop mid-execution:

| Reason | Action |
|--------|--------|
| Missing dependency (package, file, class) | Stop, report exactly what is missing |
| Test fails repeatedly (more than twice) | Stop, show the error, ask for guidance |
| Instruction is ambiguous or contradictory | Stop, quote the instruction, ask for clarification |
| Plan has a critical gap that prevents starting | Stop, describe the gap, wait for resolution |

**Ask for clarification rather than guessing.**

---

## Step 3: Finalize and request review

After ALL tasks are complete:

1. Run the full test suite for each affected microservice:

```bash
cd <microservice>
npx jest --no-coverage
cd ..
```

2. Delegate a conventions check to the `conventions-reviewer` subagent —
   it runs read-only against the diff and keeps the verbose review out of
   this conversation's context. Invoke `Agent` with:
   - `subagent_type: "conventions-reviewer"`
   - `model: "sonnet"` (pass explicitly even though the agent definition
     sets it — some Claude Code versions ignore the frontmatter `model` field)
   - A prompt naming each affected microservice, so it can run `git diff`
     against `develop` in each one

3. **Validate against the original spec:** read `work/active/sm-<number>/hu.md` again
   and build a closing checklist — one line per AC, marked against what was actually
   implemented and tested (not against what the plan intended):

   ```
   AC-1: <texto breve> — ✓ cubierto por sm-X/.../file.spec.ts
   AC-2: <texto breve> — ✓ cubierto por sm-Y/.../file.spec.ts
   ```

   If any AC cannot be marked ✓ with a concrete test reference → mark it ✗ and
   explain why before declaring the plan complete. Do not mark an AC ✓ just
   because its task is [X] — verify the test actually exercises that AC's behavior.

4. **Generate the Postman collection** from the approved contract — never hand-write it:

```bash
npx -y openapi-to-postmanv2 -s work/active/sm-<number>/docs/api.yaml -o work/active/sm-<number>/docs/postman_collection.json -p
```

   Esperado: `docs/postman_collection.json` creado/actualizado.

   - If `docs/api.yaml` does not exist (story had no new/changed endpoints) → skip this
     step silently, no Postman collection to generate.
   - If the command fails because the package isn't available via `npx`, try installing
     it once (`npm i -g openapi-to-postmanv2`) and retry. If it still fails, report:
     "No pude generar el Postman collection automáticamente (<error>). Podés importar
     `docs/api.yaml` directamente en Postman como alternativa." — do not block the rest
     of the completion flow on this.

5. Show a completion summary:
   - Tareas completadas (con conteo)
   - Archivos creados (lista de paths)
   - Archivos modificados (lista de paths)
   - Resultados de tests por microservicio
   - Checklist de validación de ACs (paso 3)
   - Postman collection generado en `docs/postman_collection.json` (o motivo si se omitió)
   - Hallazgos de convenciones del subagente (si hay)

6. Say:
   "Todas las tareas completadas. Revisá los cambios y
   decime si hay algo que ajustar."

7. Stop — do not proceed further until the user responds.

> Si más adelante aparece un defecto en este código y se origina en una
> ambigüedad o gap de `hu.md`, no reabrir esta skill ni regenerar el plan —
> usar `/hotfix sm-<number>`.

---

## Resuming interrupted execution

If the session was interrupted mid-execution, consult `references/resume-guide.md`
for the full resume procedure.

Quick summary:
1. Read plan.md — find all tasks marked `[X]`
2. Report: "Encontré N tareas ya completadas. Retomando desde Tarea M."
3. Verify the last `[X]` task produced its expected output
4. Continue from the first task NOT marked `[X]`
5. Do not re-execute completed tasks

---

## Common Issues

| Issue | Cause | Resolution |
|-------|-------|------------|
| Test fails on first run | Implementation has a bug | Read the error carefully, fix the implementation |
| Test fails repeatedly | Test setup incorrect | Stop and ask — do not guess |
| File already exists | Plan re-executed | Check if content is correct, overwrite only if needed |
| Module not found in imports | Barrel export missing | Add export to index.ts before continuing |
| Branch is main/master | User forgot to switch | Stop immediately, ask for correct branch |
| Use case not injected | Module registration missing | Check module.ts providers array |
| AC sin tarea en la tabla de trazabilidad | `/plan` generó el plan antes de este cambio, o se saltó PHASE 3.5 | STOP en Step 1.3, pedir regenerar el plan con `/plan sm-<number>` |
| Tarea `[P]` modifica un archivo ya tocado por otro grupo | Agrupación incorrecta en `/plan` | Abortar el batch paralelo, continuar el resto en modo secuencial |
| `openapi-to-postmanv2` no disponible | Paquete no instalado y sin acceso a npm registry | Reportar el fallo, sugerir importar `docs/api.yaml` directo en Postman, no bloquear el cierre |
| `docs/api.yaml` no existe | Historia sin endpoints nuevos/modificados | Omitir la generación de Postman silenciosamente |

---

## Example

**Input:** `/build sm-1933`

**Durante la ejecución — output por tarea:**

```
Ejecutando plan sm-1933.

[Tarea 0] Preparar rama de trabajo...
  ✓ git checkout -b feat/SM-1933-filter-zones-by-service-type
→ Marcando Tarea 0 como [X]

[Tarea 1] DTOs de request y response...
  ✓ Creado: sm-capabilities-ms/src/.../filter-zones-by-type.dto.ts
→ Marcando Tarea 1 como [X]

[Tarea 2] Puerto de dominio...
  ✓ npx jest ... → PASS (2 tests)
→ Marcando Tarea 2 como [X]
```

**plan.md después de completar Tarea 1:**
```markdown
### Tarea 1: DTOs de request y response [X]
```

**Salida final:**
> Todas las tareas completadas. Revisá los cambios y decime si hay algo que ajustar.
