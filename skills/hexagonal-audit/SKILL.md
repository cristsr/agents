---
name: hexagonal-audit
description: >
  Audits an existing codebase against the hexagonal rules (dependency direction,
  layer topology, ports & bindings, error handling) and produces a ranked
  findings report — then bridges into the SDD pipeline by generating draft
  hu.md stories (work/active/<story-id>/hu.md) whose ACs derive from the HIGH
  and MEDIUM findings, ready for /clarify → /scan → /plan → /build. Read-only:
  never edits code unless the user asks for the fixes to be applied. Use when
  the user says "audita el proyecto", "revisa la arquitectura", "auditalo",
  "detectar mejoras de arquitectura", "esto respeta hexagonal", or wants to turn
  architecture debt into backlog stories. Do NOT use to build modules (use
  /hexagonal-architecture), to read the codebase for a user story (use /scan),
  or for C4 diagrams of the whole system (use /architecture).
metadata:
  author: styve
  version: "1.0"
  tags: [hexagonal, audit, ports-adapters, debt, backlog]
  category: architecture
---

# Hexagonal Audit — AUDIT Mode

**Announce at start:** "Voy a auditar la arquitectura contra las reglas. Arranco mapeando el terreno."

**Output:**
- Un reporte de hallazgos rankeados (HIGH/MEDIUM/LOW), en el idioma del usuario.
- Uno o más borradores `work/active/<story-id>/hu.md` derivados de los hallazgos,
  para que el fix entre al pipeline SDD (ver Step 4).
- **Never edit code in AUDIT mode** unless the user asks for the fixes to be applied.

---

## Perfil del proyecto (leer primero, siempre)

Antes de cualquier otra cosa, leé `.agents/profile.md` (en la raíz del proyecto actual):
define `OUTPUT_LANGUAGE`, `STORY_ID_MODE`/`STORY_ID_PATTERN` (para los `hu.md`
generados), `WORKDIR_ACTIVE`, el stack (sección 7) y `STACK_REFS` (templates y
detectores por stack). Si no existe, avisá que lo creen desde la plantilla y detené.

**CRITICAL — Directorio de trabajo:** antes de ejecutar cualquier cosa, verificá que estás en el directorio de trabajo del proyecto (`WORKING_DIRECTORY` del profile — ruta absoluta). Si `pwd` no coincide con `WORKING_DIRECTORY`, `cd` a ese directorio antes de continuar.

**Los literales de este documento son solo un ejemplo de resolución.** Los valores
reales salen del profile — si difieren, mandan los del perfil:

| En este documento | Clave en profile.md |
|---|---|
| `sm-<number>` | `STORY_ID_PATTERN` |
| `work/active/sm-<number>/` | `WORKDIR_ACTIVE` |
| «microservicio» en la prosa | `COMPONENT_TERM` (sección 7) |
| stack / convenciones | sección 7 + `<STACK_REFS>` (pack por stack) |

---

## Procedure

Seguir `references/audit-guide.md` — el procedimiento completo (mapear el terreno,
scorizar las 13 dimensiones, escribir findings, reglas del auditor). Resumen:

1. **Map the terrain** (read-only): inventario de módulos y capas; si el pack del
   stack provee un detector (ej. TS/NestJS: `<STACK_REFS>/architecture/audit-scan.sh <src>`),
   correrlo; si no, mapear con `find`/grep del lenguaje. Cada hit es un lead, no un
   hallazgo — leer el archivo antes de reportar.
2. **Score 0–3 por dimensión** (13 dimensiones, total /39). Todo lo que baje de 2
   es hallazgo. Cargar las reglas desde `../hexagonal-architecture/references/rules.md`
   (fuente única) para dimensionar contra el layout canónico.
3. **Write findings** rankeados por severidad, cada uno con `file:line`, la regla
   rota, el costo concreto y el fix más chico. Cerrar con el plan priorizado 3–5.
4. **Bridge al pipeline — generar `hu.md`** (Step 4 abajo).

## Step 4: Bridge al pipeline (generar historias)

Con el reporte final, convertir los hallazgos en trabajo del pipeline SDD:

1. **Una historia por módulo auditado** (o por cluster de hallazgos si el módulo
   tiene pocos): crear `work/active/<story-id>/hu.md` con la estructura del template
   de `/hu` (`../hu/references/hu-template.md`).
2. **El ID** se resuelve con `STORY_ID_MODE` del profile (sequential → siguiente
   número libre; name → slug; tracker-code → pedir la clave).
3. **Cada hallazgo HIGH/MEDIUM → un AC verificable**, redactado como comportamiento
   esperado del sistema (ej. "El controller X no debe contener lógica de negocio" /
   "El dominio no debe importar el framework"). Los LOW van como checklist de
   higiene en el cuerpo de la historia, no como ACs.
4. Cada `hu.md` lleva una sección `## Contexto de auditoría` con la referencia al
   reporte completo (`docs/audits/<fecha>-<alcance>.md` — guardar el reporte ahí).
5. Reportar y sugerir el siguiente paso: `/clarify <id>` (recomendado) o `/scan <id>`.

CRITICAL: No resolver los hallazgos en el código — el AUDIT genera historias; los
fixes se construyen con `/plan` + `/build` como cualquier otra.

---

## Common Issues

| Issue | Cause | Resolution |
|-------|-------|------------|
| El detector del pack no corre (sin bash / otro lenguaje) | Pack sin script para el stack | Mapear manualmente con find/grep del lenguaje; los detalladores por stack van en `audit-smells.md` del pack |
| `work/active/` no existe | Pipeline nunca iniciado en el repo | Crearla (los borradores de hu.md la requieren) y confirmar `WORKDIR_ACTIVE` del profile |
| Hallazgos demasiado numerosos | Reporte sin priorizar | Solo HIGH/MEDIUM generan ACs; LOW quedan como checklist |
| El usuario quiere que apliques los fixes | Confusión de modo | Es trabajo de historias: generar los `hu.md` y que pasen por `/plan` + `/build` — AUDIT nunca edita código |
| El `hu.md` generado no sigue la plantilla | Formato inconsistente | Consultar `../hu/references/hu-template.md` y el `STORY_ID_MODE` del profile |

---

## CRITICAL: Output Language

Reportes, hallazgos y explicaciones en el idioma del usuario (`OUTPUT_LANGUAGE`).
Código, paths, nombres de reglas y severidades en inglés.
