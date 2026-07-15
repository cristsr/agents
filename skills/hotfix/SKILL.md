---
name: hotfix
description: >
  Corrige un defecto post-build que se originó por una ambigüedad o un gap de
  clarificación en hu.md — corrige o agrega el AC afectado y aplica el fix
  como una tarea puntual sobre plan.md y el código ya construido, sin
  regenerar el plan completo ni re-ejecutar /build desde cero.
  Use when the user says "/hotfix sm-XXX", "esto quedó mal porque no se
  clarificó bien", "hay un bug post-build por un AC ambiguo", "necesito
  corregir algo que ya se construyó", "encontré un caso que no se cubrió",
  or reports a defect in already-built code that traces back to a
  missing/ambiguous AC.
  Do NOT use for artifacts that haven't been built yet (use /refine).
  Do NOT use for defects unrelated to spec ambiguity — fix those directly
  in the code without going through this flow.
---

# hotfix

## Perfil del proyecto (leer primero, siempre)

Antes de cualquier otra cosa, leé `.agents/profile.md` (en la raíz del proyecto actual): define el patrón de ID
de historia, las rutas de artefactos, el idioma de salida, el **stack objetivo** y
el **framework de tests** (esta skill ejecuta una tarea con disciplina TDD). Si no
existe, avisá al usuario que lo cree copiando `~/.agents/sdd-profile.template.md` a `.agents/profile.md` del proyecto, y detené: sin perfil no conocés las convenciones de este proyecto.

**Los literales de este documento son solo un ejemplo de resolución** (el perfil de Smart Mobility).
Los valores reales salen del `profile.md` del proyecto en el que estés trabajando — si difieren, mandan los del perfil:

| En este documento | Clave en profile.md |
|---|---|
| `sm-<number>` | `STORY_ID_PATTERN` |
| `work/active/sm-<number>/` | `WORKDIR_ACTIVE` |
| Jest / `*.spec.ts` | `TEST_FRAMEWORK` |
| NestJS · TypeORM | sección 7 «Stack y arquitectura» |

---

## Overview

Bridge between `/refine` (corrige artefactos) y `/build` (ejecuta planes) para
un caso específico: **el código ya existe**, `plan.md` ya tiene tareas `[X]`,
y el defecto se debe a que `hu.md` no clarificó bien un AC (o le faltaba uno).

En vez de re-ejecutar `/plan` (que regeneraría el plan completo, perdiendo
los `[X]` existentes) o `/refine` (que no toca código ni plan.md), esta skill:
1. Corrige/agrega el AC en `hu.md`
2. Agrega UNA tarea puntual `Tarea HOTFIX-N` al final de `plan.md`
3. Ejecuta solo esa tarea con disciplina TDD
4. Actualiza la trazabilidad AC → Tarea

**Announce at start:** "Aplicando hotfix sobre sm-<number>."

**Output:** `hu.md` (AC corregido/agregado + sección `## Hotfixes`),
`plan.md` (tarea HOTFIX-N agregada y marcada `[X]`), código corregido.

---

## CRITICAL: Verify this is actually a post-build case

```bash
[ -f work/active/sm-<number>/plan.md ] || echo "MISSING: plan.md"
grep -c '\[X\]' work/active/sm-<number>/plan.md 2>/dev/null || echo 0
```

- Si `plan.md` no existe → STOP:
  "No hay nada construido todavía para sm-<number>. Usá `/refine` para
  corregir el artefacto que corresponda y seguí con `/plan` y `/build`
  normalmente — `/hotfix` es solo para defectos post-build."

- Si `plan.md` existe pero NO tiene ninguna tarea `[X]` → STOP:
  "El plan todavía no se ejecutó (`/build` no corrió ninguna tarea). Corregí
  con `/refine` y seguí el flujo normal — no hace falta `/hotfix` todavía."

---

## CRITICAL: Never execute on main or master

```bash
git branch --show-current
```

Si el resultado es `main` o `master` → detener:
"Estás en la rama `main`/`master`. Cambiá a la rama de trabajo de la historia
antes de continuar."

---

## CRITICAL: Never execute commits

Nunca ejecutar `git add`, `git commit`, ni `git push`. El control de versiones
lo maneja el usuario.

---

## PHASE 1: Identify the gap

1. Si el usuario no describió el defecto, preguntar:
   > "¿Qué está pasando? Describí el comportamiento incorrecto observado."

2. Leer `work/active/sm-<number>/hu.md` completo — ACs, Reglas de Negocio,
   sección `## Hotfixes` si ya existe (para numerar `HOTFIX-N` correctamente).

