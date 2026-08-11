---
name: spec
description: >
  Structures any raw unit of work — feature, bug, technical debt, incident or
  chore — into a well-formed spec.md and saves it to
  work/active/<story-id>/spec.md, ready for /clarify. Picks the framing block
  that matches the item type instead of forcing everything into a user story.
  Use when the user says "/spec", "nueva historia", "crear historia",
  "estructurar historia", "nuevo bug", "registrar un defecto", "nueva deuda
  técnica", "registrar incidente", "nueva tarea", provides an item id like
  "spec-XXXX", pastes raw story/bug/debt text, or provides a path to a tracker
  PDF export. Do NOT use for surveying the codebase (use /clarify), designing (use /design),
  planning (use /plan), or executing (use /build). For a defect in
  already-built code that traces back to an ambiguous AC, use /hotfix on the
  original item instead of opening a new one.
---

# spec

## Overview

Receive a raw unit of work (text or tracker export), classify it, structure it
with the spec template, and save it to `work/active/<story-id>/spec.md` — ready
for `/clarify`.

El pipeline es **agnóstico al tipo de trabajo**: `/clarify`, `/design`, `/plan` y
`/build` consumen **criterios de aceptación verificables**, no el molde narrativo.
Por eso el tipo solo decide el **bloque de encuadre**, y todo lo demás del
artefacto es idéntico para una feature, un bug o una deuda técnica.

**Announce at start:** "Estructurando <story-id> (<tipo>)."

**Output:** `work/active/<story-id>/spec.md`

---

## Perfil del proyecto (leer primero, siempre)

Antes de cualquier otra cosa, leé `.agents/profile.md` (en la raíz del proyecto actual): define el patrón de ID,
el intake, las rutas de artefactos, los tipos de ítem y el idioma de salida de este
proyecto. Si no existe, avisá al usuario que lo cree copiando `~/.agents/sdd-profile.template.md` a `.agents/profile.md` del proyecto, y detené: sin perfil no conocés las convenciones de este proyecto.

**CRITICAL — Directorio de trabajo:** antes de ejecutar cualquier cosa, verificá que estás en el directorio de trabajo del proyecto (`WORKING_DIRECTORY` del profile — ruta absoluta). Si `pwd` no coincide con `WORKING_DIRECTORY`, `cd` a ese directorio antes de continuar.

**Los literales de este documento son solo un ejemplo de resolución.**
Los valores reales salen del `profile.md` del proyecto en el que estés trabajando — si difieren, mandan los del perfil:

| En este documento | Clave en profile.md |
|---|---|
| `<story-id>`, `spec-<number>` | `STORY_ID_PATTERN` |
| formato del export del tracker | sección 2-3 (intake) |
| modo de ID (siguiente libre / slug / clave tracker) | `STORY_ID_MODE` (sección 2) |
| `work/active/<story-id>/` | `WORKDIR_ACTIVE` |
| tipos disponibles (`feat`, `bug`, `debt`, `incident`, `chore`) | `ITEM_TYPES` (sección 2) |
| prefijos antiguos aún legibles (ej. `hu-`) | `STORY_ID_LEGACY_PREFIXES` |
| salida en español | `OUTPUT_LANGUAGE` |

---

## CRITICAL: Collect inputs before writing anything

Two modes are supported. Detect automatically which one applies.

---

### Mode A — Tracker export file path

