# HU Template

Produce exactly this structure. Replace all `<placeholders>` with real content.
Remove sections marked as optional if there is no content for them.

---

```markdown
# sm-<number>: <título conciso de 5-8 palabras>

## Historia de Usuario

**Como** <rol del usuario>
**Quiero** <acción o funcionalidad>
**Para** <beneficio o valor de negocio>

## Criterios de Aceptación

### AC-1: <título derivado del contenido>

<texto exacto del criterio tal como fue proporcionado>

### AC-2: <título derivado del contenido>

<texto exacto del criterio tal como fue proporcionado>
[NEEDS CLARIFICATION: <pregunta concreta si el AC es ambiguo o silencioso>]

<!-- Repeat for each AC. Do not omit any.
     Insert [NEEDS CLARIFICATION: ...] markers inline where the input is silent
     or ambiguous about something that changes the implementation (response
     code, behavior on invalid/empty input, undefined business term, implied
     edge case, contradiction). /hu only PLACES markers; /clarify resolves and
     removes them. No markers if the story is fully specified. -->

## Reglas de Negocio

<!-- OPTIONAL: Include only if the input explicitly provides business rules
     (e.g. a "REGLAS DE NEGOCIO" section in the Jira PDF, or rules stated in
     manual text input). Remove this section if not applicable. -->

- <regla de negocio tal como fue proporcionada>

## Fuera de Alcance

<!-- OPTIONAL: Include only if explicitly mentioned in the input.
     Remove this section if not applicable. -->

- <lo que explícitamente NO entra en esta historia>

## Hotfixes

<!-- OPTIONAL: A defect found AFTER /build already produced code, traced
     back to a missing/ambiguous AC. Omit entirely if /hotfix was never run
     for this story. -->

- **HOTFIX-N (AC-N):** <qué estaba mal o faltaba en el AC> → <corrección aplicada al AC> — implementado en `plan.md` Tarea HOTFIX-N.

```

---

## Rules for each section

**Título:** Use exactly what the user provided — do not derive or paraphrase.
It comes from Jira or the backlog and is a required input.

**AC titles:** Short label for the criterion. Derive from its main concept.
Example: "AC-1: Solo administradores pueden eliminar" not "AC-1: Criterio 1"

**AC body:** Copy the original text exactly. Do not rewrite or summarize.

**Reglas de Negocio:** Copy each rule exactly as provided — do not infer or add
rules not present in the input. Omit the section entirely if none were given.

**Hotfixes:** Never written by `/hu` itself — only `/hotfix` appends to this
section, after correcting/adding an AC for a defect found in already-built code.
