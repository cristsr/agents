---
name: hu
description: >
  Structures a raw user story into a well-formed hu.md and saves it to
  work/active/sm-<number>/hu.md. Use when the user says "/hu", "nueva historia",
  "crear historia", "estructurar historia", "registrar hu", provides a story
  number like "sm-XXXX", pastes raw user story text, or provides a path to a
  Jira PDF export file. Do NOT use for scanning (use /scan), designing (use
  /design), planning (use /plan), or executing (use /build).
---

# hu

## Overview

Receive a raw user story (text or Jira PDF export), structure it using the hu
template, and save it to `work/active/sm-<number>/hu.md` — ready for `/scan`.

**Announce at start:** "Estructurando historia sm-<number>."

**Output:** `work/active/sm-<number>/hu.md`

---

## Perfil del proyecto (leer primero, siempre)

Antes de cualquier otra cosa, leé `.agents/profile.md` (en la raíz del proyecto actual): define el patrón de ID
de historia, el intake, las rutas de artefactos y el idioma de salida de este
proyecto. Si no existe, avisá al usuario que lo cree copiando `~/.agents/sdd-profile.template.md` a `.agents/profile.md` del proyecto, y detené: sin perfil no conocés las convenciones de este proyecto.

**Los literales de este documento son solo un ejemplo de resolución** (el perfil de Smart Mobility).
Los valores reales salen del `profile.md` del proyecto en el que estés trabajando — si difieren, mandan los del perfil:

| En este documento | Clave en profile.md |
|---|---|
| `sm-<number>` | `STORY_ID_PATTERN` |
| `SM-XXXX`, formato del PDF de Jira | sección 2-3 (intake) |
| `work/active/sm-<number>/` | `WORKDIR_ACTIVE` |
| salida en español | `OUTPUT_LANGUAGE` |

---

## CRITICAL: Collect inputs before writing anything

Two modes are supported. Detect automatically which one applies.

---

### Mode A — PDF file path

