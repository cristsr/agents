---
name: prepare
description: >
  Prepares a fresh base branch (checkout + pull) for the components affected by
  a story, so /scan reads current code and /plan's Tarea 0 creates the working
  branch off an up-to-date base. Runs right after /hu, before /clarify and /scan.
  Use when the user says "/prepare", "/prepare hu-XXXX", "preparar ramas",
  "checkout y pull", "traer la base actualizada", "dejar la base fresca", or
  right after /hu to leave the base ready before scanning.
  Do NOT use to create working branches (that's /plan's Tarea 0), to commit or
  push (that's /commit), or to scan the codebase (use /scan).
---

# prepare

## Overview

Pone cada componente afectado por una historia en la rama base fresca
(`BASE_BRANCH` del profile) haciendo `checkout` + `pull`, para que el pipeline
siempre arranque sobre código actualizado. **No crea la rama de trabajo** — eso
es Tarea 0 de `/plan` — y **no muta nada más** que el checkout/pull de la base.

**Announce at start:** "Preparando la rama base para <componentes>."

**Output:** cada componente afectado en `BASE_BRANCH`, actualizado y con el
working tree limpio (o un reporte de qué impide prepararlo).

---

## Perfil del proyecto (leer primero, siempre)

Antes de cualquier otra cosa, leé `.agents/profile.md` (en la raíz del proyecto actual): define la rama base (`BASE_BRANCH`), la topología del repo (`REPO_TOPOLOGY`: mono-repo vs multi-repo), el patrón de ID de historia y la skill de prep configurada (`PREP_SKILL`). Si no existe, avisá al usuario que lo cree copiando `~/.agents/sdd-profile.template.md` a `.agents/profile.md` del proyecto, y detené: sin perfil no conocés las convenciones de este proyecto.

**CRITICAL — Directorio de trabajo:** antes de ejecutar cualquier cosa, verificá que estás en el directorio de trabajo del proyecto (`WORKING_DIRECTORY` del profile — ruta absoluta). Si `pwd` no coincide con `WORKING_DIRECTORY`, `cd` a ese directorio antes de continuar.

**Los literales de este documento son solo un ejemplo de resolución** (el perfil de admin-back).
Los valores reales salen del `profile.md` del proyecto en el que estés trabajando — si difieren, mandan los del perfil:

| En este documento | Clave en profile.md |
|---|---|
| `hu-<number>` | `STORY_ID_PATTERN` |
| «microservicio» en la prosa | `COMPONENT_TERM` (sección 7) — leé el término del profile |
| `develop` | `BASE_BRANCH` |
| mono-repo (un solo repo git en la raíz) | `REPO_TOPOLOGY` |
| `apps/finances`, `apps/ledger` | sección 7 / estructura de componentes del proyecto |
| salida en español | `OUTPUT_LANGUAGE` |

---

## CRITICAL: Identify the components to prepare

1. Extraé el número de historia del input (patrón `STORY_ID_PATTERN`, ej. `hu-XXXX`).
2. Para identificar los componentes afectados, en este orden:
   - Leer `work/active/hu-<number>/hu.md` (corrida normal: `/prepare` corre justo
     después de `/hu`) — los microservicios/modulos nombrados en la historia y sus
     keywords sirven como pista inicial.
   - Si existe `work/active/hu-<number>/context.md` (porque `/scan` ya corrió),
     usarlo como fuente de verdad.
   - Si aun así no queda claro → preguntar: "¿Qué componente(s) preparo?
     (ej: apps/finances, apps/ledger)" y esperar. No adivinar.
3. Si el perfil define `REPO_TOPOLOGY = mono-repo` → un solo repositorio git en la
   raíz: preparar la raíz una vez, sin `git -C`. Si es `multi-repo` → repetir los
   pasos por cada componente con `git -C <componente>`.

---

## CRITICAL: Never lose work, never create branches, never commit

- **Permitido:** `git checkout <BASE_BRANCH>`, `git pull` (solo en modo
  fast-forward; si el pull pide merge/rebase → detenerse y reportar).
- **Prohibido:** `git checkout -b` (rama de trabajo = Tarea 0 de `/plan`),
  `git add`, `git commit`, `git push`, `git merge`, `git rebase`, `git stash`,
  y cualquier comando que descarte o esconda cambios.
- Antes de tocar cualquier componente, verificar (read-only) que su working tree
  está limpio. Si hay cambios sin commitear → **STOP** para ese componente:
  no los perdés ni los movés de rama; avisás y seguís con el resto.

---

## Step 1: State check (read-only) por componente

Para CADA componente afectado (o para la raíz en mono-repo):

```bash
git status --porcelain
git branch --show-current
```

- `status` NO está vacío → **STOP para ese componente**:
  > "`<componente>` tiene cambios sin commitear. No los toco. Commitearlos,
  > stashearlos o descartarlos es decisión tuya; volvé a correr `/prepare` cuando
  > el working tree esté limpio."
- `status` vacío y ya está en `BASE_BRANCH` → pasar directo al pull (Step 2).
- `status` vacío y está en otra rama → checkout de la base y luego pull (Step 2).

---

## Step 2: Checkout + pull

En mono-repo (desde la raíz):

```bash
git checkout <BASE_BRANCH>
git pull
```

En multi-repo, por cada componente:

```bash
git -C <componente> checkout <BASE_BRANCH>
git -C <componente> pull
```

- Si el pull no es fast-forward (pide merge o rebase) → **detenerse** y reportar:
  el repo tiene divergencia local que requiere decisión humana, no la resuelvas.
- Si el checkout falla porque hay archivos sin commitear → reportar; no forzar
  (`git checkout` no los pierde, pero la causa ya se detectó en el Step 1).

---

## Step 3: Report and hand off

1. Mostrar por componente: rama anterior → `BASE_BRANCH`, resultado del pull
   (up-to-date / fast-forward), y estado del working tree.
2. Cerrar:
   > "Base preparada: <componentes> en `<BASE_BRANCH>` actualizado. Ahora podés
   > correr `/clarify hu-<number>` (si hace falta) y `/scan hu-<number>`."
3. Stop — no clarificar ni escanear.

---

## Common Issues

| Issue | Cause | Resolution |
|-------|-------|------------|
| Working tree sucio en un componente | Trabajo sin commitear | STOP para ese componente; no tocar — que el usuario resuelva y reintente |
| Pull pide merge/rebase | Divergencia local con el remoto | Detenerse y reportar; decisión humana |
| No se identifica el componente | Falta `context.md` o el usuario no dijo cuál | Preguntar explícitamente — no adivinar |
| `PREP_SKILL` en el perfil apunta a otra skill | El proyecto define su propia prep | Ejecutar la que el profile nombre; esta skill es el default |
| Rama base actual es la de trabajo | El usuario ya creó la rama y volvió a correr `/prepare` | Avisar que la base ya está preparada y que no se tocan ramas de trabajo |

---

## Example

**Input del usuario:**
> `/prepare hu-0009`

**Flujo:**
1. Historia `hu-0009`; `hu.md` menciona `apps/finances` y `apps/ledger`. Profile: `REPO_TOPOLOGY = mono-repo`, `BASE_BRANCH = develop`.
2. En la raíz: `git status --porcelain` → vacío; `git branch --show-current` → `feat/ledger-transfers`.
3. `git checkout develop` + `git pull` → up-to-date.
4. Reporta:
   > "Base preparada: admin-back en `develop` actualizado (estabas en `feat/ledger-transfers`). Ahora podés correr `/clarify hu-0009` (si hace falta) y `/scan hu-0009`."

**Input del usuario (con working tree sucio):**
> `/prepare hu-0009`

**Flujo:**
1. `git status --porcelain` → 3 archivos modificados.
2. STOP: "admin-back tiene cambios sin commitear. No los toco. Commitearlos, stashearlos o descartarlos es decisión tuya; volvé a correr `/prepare` cuando el working tree esté limpio."
