---
name: status
description: >
  Diagnoses where a story is in the SDD pipeline: which artifacts exist
  (hu.md, context.md, design.md, plan.md), how many plan tasks are done, and
  what the next step is. Also lists active and done stories. Use when the user
  says "/status", "/status hu-XXXX", "en qué etapa está", "dónde quedamos",
  "qué falta para avanzar", "estado de la historia", or after an interrupted
  session to resume work. Read-only — never writes or mutates anything.
---

# status

## Overview

Lee (solo lectura) la carpeta de la historia y reporta su etapa en el pipeline
sin ejecutar nada. Útil para retomar sesiones interrumpidas y para decidir cuál
es el siguiente comando.

**Announce at start:** "Estado de hu-<number>: ..."

---

## Perfil del proyecto (leer primero, siempre)

Antes de cualquier otra cosa, leé `.agents/profile.md` (en la raíz del proyecto actual):
define el patrón de ID de historia y las rutas de artefactos. Si no existe, avisá
que lo creen desde la plantilla y detené.

**CRITICAL — Directorio de trabajo:** antes de ejecutar cualquier cosa, verificá que estás en el directorio de trabajo del proyecto (`WORKING_DIRECTORY` del profile — ruta absoluta). Si `pwd` no coincide con `WORKING_DIRECTORY`, `cd` a ese directorio antes de continuar.

---

## Step 1: Resolve the story

- Con `hu-XXXX` → trabajar sobre esa historia.
- Sin historia → listar TODAS las activas:

```bash
ls -d work/active/*/ 2>/dev/null
```

y mostrar una línea por cada una con su etapa (Step 2 aplicado a cada una, sin
detalle).

## Step 2: Build the stage report

Para una historia, verificar en orden:

```bash
id="<story-id>"
for f in hu.md context.md design.md plan.md; do
  [ -f "work/active/$id/$f" ] && echo "$f:  SI" || echo "$f:  no"
done
[ -d "work/active/$id/docs" ] && echo "docs/: SI" || echo "docs/: no"
```

Etapas posibles:

| Última etapa | Tiene | Falta / siguiente paso |
|---|---|---|
| `inbox` | nada | `/hu <id>` |
| `hu` | hu.md | `/clarify` (recomendado) o `/scan` |
| `context` | + context.md | `/design` |
| `design` | + design.md (+ docs/) | `/plan` (tras aprobación del diseño) |
| `plan` | + plan.md | `/build` |
| `build` | plan.md con tareas `[X]` | contar `[X]`: `rg -c '\[X\]' work/active/$id/plan.md` — si no están todas, `/build` retoma; si todas, `/sync` |
| `done` | carpeta en `work/done/` | `/commit` |

Si hay `[NEEDS CLARIFICATION]` en hu.md, señalarlo: `/design` no avanza hasta resolverlos.

Si existe `work/done/<id>/`, la historia está cerrada → reportar y sugerir `/commit`.

## Step 3: Report and stop

Formato conciso, una línea por artefacto + una línea "Siguiente paso". No ejecutar
nada más — la skill es read-only. Sugerir el comando exacto del siguiente paso
(ej. "Ejecutá `/build hu-0009` — retoma desde la tarea 4 de 7.").
