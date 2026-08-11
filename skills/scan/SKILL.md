---
name: scan
description: >
  Refreshes an item's context.md — re-surveys the affected components and
  rewrites the inventory — without touching spec.md or re-resolving any
  ambiguity. Use when the user says "/scan sm-XXX", "refrescar el contexto",
  "regenerar context.md", "el código cambió desde que clarifiqué", "volvé a
  relevar el módulo", or when a long-running item needs its inventory brought
  up to date before /design or /plan. Do NOT use as the pipeline's survey
  step — /clarify already produces context.md along with the precise spec.md.
  Do NOT use to resolve ambiguities or edit ACs (use /clarify or /refine), to
  design (use /design), or to plan (use /plan).
---

# scan

## Overview

Skill de **refresco**, no un paso del pipeline. Vuelve a relevar los componentes
afectados y reescribe `work/active/sm-<number>/context.md` con el inventario
actualizado.

`/clarify` ya produce `context.md` en su fase I, junto con el `spec.md` preciso.
`/scan` existe para el caso en que **el código cambió y los ACs no**: un ítem que
quedó abierto varios días, una rama base que avanzó, un módulo que se refactorizó
mientras tanto.

**Nunca toca `spec.md`.** No resuelve ambigüedades, no edita ACs, no pregunta por
restricciones. Si lo que cambió es el ítem y no el código, la skill correcta es
`/clarify` (o `/refine` si ya hay diseño).

**Announce at start:** "Refrescando el contexto de sm-<number>."

**Output:** `work/active/sm-<number>/context.md` (regenerado)

---

## Perfil del proyecto (leer primero, siempre)

Antes de cualquier otra cosa, leé `.agents/profile.md` (en la raíz del proyecto actual): define el patrón de ID,
las rutas de artefactos, el **stack objetivo** y los **paths de documentación**. Todo
lo que esta skill busca en el código sale de la sección 7. Si no existe, avisá al usuario que lo cree copiando `~/.agents/sdd-profile.template.md` a `.agents/profile.md` del proyecto, y detené: sin perfil no conocés las convenciones de este proyecto.

**CRITICAL — Directorio de trabajo:** antes de ejecutar cualquier cosa, verificá que estás en el directorio de trabajo del proyecto (`WORKING_DIRECTORY` del profile — ruta absoluta). Si `pwd` no coincide con `WORKING_DIRECTORY`, `cd` a ese directorio antes de continuar.

| En este documento | Clave en profile.md |
|---|---|
| `sm-<number>` | `STORY_ID_PATTERN` |
| `work/active/sm-<number>/` | `WORKDIR_ACTIVE` |
| «componente» en la prosa | `COMPONENT_TERM` |
| `develop` | `BASE_BRANCH` |
| catálogo de componentes, docs por componente | `DOCS_COMPONENTS_INDEX`, `DOCS_COMPONENT_README`, `DOCS_COMPONENT_ARCH` |
| grafo indexado + `codegraph_explore` | `CODEGRAPH` (sección 10) |
| subagente `code-explorer` | `EXPLORER_SUBAGENT` / `EXPLORER_MODEL` (sección 9) |

---

## Step 1 — Prerequisites

Extraer `sm-<number>` del input. Si no viene, preguntar: "¿Qué ítem querés refrescar?"

```bash
[ -f work/active/sm-<number>/spec.md ] && echo "OK" || echo "MISSING"
[ -f work/active/sm-<number>/context.md ] && echo "CTX OK" || echo "CTX MISSING"
```

- Si falta `spec.md` → STOP: "No encontré el ítem. Ejecutá `/spec sm-<number>` primero."
  (Ítems legados: `hu.md` cuenta como `spec.md`.)
- Si **no existe** `context.md` → avisar y redirigir: "Este ítem todavía no fue
  clarificado. Corré `/clarify sm-<number>` — produce el `context.md` junto con el
  `spec.md` preciso. `/scan` solo refresca uno que ya existe."

## Step 2 — Determine what to survey