**Trigger:** The user provides a file path (ends in `.pdf`, contains `\` or `/`,
or looks like a file reference).

**Step 1 — Read the file:**
Use the `Read` tool on the provided path. The PDF contains two pages typical
of a Jira export.

**Step 2 — Extract fields from the PDF:**

| hu.md field | Where to find it in the PDF |
|---|---|
| Número | `[SM-XXXX]` in the page title / main heading |
| Título | Text after `[SM-XXXX]` in the main heading |
| Como / Quiero / Para | `YO COMO:` / `QUIERO:` / `PARA:` in "Descripción HU/PBI" field, OR the `OBJETIVO` section (3 lines: Como…, Quiero…, Para…) |
| Criterios de Aceptación | `CRITERIOS DE ACEPTACIÓN` section (numbered list) |
| Reglas de Negocio | `REGLAS DE NEGOCIO` section — map to a `## Reglas de Negocio` block in hu.md |
| Observaciones adicionales | `OBSERVACIONES ADICIONALES:` field — append to notes if non-empty |
| Comentarios relevantes | `Comentarios` section — include only if they refine requirements (skip generic status updates) |

**Step 3 — Confirm extracted values (brief, inline):**
Show a one-line summary: "Extraído: SM-XXXX · <título> · <N> ACs · <M> reglas."
Then proceed directly — do NOT ask the user to re-paste anything already in the PDF.

---

### Mode B — Manual text input

**Trigger:** The user pastes raw story text or provides no file path.

Collect these three inputs. Ask for any that are missing — one question at a time.

**Input 1 — Número**
Look for `sm-XXXX` or a plain number in the user input.
If not found, ask: "¿Cuál es el número de la historia? (ej: 1933)"

**Input 2 — Título**
The exact name of the story as it appears in Jira.
If not provided, ask: "¿Cuál es el título exacto de la historia en Jira?"
Do NOT derive the title from the story content — use only what the user provides.

**Input 3 — Contenido**
The raw story text: Como / Quiero / Para + acceptance criteria.
If not provided, ask: "¿Cuál es el contenido de la historia
(criterios de aceptación incluidos)?"

---

## CRITICAL: Check for existing file

Before writing, check if `work/active/sm-<number>/hu.md` already exists:

```bash
[ -f work/active/sm-<number>/hu.md ] && echo "EXISTS" || echo "NEW"
```

- If it does NOT exist → create the directory silently and continue:
  ```bash
  mkdir -p work/active/sm-<number>/
  ```
- If it DOES exist → use `AskUserQuestion` with `question: "Ya existe
  work/active/sm-<number>/hu.md. ¿Querés sobreescribirla?"`, `header: "Sobrescribir"`,
  and options `"Sí, sobreescribir"` / `"No, cancelar"`.
  Wait for confirmation before continuing.

---

## Processing Rules

### What to preserve
- Every acceptance criterion — do not omit, summarize, or merge any AC.
- The exact wording of Como / Quiero / Para — do not paraphrase.
- All business rules, edge cases, and error messages mentioned.

### What to add
- The title as provided by the user — use it verbatim.
- Structured AC headings derived from the criterion content.
- Out of scope section — only if explicitly mentioned in the input.

### What NOT to invent
- Do not add acceptance criteria not present in the input.
- Do not add technical notes — use `/clarify` for that after saving.
- Do not add out-of-scope items unless explicitly stated.
- Do not change the meaning or intent of any requirement.

### Flag gaps with `[NEEDS CLARIFICATION]` markers (do NOT resolve them here)

Structuring the story is NOT the same as inventing missing detail. When the
input is **silent or ambiguous** about something that matters — but you have no
basis to fill it — insert an explicit marker instead of guessing:

```
[NEEDS CLARIFICATION: <pregunta concreta>]
```

Place the marker inline, right where the gap is (inside the relevant AC, or as a
trailing line under it). This mirrors the industry standard (Spec Kit): the
marker prevents the common LLM failure of assuming something plausible but wrong.

Insert a marker when the input is silent about any of these **and** the answer
would change the implementation:
- HTTP response code / output shape for a described behavior
- Behavior on invalid, empty, or missing input
- A business term used without a definition (e.g. "activo", "vigente", "elegible")
- A boundary/edge case implied by the story but never stated
- A contradiction between two ACs

**Do NOT resolve the markers in `/hu`** — that is `/clarify`'s job. Just place
them. If the input is fully specified, add no markers. Never use a marker as an
excuse to skip preserving what the input DID say.

### AC structure
Number each criterion. Add a short title derived from its main concept.
Keep the original text as-is under each heading.

---

## Output Format

Consult `references/hu-template.md` for the exact file structure to produce.

---

## Save and hand off

After saving `work/active/sm-<number>/hu.md`:

1. Show a brief summary:
   - Número de historia
   - Título
   - Cantidad de ACs estructurados
   - Cantidad de marcadores `[NEEDS CLARIFICATION]` insertados (si hay)

2. Say, depending on whether markers were inserted:
   - **Con marcadores:** "Historia guardada en `work/active/sm-<number>/hu.md`
     con <N> marcadores `[NEEDS CLARIFICATION]`. Ejecutá `/clarify sm-<number>`
     para resolverlos antes de seguir — `/design` no avanza mientras queden
     marcadores sin resolver."
   - **Sin marcadores:** "Historia guardada en `work/active/sm-<number>/hu.md`.
     Revisala y cuando estés listo ejecutá `/clarify sm-<number>` (recomendado,
     detecta ambigüedades antes del scan) o directamente `/scan sm-<number>` si
     la historia es simple."

3. Stop — do not start scanning.

---

## CRITICAL: Output Language

All hu.md content in Spanish. Exception: microservice names, file paths,
technical identifiers, and code always in English.

---

## Common Issues

| Issue | Cause | Resolution |
|-------|-------|------------|
| Título no proporcionado | Usuario pegó solo el contenido | Preguntar explícitamente por el título de Jira |
| ACs sin numerar en el input | Historia mal formateada | Numerarlos en orden de aparición |
| Historia ya existe | Re-ejecución sobre historia activa | Confirmar sobreescritura antes de continuar |
| Número no identificable | Input sin formato sm-XXXX | Preguntar el número explícitamente |

---

## Example A — PDF file path

**Input del usuario:**
> `/hu "files/jira/[#SM-1154] Agua caliente - Crear y Exponer servicio para agendar.pdf"`

**Proceso:**
1. Detectar ruta de archivo → Mode A.
2. `Read` el PDF → extraer:
   - Número: `1154` (de `[SM-1154]` en el encabezado)
   - Título: `Agua caliente - Crear y Exponer servicio para agendar`
   - Como/Quiero/Para: sección OBJETIVO (`Como administrador / Quiero que el sistema permita realizar el agendamiento / Para agua caliente y sus diferentes servicios`)
   - ACs: sección `CRITERIOS DE ACEPTACIÓN` (9 ítems numerados)
   - Reglas de Negocio: sección `REGLAS DE NEGOCIO` (tabla + lista)
3. Mostrar: "Extraído: SM-1154 · Agua caliente - Crear y Exponer servicio para agendar · 9 ACs · 2 reglas de negocio."
4. Verificar si existe `work/active/sm-1154/hu.md` → crear directorio.
5. Aplicar template de `references/hu-template.md`.

---

## Example B — Texto manual

**Input del usuario:**
> "/hu sm-1933 — Filtrar zonas por tipo de servicio
> Como operador quiero filtrar zonas por tipo de servicio para ver solo las relevantes.
> AC-1: El filtro acepta uno o varios tipos. AC-2: Si no hay resultados, retorna lista vacía."

**Proceso:**
1. Número: `1933` ✓  Título: `Filtrar zonas por tipo de servicio` ✓  Contenido: presente ✓
2. Verificar si existe `work/active/sm-1933/hu.md` → no existe → crear directorio.
3. Aplicar template de `references/hu-template.md`.

**hu.md resultante (fragmento):**
```markdown
# sm-1933: Filtrar zonas por tipo de servicio

## Historia de Usuario

**Como** operador
**Quiero** filtrar zonas por tipo de servicio
**Para** ver solo las relevantes

## Criterios de Aceptación

### AC-1: Filtro por uno o varios tipos
El filtro acepta uno o varios tipos de servicio.

### AC-2: Sin resultados retorna lista vacía
Si no hay resultados, retorna lista vacía.
```

**Salida al usuario:**
> Historia guardada en `work/active/sm-1933/hu.md`. Revisala y cuando estés listo ejecutá `/scan sm-1933`.