3. Clasificar el defecto:
   - **AC existente mal clarificado:** hay un AC que cubre el área pero su
     redacción era ambigua y se implementó la interpretación incorrecta.
   - **AC faltante:** el caso reportado nunca estuvo descrito como AC —
     es un edge case que se escapó por completo.

4. Mostrar el AC relevante (si existe) y la corrección propuesta:
   > "**AC-N actual:** '<texto>' — **Propuesta:** '<texto corregido>'."

   Si es un AC faltante, proponer el texto del AC nuevo siguiendo el
   formato de `references/hu-template.md` (numeración siguiente a la última).

   Confirmar con `AskUserQuestion`: `question: "¿Confirmás esta corrección del AC-N?"`,
   `header: "AC-N"`, options `"Confirmar"` / `"Ajustar el texto"`. Si elige
   "Ajustar el texto", seguir en texto libre hasta llegar a una redacción
   confirmada antes de tocar `hu.md`.

5. Esperar confirmación antes de tocar `hu.md`.

### Tamaño check (importante)

Si el AC faltante implica un microservicio nuevo, un endpoint nuevo, o una
tabla nueva — esto **no es un hotfix**, es una historia mal dimensionada.
Usar `AskUserQuestion`:
- `question`: "Esto excede el alcance de un hotfix (implica <razón>). ¿Cómo seguimos?"
- `header`: "Alcance"
- `options`: `"Tratarlo como ampliación de la historia (Recomendado)"` con
  description "Usar /refine hu para agregar el AC y /plan para regenerar el
  plan completo con la tarea nueva incluida" / `"Seguir igual como hotfix"`
  con description "Aceptás el riesgo de un hotfix fuera de su alcance habitual".

Si elige la opción recomendada, detenerse y redirigir — no continuar con el flujo de hotfix.

---

## PHASE 2: Correct hu.md

1. Aplicar la corrección/adición del AC con Edit (misma disciplina que
   `/refine` Modo Directo — texto exacto, sin inventar alcance).
2. Agregar una entrada a `## Hotfixes` (crear la sección si no existe, al
   final del archivo, después de `Fuera de Alcance` si existe):

```markdown
## Hotfixes

- **HOTFIX-N (AC-N):** <qué estaba mal o faltaba> → <corrección aplicada> — implementado en `plan.md` Tarea HOTFIX-N.
```

`N` continúa la numeración del último `HOTFIX-N` existente en el archivo
(empieza en 1 si es el primero).

---

## PHASE 3: Determine impact scope

1. Leer la tabla "Trazabilidad AC → Tareas" del header de `plan.md`.
2. Si el AC ya existía: identificar qué Tarea(s) lo cubren — esos son los
   archivos más probables a tocar.
3. Leer `work/active/sm-<number>/context.md` para confirmar rutas exactas
   de los archivos del microservicio afectado.
4. Si el AC es nuevo (sin tareas previas): el archivo a modificar es el que
   ya implementa el comportamiento relacionado más cercano — identificarlo
   leyendo el código del microservicio afectado.

---

## PHASE 4: Append the hotfix task to plan.md

Agregar al final de `plan.md`, bajo un header `## Hotfixes` (crearlo si no
existe), una tarea con la misma estructura que
`docs/architecture` ya define para tareas normales — consultar
`../plan/references/task-structure-template.md` — pero numerada `HOTFIX-N`
en vez de un número secuencial de tarea:

```markdown
### Tarea HOTFIX-N: <descripción breve del fix>

**AC relacionado:** AC-N (corregido/agregado en hu.md)

**Archivos:**
- Modificar: `sm-<micro>/src/exact/path/to/file.ts:123-145`
- Test: `sm-<micro>/src/exact/path/to/file.spec.ts`

**Step 1: Escribir el test de regresión que falla**
...
**Step 2: Confirmar que falla**
...
**Step 3: Aplicar el fix mínimo**
...
**Step 4: Confirmar que pasa**
...
```

Actualizar la tabla "Trazabilidad AC → Tareas" del header: agregar/actualizar
la fila del AC afectado para que incluya `Tarea HOTFIX-N`.

---

## PHASE 5: Execute the hotfix task

Misma disciplina TDD que `/build` Step 2, pero acotada a esta única tarea:
1. Marcar in_progress (TodoWrite opcional para una sola tarea)
2. Test de regresión → confirmar que falla → implementar el fix mínimo →
   confirmar que pasa
3. Marcar `### Tarea HOTFIX-N: ... [X]` en `plan.md`
4. Correr el suite completo del módulo afectado:

