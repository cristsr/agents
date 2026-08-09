---
name: forge
description: >
  Runs a story's implementation pipeline end to end: /plan, /build, then /sync in
  sequence, autonomously, without stopping between them — one command instead of
  three. Leaves built code with green tests and the module docs reconciled, ready
  to commit. Use when the user says "/forge hu-XXXX", "forjar la historia",
  "planear y construir", "plan build y sync de corrido", "ejecutá todo el pipeline
  de una", or wants to go from an approved design straight to built-and-documented
  in one shot. Do NOT use before /design is complete and approved (there is no plan
  input yet). Do NOT use to only plan (use /plan) or only build (use /build). Forge
  never runs git — it stops at /commit, so commits and the PR stay manual.
---

# forge

## Overview

Encadena el pipeline de implementación de una historia: `/plan` → `/build` →
`/sync`, de corrido y **sin pausar** entre etapas. Es un orquestador delgado — no
reimplementa nada: invoca las skills `plan`, `build` y `sync` en orden y consolida
el reporte final. La revisión humana queda **al final**, sobre el código ya
construido y la documentación ya reconciliada — justo antes de `/commit`.

**Límite de seguridad:** forge llega hasta la documentación (docs-only). **No toca
git**: los commits y el PR son de `/commit`, que sigue siendo un paso manual. Ese
es el checkpoint donde el usuario revisa antes de que algo entre a la rama.

**Announce at start:** "Forjando hu-<number>: /plan → /build → /sync sin pausas."

**Output:**
- `work/active/hu-<number>/plan.md` (lo produce `/plan`).
- El código implementado con sus tests en verde (lo produce `/build`).
- Docs del módulo reconciliadas y la historia archivada en `work/done/hu-<number>/`
  (lo produce `/sync`).

**Core principle:** una sola invocación reemplaza tres. Los gates propios de
`/plan`, `/build` y `/sync` se respetan; forge solo los encadena, **falla temprano**
si falta un input, y **se detiene en el borde de git** (nunca commitea ni pushea).

---

## Perfil del proyecto (leer primero, siempre)

Antes de cualquier otra cosa, leé `.agents/profile.md` (raíz del proyecto actual):
define el patrón de ID de historia, las rutas de artefactos, la rama base y el
idioma de salida. Si no existe, avisá que lo creen desde la plantilla y detené.

**CRITICAL — Directorio de trabajo:** antes de ejecutar cualquier cosa, verificá que estás en el directorio de trabajo del proyecto (`WORKING_DIRECTORY` del profile — ruta absoluta). Si `pwd` no coincide con `WORKING_DIRECTORY`, `cd` a ese directorio antes de continuar.

**Los literales de este documento son solo un ejemplo de resolución.** Los valores
reales salen del `profile.md` del proyecto — si difieren, mandan los del perfil:

| En este documento | Clave en profile.md |
|---|---|
| `hu-<number>` | `STORY_ID_PATTERN` |
| `work/active/hu-<number>/` | `WORKDIR_ACTIVE` |
| `develop` | `BASE_BRANCH` |
| salida en español | `OUTPUT_LANGUAGE` |

---

## CRITICAL: Preflight — verificar TODO antes de arrancar

Como el encadenado es autónomo (no hay pausa donde el usuario pueda corregir),
validá los inputs de **las dos etapas ANTES** de generar nada — para no producir
un `plan.md` y recién entonces morir en el guard de rama de `/build`.

Extraé el número de historia. Verificá, en orden:

1. **Inputs de `/plan`** (artefactos de diseño aprobados):

   ```bash
   [ -f work/active/hu-<number>/hu.md ]      || echo "MISSING: hu.md"
   [ -f work/active/hu-<number>/context.md ] || echo "MISSING: context.md"
   [ -f work/active/hu-<number>/design.md ]  || echo "MISSING: design.md"
   ```

   Si falta alguno → **STOP** con la instrucción de qué correr primero
   (`/hu`, `/scan` o `/design` según cuál falte). No sigas.

2. **Guard de rama de `/build`** (la rama base del profile):

   ```bash
   git branch --show-current
   ```

   Si el resultado es `main`, `master` o `BASE_BRANCH` (`develop`) → **STOP**:
   "Estás en la rama base. Cambiá a la rama de trabajo antes de forjar."

3. **Ambigüedad:** si `hu.md` tiene marcadores `[NEEDS CLARIFICATION]` sin
   resolver → **STOP**: "Resolvé las ambigüedades con `/clarify hu-<number>`
   antes de forjar." (Construir sobre ambigüedades produce DTOs incorrectos.)

Solo si los tres chequeos pasan, continuá al Step 1.

---

## Step 1: Ejecutar /plan

Invocá la skill `plan` con `hu-<number>` y esperá a que termine. Debe dejar
`work/active/hu-<number>/plan.md`.

Verificá que se haya producido y no esté vacío:

```bash
[ -s work/active/hu-<number>/plan.md ] && echo OK || echo "PLAN FAILED"
```

- Si `/plan` se detuvo por su cuenta (algún gate no cumplido) o `plan.md` quedó
  vacío → **abortá forge: NO ejecutes `/build`.** Reportá por qué paró `/plan` y
  qué hacer para resolverlo. Nunca construyas sobre un plan inexistente o parcial.

## Step 2: Ejecutar /build

