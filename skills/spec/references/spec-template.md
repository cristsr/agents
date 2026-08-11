# Spec Template

Produce exactly this structure. Replace all `<placeholders>` with real content.
Remove sections marked as optional if there is no content for them.

El artefacto es **agnóstico al tipo de trabajo**. Lo único que varía es el
**bloque de encuadre** (§ «Bloques de encuadre por tipo»); todo lo demás es común
a features, bugs, deuda técnica, incidentes y chores.

---

```markdown
---
tipo: <feat | bug | debt | incident | chore>
origen: <tracker:<clave> | audit:<referencia> | manual>
---

# <story-id>: <título>

<!-- Bloque de encuadre — elegir el que corresponde al tipo. Ver la sección
     «Bloques de encuadre por tipo» más abajo. Es UNO solo, nunca dos. -->

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
     edge case, contradiction). /spec only PLACES markers; /clarify resolves and
     removes them. No markers if the item is fully specified. -->

## Reglas de Negocio

<!-- OPTIONAL: Include only if the input explicitly provides business rules.
     Remove this section if not applicable. -->

- <regla de negocio tal como fue proporcionada>

## Fuera de Alcance

<!-- OPTIONAL: Include only if explicitly mentioned in the input.
     Remove this section if not applicable. -->

- <lo que explícitamente NO entra en este ítem>

## Hotfixes

<!-- OPTIONAL: A defect found AFTER /build already produced code, traced
     back to a missing/ambiguous AC. Omit entirely if /hotfix was never run. -->

- **HOTFIX-N (AC-N):** <qué estaba mal o faltaba en el AC> → <corrección aplicada al AC> — implementado en `plan.md` Tarea HOTFIX-N.
```

---

## Bloques de encuadre por tipo

El encuadre responde **por qué existe este ítem**. El pipeline aguas abajo no lo
lee — consume los ACs — pero es lo que permite que `/clarify` y `/design`
entiendan la intención sin forzar un molde ajeno.

### `feat` — funcionalidad nueva o cambio de comportamiento visible

```markdown
## Historia de Usuario

**Como** <rol del usuario>
**Quiero** <acción o funcionalidad>
**Para** <beneficio o valor de negocio>
```

### `bug` — defecto en algo ya entregado

```markdown
## Defecto

**Síntoma:** <qué se observa, en términos verificables>
**Reproducción:** <pasos mínimos, o el input que lo dispara>
**Esperado:** <qué debería ocurrir>
**Actual:** <qué ocurre en su lugar>
**Impacto:** <a quién/qué afecta y con qué severidad>
```

> Si el defecto nace de un AC ambiguo de un ítem **ya construido**, no abras un
> `bug` nuevo: usá `/hotfix` sobre el ítem original — corrige el AC y deja la
> traza en su sección `## Hotfixes`.

### `debt` — deuda técnica, refactor, mejora estructural

```markdown
## Deuda Técnica

**Situación actual:** <qué hay hoy y por qué es un problema>
**Riesgo o costo:** <qué se rompe, se frena o se encarece si sigue así>
**Estado deseado:** <cómo se ve resuelto, en términos verificables>
```

> Nunca inventar un «Como <mantenedor> / Quiero» para encajar deuda técnica en el
> molde de historia de usuario. Este bloque existe exactamente para eso.

### `incident` — falla en ejecución que requiere remediación

```markdown
## Incidente

**Impacto:** <qué se degradó o falló, alcance y duración>
**Detección:** <cómo se descubrió — alerta, reporte, revisión>
**Mitigación aplicada:** <qué se hizo para contenerlo, si aplica>
**Causa raíz:** <el porqué, o `[NEEDS CLARIFICATION: causa raíz sin determinar]`>
```

> Los ACs de un `incident` describen la **remediación permanente**, no la
> mitigación ya aplicada. Si la causa raíz todavía no se conoce, el marcador es
> obligatorio: sin causa raíz no hay AC verificable que escribir.

### `chore` — mantenimiento sin cambio de comportamiento

```markdown
## Mantenimiento

**Motivación:** <por qué hay que hacerlo ahora>
**Alcance:** <qué se toca y qué explícitamente no>
```

> El AC de un `chore` casi siempre es «todo sigue funcionando igual»: nombrá los
> gates concretos (suite verde, build, lint) en vez de dejarlo implícito.

---

## Rules for each section

**`tipo`:** obligatorio. Si el input no lo dice, inferirlo del contenido y
**confirmarlo** con el usuario antes de escribir — el tipo determina el encuadre y
equivocarlo produce un artefacto que se contradice a sí mismo.

**`origen`:** de dónde viene el ítem. `tracker:<clave>` si vino de un export o
clave del tracker, `audit:<referencia>` si lo generó una auditoría (ej.
`/hexagonal-audit`), `manual` si nació en la conversación.

**Título:** depende del origen del ítem. Nunca derivarlo del contenido de los
ACs — sale del tracker o del usuario, en ese orden de prioridad:

| Origen | Regla | Largo |
|---|---|---|
| Viene de un tracker (PDF/export/clave del `TRACKER` del profile) | **Verbatim.** No parafrasear, no acortar, no "mejorar" | El que tenga — la traza al backlog manda sobre la brevedad |
| El usuario lo escribe al invocar `/spec` | Usar exactamente lo que escribió | El que haya escrito |
| Nace en el proyecto y el usuario no dio título | Proponer uno y **confirmarlo** antes de escribir | 5-8 palabras |

La regla de 5-8 palabras aplica **solo al último caso** — es una guía para redactar
un título nuevo, no un límite que recorte un título existente.

**AC titles:** Short label for the criterion. Derive from its main concept.
Example: "AC-1: Solo administradores pueden eliminar" not "AC-1: Criterio 1"

**AC body:** Copy the original text exactly. Do not rewrite or summarize.

**ACs son obligatorios en todos los tipos.** Es el único contrato con el resto del
pipeline: `/clarify`, `/design`, `/plan` y `/build` consumen ACs verificables y
nada más. Un ítem sin ACs no puede avanzar, sea del tipo que sea.

**Reglas de Negocio:** Copy each rule exactly as provided — do not infer or add
rules not present in the input. Omit the section entirely if none were given.

**Hotfixes:** Never written by `/spec` itself — only `/hotfix` appends to this
section, after correcting/adding an AC for a defect found in already-built code.