```bash
cd <microservicio>
npx jest src/modules/<modulo>/ --no-coverage
cd ..
```

Esperado: PASS — incluyendo el test de regresión nuevo y todos los existentes
(verificar que el fix no rompió nada que ya pasaba).

---

## PHASE 6: Coherence check + close

1. Si el defecto también implica que `docs/api.yaml`, `docs/diagram.md` o
   `docs/data-model.md` quedaron desalineados (ej: el AC corregido cambia un
   código de respuesta o un campo del contrato) → advertir, NO corregirlos
   automáticamente:
   > "⚠️ Este fix también afecta el contrato. Ejecutá `/refine api sm-<number>`
   > (o `diagram`/`data-model` según corresponda) para mantenerlo alineado."

2. Delegar un check de convenciones al subagente `conventions-reviewer`
   sobre el diff de esta tarea puntual (mismo patrón que `/build` Step 3.2).

3. Mostrar resumen:
   - AC corregido/agregado
   - Archivos modificados
   - Resultado de tests del módulo afectado
   - Advertencias de contrato (si aplica)
   - Hallazgos de convenciones (si hay)

4. Decir:
   > "Hotfix aplicado. `hu.md` y `plan.md` actualizados con HOTFIX-N. Revisá
   > los cambios y decime si hay algo que ajustar."

5. Detener — no continuar con más cambios sin confirmación.

---

## Common Issues

| Issue | Cause | Resolution |
|-------|-------|------------|
| plan.md no existe | El flujo nunca llegó a `/plan` | Redirigir a `/refine` + `/plan` + `/build` normal |
| plan.md sin ninguna tarea `[X]` | `/build` no se ejecutó todavía | Redirigir a `/refine` — no hace falta hotfix |
| El gap implica micro/endpoint/tabla nueva | Historia mal dimensionada, no es un defecto puntual | Recomendar `/refine hu` + `/plan` completo en vez de hotfix |
| AC corregido contradice otro AC existente | El AC original tenía una intención distinta a la reportada | Mostrar ambos ACs, confirmar con el usuario antes de aplicar |
| El fix requiere tocar `api.yaml`/`diagram.md`/`data-model.md` | El gap era de contrato, no solo de wording | Advertir al cierre, no corregir automáticamente — usar `/refine` para esos archivos |
| Tests del módulo fallan después del fix | El fix rompió un comportamiento ya cubierto | No marcar `[X]`, ajustar el fix hasta que todo el suite pase |

---

## Example

**Input:** `/hotfix sm-1933` — "el AC-2 solo decía 'retorna lista vacía' sin especificar el código HTTP, y se implementó devolviendo 404 — un cliente real espera 200 con array vacío"

**Flujo:**
1. Verifica `plan.md` → existe, 6 tareas, 6 marcadas `[X]`. Confirma caso post-build.
2. Rama actual: `feat/SM-1933-filter-zones-by-service-type` (no es main). Continúa.
3. Lee `hu.md` → AC-2: "Si no hay resultados, retorna lista vacía." — ambiguo, no especifica código HTTP. Propone:
   > "**AC-2 actual:** 'Si no hay resultados, retorna lista vacía.' — **Propuesta:** 'Si no hay resultados, retorna lista vacía con código 200.'"
   y llama `AskUserQuestion` (header "AC-2", opciones "Confirmar" / "Ajustar el texto").
4. Usuario elige "Confirmar". PHASE 2: edita AC-2, agrega:
   ```markdown
   ## Hotfixes

   - **HOTFIX-1 (AC-2):** El AC no especificaba código HTTP ante lista vacía y se implementó como 404 → se precisó que debe ser 200 — implementado en `plan.md` Tarea HOTFIX-1.
   ```
5. PHASE 3: tabla AC→Tareas dice AC-2 → Tarea 3 (Puerto de dominio) y Tarea 5 (Controller). El archivo a tocar es el controller.
6. PHASE 4: agrega `### Tarea HOTFIX-1: Corregir código de respuesta en lista vacía` con test de regresión que pega al endpoint sin resultados y espera `200` + `[]`. Actualiza la fila de AC-2 en la tabla de trazabilidad para incluir `Tarea HOTFIX-1`.
7. PHASE 5: test falla (devuelve 404) → corrige el controller → test pasa. Suite completo del módulo: PASS.
8. PHASE 6: el código 200 ya estaba documentado en `api.yaml`, solo el código no lo respetaba — sin impacto de contrato. Cierra:
   > "Hotfix aplicado. `hu.md` y `plan.md` actualizados con HOTFIX-1. Revisá los cambios y decime si hay algo que ajustar."