Con `plan.md` presente y no vacío, invocá la skill `build` con `hu-<number>`.
`/build` ejecuta **todas** las tareas del plan de forma autónoma y marca cada una
`[X]` al completarla.

- No interrumpas entre tareas — esa es la semántica de `/build`.
- **En el chain, no te detengas en la pausa de revisión con la que `/build` cierra
  normalmente.** Si `/build` terminó todas las tareas con los tests **en verde**,
  continuá directo al Step 3 (`/sync`). La revisión humana es al final del pipeline,
  antes de `/commit`, no entre build y sync.
- Si una tarea falla de forma irrecuperable, `/build` se detiene y reporta; forge
  **aborta antes de `/sync`** y propaga ese reporte tal cual, no lo enmascara. No
  se reconcilia documentación sobre un build roto.

## Step 3: Ejecutar /sync

Con el build en verde, invocá la skill `sync` con `hu-<number>`. `/sync` reconcilia
el delta del design en los docs vivos del módulo (LikeC4 + OpenAPI + flows), apila
decisiones, y archiva la historia en `work/done/`.

- `/build` ya corrió los tests en verde: informá a `/sync` que los gates ya pasaron
  para que **no vuelva a pedirlos** (su Step 2 pregunta antes de re-correr lint/test/
  build; en el chain se saltea porque acaban de pasar).
- `/sync` es **docs-only**: no toca git. Si `/sync` se detiene por su propio gate
  (p. ej. algo no reconcilia, o detecta un duplicado de flujo), forge propaga el
  reporte y **para acá** — no fuerza el cierre.

## Step 4: Reporte end-to-end

Al terminar, consolidá en un solo resumen:

1. **Plan:** cuántas tareas generó `/plan`.
2. **Build:** cuántas quedaron `[X]` y el resultado de los tests (verde/rojo).
3. **Sync:** qué se reconcilió (OpenAPI/`.c4`/flows por módulo) y que la historia
   quedó archivada en `work/done/hu-<number>/`.
4. **Estado final** de la historia.
5. **Siguiente paso — el borde de git (manual):** "Todo forjado y documentado.
   Revisá los cambios; cuando estén OK, `/commit hu-<number>` agrupa los commits y
   deja el PR redactado."

Stop — forge no toca git. Agrupar/ejecutar commits y redactar el PR es de `/commit`.

---

## Common Issues

| Issue | Causa | Resolución |
|---|---|---|
| Falta `design.md` en preflight | `/design` no corrió o no se aprobó | STOP; correr `/design hu-<number>` primero |
| Rama base | estás en `develop`/`main`/`master` | Cambiar a la rama de trabajo antes de forjar |
| `plan.md` vacío tras `/plan` | `/plan` se detuvo por un gate | Abortar forge; resolver lo que reportó `/plan` (p. ej. `/clarify`) y reintentar |
| `hu.md` con `[NEEDS CLARIFICATION]` | ambigüedades sin resolver | STOP; `/clarify hu-<number>` antes de forjar |
| Un test no pasa al final | defecto de implementación | `/build` se detiene; forge **aborta antes de `/sync`**. Corregir el código, o `/hotfix` si es un gap de spec |
| `/sync` reporta un duplicado de flujo | el design nombró distinto un flujo existente | forge para tras el build; resolver con `/refine` el design y reintentar `/sync` |

## Examples

### Example 1: forjado feliz (pipeline completo)

User dice: "/forge hu-0006"

Acciones:
1. Preflight: `hu.md`/`context.md`/`design.md` presentes; rama `feat/core` (no base);
   sin marcadores `[NEEDS CLARIFICATION]`. OK.
2. Step 1: invoca la skill `plan` con hu-0006 → genera `plan.md` con 12 tareas.
   Chequeo `[ -s plan.md ]` → OK.
3. Step 2: invoca la skill `build` con hu-0006 → ejecuta las 12 tareas, todas `[X]`,
   tests en verde. No frena en la revisión de `/build`; continúa.
4. Step 3: invoca la skill `sync` con hu-0006 (gates ya en verde, no los re-corre) →
   reconcilia `api.yaml`/`accounts.c4`/`flows` del módulo y archiva la historia en
   `work/done/hu-0006/`.
5. Step 4: reporta 12/12 + verde + docs reconciliadas, y sugiere `/commit hu-0006`.

### Example 2: aborta antes de build

User dice: "/forge hu-0009"

Acciones:
1. Preflight: falta `design.md` → **STOP**. "No encontré `work/active/hu-0009/design.md`.
   Ejecutá `/design hu-0009` primero." No corre `/plan`, `/build` ni `/sync`.

### Example 3: build rojo → no reconcilia docs

User dice: "/forge hu-0007"

Acciones:
1. Preflight OK. Step 1: plan con 9 tareas.
2. Step 2: `/build` falla en la tarea 6 (test que no pasa de forma irrecuperable).
   forge **aborta antes de `/sync`**: reporta la tarea que falló; no reconcilia docs
   ni archiva la historia. El usuario corrige (o `/hotfix`) y reintenta.

---

## Output Language

El cuerpo de este `SKILL.md` va en el idioma del proyecto (español). Excepción:
frontmatter, nombres de campos, rutas y código siempre en inglés. Los disparadores
de la `description` incluyen las frases en español (y sus equivalentes en inglés).