1. Leer `spec.md` (ACs y encuadre) y el `context.md` vigente.
2. Los componentes a relevar salen del `context.md` actual. Si el ítem cambió de
   alcance desde entonces, re-derivarlos del `DOCS_COMPONENTS_INDEX` contra el
   contenido del `spec.md`, y avisar cuáles se agregan o se van.
3. Verificar (read-only, nunca mutar git) que cada componente esté sobre base fresca:

```bash
git -C <component> branch --show-current
git -C <component> status --porcelain
git -C <component> fetch --dry-run 2>&1 | head -1
```

Si alguno no está en `BASE_BRANCH`, tiene cambios sin commitear, o está detrás →
advertir y continuar: se releva lo que esté checked out.

## Step 3 — Survey (parallel)

Una llamada `codegraph_explore` **por componente**, todas en la misma respuesta, con
el nombre del módulo y las keywords del ítem. Devuelve símbolos con fuente verbatim,
call paths, blast radius y rutas de framework.

Con los resultados:
1. Identificar los archivos clave y leer **solo esos** con Read, aplicando progressive
   disclosure de `<STACK_REFS>/references/scan-guide.md` (default:
   `references/scan-guide.md` local) — no explorar el árbol completo.
2. Revisar `DOCS_COMPONENT_README` / `DOCS_COMPONENT_ARCH` y anotar gaps de doc.

> **Alcance:** esto es un inventario, no una investigación de ambigüedades. No se
> consultan precedentes por unknown — eso es de `/clarify`, que sí toma decisiones.

### Fallback — CodeGraph no disponible

Si `CODEGRAPH` es `no` o no existe `.codegraph/`: sugerir `codegraph init` (una vez,
barato) y mientras tanto delegar al subagente `EXPLORER_SUBAGENT` (default
`code-explorer`), una llamada por componente **en paralelo**, con `model:` =
`EXPLORER_MODEL` explícito. Si el agente anfitrión no soporta subagentes, explorar
inline con Read/Grep/Glob.

Si el subagente reporta que no encontró el módulo → preguntar:
> "¿Sabés dónde está el módulo relacionado en `<component>`? Podés darme el path o keywords."

## Step 4 — Rewrite context.md

Volcar el inventario en `<STACK_REFS>/references/context-template.md` (default:
`references/context-template.md` local) y sobrescribir
`work/active/sm-<number>/context.md`.

Conservar del `context.md` anterior cualquier nota que no provenga del código
(observaciones agregadas a mano). Todo lo relevado se reemplaza.

Incluir siempre la sección de **gaps detectados**.

## Step 5 — Report the delta

Lo valioso de un refresco es **qué cambió**, no el inventario entero:

```
Contexto de sm-<number> refrescado — <C> componente(s).

Cambios desde el relevamiento anterior:
  + <símbolo/archivo nuevo>
  ~ <firma o campo que cambió>
  − <lo que ya no está>

Gaps: <g>  ·  Sin cambios en: <lista corta>
```

Si nada cambió, decirlo en una línea: "Sin cambios respecto del contexto anterior."

Si algo de lo que cambió **contradice una decisión** registrada en `## Resolución de
Ambigüedades` del `spec.md` (ej. desapareció el precedente que fundamentó una
decisión), señalarlo explícitamente y sugerir `/clarify` o `/refine`. No corregirlo
acá — `/scan` no decide.

Stop — no iniciar el diseño.

---

## Common Issues

| Issue | Cause | Resolution |
|-------|-------|------------|
| `context.md` no existe | El ítem no fue clarificado | Redirigir a `/clarify sm-<number>`, que lo produce |
| `spec.md` no existe | `/spec` no ejecutado | STOP: ejecutar `/spec sm-<number>` primero |
| El ítem cambió de alcance | Se agregaron ACs desde el último relevamiento | Re-derivar componentes del `spec.md` y avisar el cambio |
| Módulo no encontrado | Módulo nuevo o renombrado | Registrar como gap en `context.md`; no bloquear |
| El refresco contradice una decisión ya tomada | El código cambió bajo los pies del ítem | Señalarlo y sugerir `/clarify`; `/scan` nunca edita `spec.md` |
| Componente fuera de `BASE_BRANCH` | Base no preparada | Advertir y continuar; sugerir `/prepare` |