**Trigger:** The user provides a file path (ends in `.pdf`, contains `\` or `/`,
or looks like a file reference).

**Step 1 — Read the file:**
Use the `Read` tool on the provided path.

**Step 2 — Extract fields, mapping per the profile's intake table (section 3):**

| spec.md field | Where to find it in a typical Jira export |
|---|---|
| ID / clave | `[SM-XXXX]` in the page title / main heading |
| Título | Text after `[SM-XXXX]` in the main heading |
| Encuadre (Como/Quiero/Para o equivalente) | `YO COMO:` / `QUIERO:` / `PARA:`, OR the `OBJETIVO` section |
| Criterios de Aceptación | `CRITERIOS DE ACEPTACIÓN` section (numbered list) |
| Reglas de Negocio | `REGLAS DE NEGOCIO` section |
| Observaciones adicionales | `OBSERVACIONES ADICIONALES:` — append to notes if non-empty |
| Comentarios relevantes | `Comentarios` — only if they refine requirements |

**Step 3 — Confirm extracted values (brief, inline):**
Show a one-line summary: "Extraído: <clave> · <título> · <tipo> · <N> ACs · <M> reglas."
Then proceed — do NOT ask the user to re-paste anything already in the export.

---

### Mode B — Manual text input

**Trigger:** The user pastes raw text or provides no file path.

Collect these inputs. Ask for any that are missing — one question at a time.

**Input 1 — Tipo**
Ver `## Classify the item` abajo. Se infiere y se confirma; no se pregunta a secas.

**Input 2 — Número / ID**
El modo de ID sale de `STORY_ID_MODE` (profile, sección 2):

- `sequential` (default): buscar un ID o número en el input. Si no viene,
  proponer el **siguiente número libre**: listar `work/active/` y `work/done/`,
  tomar el mayor `<n>` existente **incluyendo los prefijos legados**
  (`STORY_ID_LEGACY_PREFIXES`) y sumar 1. Anunciar:
  "Siguiente ID disponible: `<prefijo><n+1>`. ¿Lo uso?" (confirmar antes de escribir).
- `name`: el ID es un slug del título (`STORY_ID_PREFIX` + kebab-case del título).
- `tracker-code`: el ID es la clave del tracker (ej. `SM-1933`); la carpeta usa la
  clave en minúscula. Si no viene: "¿Cuál es la clave del ítem en <TRACKER>?"

> **La numeración es global, no por tipo.** `spec-0026` y `spec-0027` pueden ser
> una feature y un bug — el orden refleja cronología y nunca colisiona.

**Input 3 — Título**
Nunca derivarlo del contenido de los ACs. El origen define la regla:

- **Si el usuario dio un título** (en el input o como clave del `TRACKER`) → usarlo
  **verbatim**, sin parafrasear ni acortar. Un título largo del tracker se conserva
  entero: la traza al backlog manda sobre la brevedad.
- **Si no dio título y el ítem viene de un tracker** → preguntar:
  "¿Cuál es el título exacto del ítem en <TRACKER>?"
- **Si no dio título y el ítem nace en este proyecto** (caso habitual con
  `STORY_ID_MODE: sequential`) → **proponer** uno de 5-8 palabras derivado del
  objetivo y confirmarlo: "Propongo el título «<título>». ¿Lo uso o preferís otro?"

Ver la tabla de `references/spec-template.md` § «Rules for each section».

**Input 4 — Contenido**
El texto crudo: el encuadre (según tipo) + los criterios de aceptación.
Si no viene: "¿Cuál es el contenido del ítem (criterios de aceptación incluidos)?"

---

## Classify the item

El `tipo` determina el bloque de encuadre. **Inferirlo del contenido y confirmarlo**
antes de escribir — equivocarlo produce un artefacto que se contradice a sí mismo
(el caso clásico: una refactorización disfrazada de historia de usuario, con un
«Como mantenedor» inventado para llenar el molde).

| Señal en el input | Tipo |
|---|---|
| Funcionalidad nueva, "quiero poder…", cambio visible para un usuario | `feat` |
| "no funciona", "falla", "da error", esperado vs. actual, pasos de reproducción | `bug` |
| "refactor", "deuda", "está acoplado", "habría que reorganizar", hallazgo de auditoría | `debt` |
| Algo que ya falló en ejecución, con impacto y necesidad de remediación | `incident` |
| Actualizar dependencias, tooling, configuración, sin cambio de comportamiento | `chore` |

Confirmar con `AskUserQuestion` (`header: "Tipo"`) **solo si la inferencia no es
clara**, ofreciendo los 2-3 tipos candidatos con el inferido primero y
`" (Recomendado)"`. Si es evidente, anunciarlo en el arranque y seguir.

**Casos que no son un ítem nuevo:**
- Defecto en código **ya construido** que se origina en un AC ambiguo → `/hotfix`
  sobre el ítem original, no un `bug` nuevo. Redirigir y detener.
- Corrección de un artefacto que todavía no se construyó → `/refine`.

---

## CRITICAL: Check for existing file

Before writing, check if the item already exists:

```bash
[ -f work/active/<story-id>/spec.md ] && echo "EXISTS" || echo "NEW"
```

- If it does NOT exist → create the directory silently and continue:
  ```bash
  mkdir -p work/active/<story-id>/
  ```
- If it DOES exist → use `AskUserQuestion` with `question: "Ya existe
  work/active/<story-id>/spec.md. ¿Querés sobreescribirla?"`, `header: "Sobrescribir"`,
  and options `"Sí, sobreescribir"` / `"No, cancelar"`. Wait for confirmation.

> **Compatibilidad legado:** si en la carpeta hay un `hu.md` en vez de `spec.md`,
> es un ítem creado antes del renombre. Tratarlo como el mismo artefacto (leerlo,
> no duplicarlo) y avisar: "`<story-id>` usa el nombre legado `hu.md`."

---

## Processing Rules

### What to preserve
- Every acceptance criterion — do not omit, summarize, or merge any AC.
- The exact wording of the framing block — do not paraphrase.
- All business rules, edge cases, and error messages mentioned.

### What to add
- The title as provided by the user — use it verbatim.
- Structured AC headings derived from the criterion content.
- Out of scope section — only if explicitly mentioned in the input.

### What NOT to invent
- Do not add acceptance criteria not present in the input.
- Do not add technical notes — use `/clarify` for that after saving.
- Do not change the meaning or intent of any requirement.
- **Do not force a user-story framing onto an item that is not one.** Si es `debt`
  o `chore`, usar su bloque; inventar un «Como <rol>» es el error que este template
  existe para evitar.

### Flag gaps with `[NEEDS CLARIFICATION]` markers (do NOT resolve them here)

Structuring the item is NOT the same as inventing missing detail. When the input is
**silent or ambiguous** about something that matters — but you have no basis to
fill it — insert an explicit marker instead of guessing:

```
[NEEDS CLARIFICATION: <pregunta concreta>]
```

Place the marker inline, right where the gap is. This mirrors the industry standard
(Spec Kit): the marker prevents the common LLM failure of assuming something
plausible but wrong.

Insert a marker when the input is silent about any of these **and** the answer
would change the implementation:
- HTTP response code / output shape for a described behavior
- Behavior on invalid, empty, or missing input
- A business term used without a definition
- A boundary/edge case implied but never stated
- A contradiction between two ACs
- **`incident` sin causa raíz determinada** — obligatorio: sin causa raíz no hay AC
  verificable que escribir.

**Do NOT resolve the markers here** — that is `/clarify`'s job. Just place them.

### AC structure
Number each criterion. Add a short title derived from its main concept.
Keep the original text as-is under each heading.

**Los ACs son obligatorios en todos los tipos** — es el único contrato con el resto
del pipeline. Un ítem sin ACs no puede avanzar. Si el input no trae ninguno,
derivarlos del encuadre y marcarlos con `[NEEDS CLARIFICATION]` donde falte
precisión, nunca dejar la sección vacía.

---

## Output Format

Consult `references/spec-template.md` for the exact file structure to produce,
including the framing block that corresponds to the item's `tipo`.

---

## Save and hand off

After saving `work/active/<story-id>/spec.md`:

1. Show a brief summary: ID, tipo, título, cantidad de ACs, cantidad de marcadores
   `[NEEDS CLARIFICATION]` (si hay).

2. Say, depending on whether markers were inserted:
   - **Con marcadores:** "Guardado en `work/active/<story-id>/spec.md` con <N>
     marcadores `[NEEDS CLARIFICATION]`. Ejecutá `/clarify <story-id>` para
     resolverlos — `/design` no avanza mientras queden sin resolver. Podés correr
     `/prepare <story-id>` antes, para dejar la rama base fresca."
   - **Sin marcadores:** "Guardado en `work/active/<story-id>/spec.md`. Revisalo y
     cuando estés listo ejecutá `/prepare <story-id>` (deja la base fresca) y luego
     `/clarify <story-id>`."

3. Stop — do not start scanning.

---

## CRITICAL: Output Language

All spec.md content in Spanish. Exception: component names, file paths, technical
identifiers, and code always in English. Los valores del campo `tipo` (`feat`,
`bug`, `debt`, `incident`, `chore`) son identificadores — siempre en inglés.

---

## Common Issues

| Issue | Cause | Resolution |
|-------|-------|------------|
| Título no proporcionado | Usuario pegó solo el contenido | Si viene de un tracker, pedir el título exacto; si nace en el proyecto, proponer uno de 5-8 palabras y confirmarlo |
| Título del tracker muy largo | Ítem con nombre descriptivo en el backlog | Conservarlo verbatim — la regla de 5-8 palabras solo aplica a títulos nuevos |
| Tipo ambiguo entre `bug` y `debt` | El defecto es estructural, no de comportamiento | Si hay un síntoma observable hoy → `bug`; si es un riesgo latente → `debt` |
| Tipo ambiguo entre `bug` y `hotfix` | Defecto en código ya construido | Si traza a un AC ambiguo del ítem original → `/hotfix`; si es independiente → `bug` nuevo |
| `incident` sin causa raíz | Todavía en investigación | Marcador obligatorio; el ítem puede existir pero no avanza a `/design` sin causa raíz |
| ACs sin numerar en el input | Ítem mal formateado | Numerarlos en orden de aparición |
| El ítem ya existe | Re-ejecución | Confirmar sobreescritura antes de continuar |
| La carpeta tiene `hu.md`, no `spec.md` | Ítem anterior al renombre | Tratarlo como el mismo artefacto; avisar que usa el nombre legado |
| Número no identificable | Input sin ID | Resolver según `STORY_ID_MODE`: siguiente libre (sequential), slug del título (name) o clave del tracker (tracker-code) |

---

## Example A — Bug desde texto manual

**Input del usuario:**
> "/spec el balance suma dos veces las transferencias entre cuentas propias.
> Pasa desde que agregamos el proyector nuevo. Debería contarlas una sola vez."

**Proceso:**
1. Clasificar: hay síntoma observable + esperado vs. actual → `bug`. Evidente, se
   anuncia sin preguntar.
2. ID: `sequential` → mayor existente es `spec-0026` (incluyendo legados `hu-*`) →
   propone `spec-0027`.
3. Título: no lo dio y nace acá → propone "Doble conteo de transferencias en el balance".
4. Aplica `references/spec-template.md` con el bloque `## Defecto`.

**spec.md resultante (fragmento):**
```markdown
---
tipo: bug
origen: manual
---

# spec-0027: Doble conteo de transferencias en el balance

## Defecto

**Síntoma:** el balance suma dos veces las transferencias entre cuentas del mismo usuario.
**Reproducción:** registrar una transferencia entre dos cuentas propias y consultar el balance.
**Esperado:** la transferencia se cuenta una sola vez.
**Actual:** se cuenta dos veces.
**Impacto:** el balance mostrado es incorrecto para cualquier usuario con transferencias internas.
[NEEDS CLARIFICATION: ¿desde qué versión/proyector se introduce? ¿afecta al read model ya persistido?]

## Criterios de Aceptación

### AC-1: La transferencia interna se cuenta una vez
El balance de un usuario con transferencias entre cuentas propias refleja el monto una sola vez.
```

---

## Example B — Deuda técnica desde una auditoría

**Input:** `/hexagonal-audit` general ítem con un hallazgo HIGH.

**spec.md resultante (fragmento):**
```markdown
---
tipo: debt
origen: audit:hexagonal-2026-08-10#H3
---

# spec-0028: Puertos de lectura tipados para el read side

## Deuda Técnica

**Situación actual:** los casos de uso leen del `ReadModelStore` genérico y conocen
el esquema físico de las proyecciones (nombres de tabla, `snake_case`, nulabilidad).
**Riesgo o costo:** cualquier cambio de esquema rompe la capa de aplicación, y el
scope por usuario se resuelve en memoria en vez de en la base.
**Estado deseado:** cada caso de uso lee a través de un puerto tipado propio.

## Criterios de Aceptación

### AC-1: `application/` no conoce el read model
Ningún archivo bajo `apps/ledger/src/**/application/` importa el `ReadModelStore`.
```

Sin «Como mantenedor / Quiero», sin nota al pie disculpándose por no ser una
historia de producto.
