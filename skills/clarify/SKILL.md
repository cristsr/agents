---
name: clarify
description: >
  Turns a raw spec.md into a design-ready pair (spec.md + context.md) in three
  separated phases (Research → Plan → Implement): R gathers everything at once —
  ambiguities, authority sources, the affected module's inventory and code
  precedent via the code graph, plus the one thing only the developer knows; P
  decides every unknown with problem and terrain in full view, escalating only
  what no source can determine (scope, business intent, irreversible choices,
  rule conflicts); I writes the decision log, the precise ACs, and the context
  file. Use when the user says "/clarify sm-XXX", "clarificar historia",
  "resolver ambigüedades", "enriquecer historia", "analizar la historia",
  "escanear contexto", "relevar el módulo", or has created spec.md with /spec.
  Add "--ask" to force the legacy question-by-question mode. Do NOT use to
  refresh context.md alone after a code change (use /scan), to correct
  artifacts once design/plan exist (use /refine), or to create the item
  (use /spec).
---

# clarify

## Overview

Convierte un `spec.md` crudo en el par listo para diseñar — `spec.md` preciso +
`context.md` con el terreno relevado — resolviendo por su cuenta todo lo que tenga
respuesta determinable y consultando solo lo que es genuinamente del desarrollador.

Corre en **tres fases estrictamente separadas** (RPI). La separación no es
cosmética — cada fase necesita el resultado completo de la anterior:

| Fase | Hace | **No** hace |
|---|---|---|
| **R — Research** | Reúne toda la evidencia de una vez: ambigüedades, fuentes de autoridad, inventario del módulo, precedentes del código, y lo que solo el desarrollador sabe | No decide nada, no escribe nada |
| **P — Plan** | Decide **cada** unknown con el problema y el terreno a la vista, y escala en una sola tanda lo que ninguna fuente determina | No escribe nada en disco |
| **I — Implement** | Escribe el registro de decisiones, los ACs precisados, y `context.md` | No decide nada nuevo |

**Por qué una sola pasada de research:**
- Una decisión sobre un AC puede apoyarse en un puerto que el inventario acabó de
  encontrar. Separar el relevamiento de la decisión desperdicia esa evidencia.
- Las consultas al grafo — inventario y precedentes — se lanzan **en la misma tanda**,
  en paralelo.
- El presupuesto de escalamiento se aplica sobre la lista **completa** de unknowns:
  los que vienen de los ACs y los que vienen del código, juntos y priorizados una vez.
- Una restricción que el desarrollador menciona («no toques el contrato de X») llega
  **antes** de decidir, no después de haber escrito los archivos.

El principio: **una pregunta que el modelo puede responder con fundamento no es una
pregunta, es un trámite.** Si podés escribir el porqué, no preguntes — decidí y
dejá el porqué escrito.

**Announce at start:** "Clarificando sm-<number> — relevo, decido y te consulto solo lo que no puedo resolver."

**Output:**
- `work/active/sm-<number>/spec.md` (modificado in-place)
- `work/active/sm-<number>/context.md` (nuevo)

> **`/scan` sigue existiendo** como skill de refresco: regenera solo `context.md`
> cuando el código cambió, sin re-clarificar nada.

---

## Perfil del proyecto (leer primero, siempre)

Antes de cualquier otra cosa, leé `.agents/profile.md` (en la raíz del proyecto actual): define el patrón de ID,
las rutas de artefactos, el idioma de salida, el **stack objetivo** y los **paths de
documentación**. Todo lo que esta skill busca en el código sale de la sección 7. Si
no existe, avisá al usuario que lo cree copiando `~/.agents/sdd-profile.template.md` a `.agents/profile.md` del proyecto, y detené: sin perfil no conocés las convenciones de este proyecto.

**CRITICAL — Directorio de trabajo:** antes de ejecutar cualquier cosa, verificá que estás en el directorio de trabajo del proyecto (`WORKING_DIRECTORY` del profile — ruta absoluta). Si `pwd` no coincide con `WORKING_DIRECTORY`, `cd` a ese directorio antes de continuar.

**Los literales de este documento son solo un ejemplo de resolución.**
Los valores reales salen del `profile.md` del proyecto en el que estés trabajando — si difieren, mandan los del perfil:

| En este documento | Clave en profile.md |
|---|---|
| `sm-<number>` | `STORY_ID_PATTERN` |
| `work/active/sm-<number>/` | `WORKDIR_ACTIVE` |
| «componente» en la prosa | `COMPONENT_TERM` (sección 7) |
| `develop` | `BASE_BRANCH` |
| catálogo de componentes, docs por componente | `DOCS_COMPONENTS_INDEX`, `DOCS_COMPONENT_README`, `DOCS_COMPONENT_ARCH` (sección 8) |
| artefactos de código a ubicar (entidad, módulo, DTO, puerto) | sección 7 «Stack y arquitectura» + `<STACK_REFS>` |
| grafo indexado `.codegraph/` + tool `codegraph_explore` | `CODEGRAPH` (sección 10) |
| subagente `code-explorer` | `EXPLORER_SUBAGENT` / `EXPLORER_MODEL` (sección 9) |
| salida en español | `OUTPUT_LANGUAGE` |

---

## CRITICAL: Prerequisites

### Step 1 — Extract the item id and the mode

Extraer `sm-<number>` del input. Si no está presente, preguntar:
> "¿Para qué ítem? (ej: sm-1933)"

**Modo:** RPI autónomo por defecto. Si el input incluye `--ask`, correr en modo
interactivo legado (ver `## Legacy mode` al final).

### Step 2 — Verify spec.md exists

```bash
[ -f work/active/sm-<number>/spec.md ] && echo "OK" || echo "MISSING"
```

Si NO existe → STOP:
> "No encontré `work/active/sm-<number>/spec.md`. Ejecutá `/spec sm-<number>` primero."

> **Ítems legados:** si hay `hu.md` en vez de `spec.md`, es el mismo artefacto con
> su nombre anterior — trabajarlo en su lugar, sin renombrarlo.

### Step 3 — Read spec.md

Leer el archivo completo. Extraer y mantener en memoria:
- `tipo` del frontmatter (determina el bloque de encuadre y el tono de los ACs)
- Título y bloque de encuadre
- Lista de ACs completa, numerada
- Reglas de Negocio si existen
- **Marcadores `[NEEDS CLARIFICATION: ...]`** insertados por `/spec`

### Step 4 — Verify existing state

- Si ya existe `## Resolución de Ambigüedades` **y no quedan marcadores** y existe
  `context.md` → todo se completó antes. Anunciar y ofrecer `/scan` (refrescar
  contexto) o `/refine` (ajustar ACs) en lugar de re-correr.
- Si quedan marcadores → correr el ciclo RPI completo solo sobre los restantes,
  **agregando** entradas a la sección existente (no recrearla).
- Si `context.md` ya existe → se regenera al final; avisarlo en el cierre.

---

# PHASE R — Research

**Regla de la fase: recolectar evidencia. No decidir, no escribir.**

Si en algún momento sentís la tentación de resolver un unknown, anotá la evidencia y
seguí — la resolución es de la fase P, con todo a la vista.

### R1 — Build the complete list of unknowns

Combinar dos fuentes y deduplicar:

**(a) Marcadores de `/spec`** — todos los `[NEEDS CLARIFICATION: ...]`, cada uno con
su texto de pregunta.

**(b) Autochequeo de cada AC** contra el checklist (evaluar internamente, no mostrar
el chequeo crudo):

| Dimension | Question | What to look for |
|---|---|---|
| **Testabilidad** | ¿Es verificable tal como está escrito? | "razonable", "adecuado", "debería", "rápido" sin criterio objetivo |
| **Testabilidad** | ¿Usa términos de negocio sin definición clara? | "activo", "vigente", "elegible" sin regla explícita |
| **Happy path** | ¿Define formato de salida / código de respuesta / estado resultante? | AC que describe "qué" pero no "cómo se ve la respuesta exitosa" |
| **Edge cases** | ¿Cubre los límites? (vacío, cero, máximo, duplicado, concurrencia) | Caso límite implícito en el encuadre o en las Reglas sin AC asociado |
| **Errores/fallos** | ¿Define el comportamiento ante input inválido, faltante, o falla de una dependencia? | AC silencioso sobre validación, autorización, o error externo/BD |
| **Inconsistencias** | ¿Contradice a otro AC o a una Regla de Negocio? | Dos ACs que se pisan, o un AC que viola una regla declarada |
| **Cobertura** | ¿Hay comportamiento descrito en prosa sin ningún AC que lo capture? | Requisito mencionado que no quedó como criterio verificable |

Ordenar por impacto (define el orden de resolución en P, no un recorte):
1. **Inconsistencias/contradicciones** entre ACs o reglas
2. Gaps que **bloquean el diseño de DTOs o reglas de negocio**
3. Comportamiento ante **errores y edge cases**
4. Testabilidad de wording

### R2 — Load the static authority sources

Leer una sola vez, antes de tocar el código: `docs/rules.md`, `CLAUDE.md`,
`.agents/profile.md`. Si alguno no existe, seguir sin él — solo baja un nivel la
jerarquía.

Consultar `references/decision-authority.md` — jerarquía de fuentes, test de
escalamiento, niveles de confianza y casos calibrados con ítems reales del proyecto.
**Leerla acá, una vez, no por unknown.**

### R3 — Identify affected components and verify a fresh base

1. Leer el catálogo de componentes (`DOCS_COMPONENTS_INDEX`) y aplicarlo contra el
   contenido del ítem. Listar **todos** los componentes afectados — puede ser más de uno.

   Si no se identifican con certeza, **preguntar ahora** (no se puede diferir: sin
   componente no hay nada que relevar):
   > "¿Qué <COMPONENT_TERM>(s) afecta este ítem? (ej: `apps/ledger`)"

2. Verificar (read-only, nunca mutar git) que cada componente esté sobre base fresca:

```bash
git -C <component> branch --show-current
git -C <component> status --porcelain
git -C <component> fetch --dry-run 2>&1 | head -1
```

Si alguno no está en `BASE_BRANCH`, tiene cambios sin commitear, o está detrás del
remoto → **advertir y continuar** (se releva lo que esté checked out):
> "`<component>` no está en `<BASE_BRANCH>` actualizado. Relevo el código tal como
> está; si querés la base fresca, corré `/prepare` y volvé a ejecutar."

### R4 — Survey the code (one batch, in parallel)

Una sola tanda de consultas al grafo, con **dos clases de pregunta**:

| Clase | Pregunta | Cuántas |
|---|---|---|
| **Inventario** | «¿Qué hay en el módulo M?» — para `context.md` | Una por componente afectado |
| **Precedente** | «¿Cómo resolvimos X antes acá?» — para los unknowns de R1 | Una por unknown que lo amerite, techo **5** |

**Lanzarlas todas en la misma respuesta**, en paralelo. Solo califican para
*precedente* los unknowns donde «¿cómo lo resolvimos antes?» es pertinente —
longitudes, nombres de error, formatos, convenciones de columna, patrones de puerto.
Un unknown de intención de negocio nunca califica.

`codegraph_explore` devuelve en una llamada: símbolos con fuente verbatim agrupados
por archivo, call paths, blast radius (quién depende de qué y qué tests lo cubren) y
rutas de framework.

Con los resultados:

1. Identificar los archivos clave entre los devueltos y leer **solo esos** con Read,
   aplicando progressive disclosure de `<STACK_REFS>/references/scan-guide.md`
   (default: `../scan/references/scan-guide.md`) — no explorar el árbol completo.
2. Revisar `DOCS_COMPONENT_README` / `DOCS_COMPONENT_ARCH` de cada componente y
   anotar los **gaps de documentación** encontrados.
3. Inventariar todo lo que pide `<STACK_REFS>/references/context-template.md` para
   la fase I.

**Qué cuenta como precedente (evidencia suficiente):**

| Resultado | Veredicto |
|---|---|
| Un caso análogo claro, con fuente verbatim | **Precedente** — nivel 3, confianza media |
| Varios casos análogos coincidentes | **Precedente fuerte** — nivel 3, confianza media-alta |
| Varios casos que **se contradicen** | **No hay precedente, hay inconsistencia** — bajar al nivel 4 y registrarla |
| Sin resultados relevantes | **Sin precedente** — bajar al nivel 4. Que el repo no tenga convención acá es información para `/design` |

**Si el módulo no aparece** → es un unknown más (no un bloqueo): anotarlo y llevarlo
a P, donde se escala junto con el resto.

#### Fallback — CodeGraph no disponible

Si `CODEGRAPH` es `no` o no existe `.codegraph/`:

1. Sugerir inicializarlo una vez (`codegraph init`) — después queda auto-sincronizado.
2. Mientras tanto, delegar el **inventario** al subagente `EXPLORER_SUBAGENT`
   (default `code-explorer`), una llamada por componente, **en paralelo**, pasando
   `model:` = `EXPLORER_MODEL` explícito. El prompt debe incluir: nombre del
   componente, keywords del ítem, instrucción de leer los docs del componente,
   localizar el módulo, y consultar `scan-guide.md` para qué leer y qué saltear.
3. Las consultas de **precedente** no se delegan: sin grafo salen caras. Resolver
   esos unknowns con las fuentes de nivel 4-5.

### R5 — Ask the one thing only the developer knows (conditional)

Hay dos clases de información que no están en ningún archivo ni en el código:
**restricciones no escritas** y **deuda técnica conocida**. Si alguna pudiera cambiar
la resolución de un unknown, preguntarlo **ahora** — antes de decidir.

Preguntar en texto plano (respuesta libre, no `AskUserQuestion`):

> "Ya relevé <componente(s)>. ¿Hay algo que **no esté escrito en ningún lado** y deba
> tener en cuenta? Restricciones («no toques la tabla X», «no rompas el contrato
> actual»), deuda técnica en la zona afectada, o integraciones que todavía no existen
> en el código.
>
> Si no hay nada, respondé `-` y sigo."

**Es condicional:** si todos los unknowns quedaron cubiertos por fuentes formales o
por el relevamiento, **no preguntar nada** y pasar directo a P.

### Research dossier

Al cerrar R, tener en memoria: por cada unknown su texto, prioridad, fuentes
consultadas y **qué se encontró y qué no**; el inventario completo por componente; los
gaps de documentación; y la respuesta del desarrollador si la hubo. Ese dossier es el
único input de la fase P.

---

# PHASE P — Plan

**Regla de la fase: decidir todo. No escribir nada en disco.**

### P1 — Classify every unknown

Recorrer la lista completa (los de los ACs y los que surgieron del relevamiento).
Por cada uno, con el dossier a la vista:

1. **Buscar en la jerarquía** cuál fuente **determina** la respuesta:
   `docs/rules.md` → `CLAUDE.md`/`profile.md` → precedente del código (R4) →
   estándar formal → invariantes del propio ítem. «Determina» = la respuesta se
   deduce de ella, no que sea meramente compatible.
2. **Si alguna determina** → decisión autónoma; anotar decisión, fundamento, fuente
   y confianza (alta/media/baja).
3. **Si ninguna determina** → aplicar el test de escalamiento: ¿cae en **alcance**,
   **intención de negocio**, **irreversibilidad** o **conflicto de reglas**? Si sí,
   marcarlo como *candidato a escalar*. Si no, decidir con la mejor alternativa y
   marcar confianza **baja**.

**Regla de oro:** si podés escribir el fundamento en una oración, no preguntes. La
pregunta se justifica cuando el fundamento **depende de una preferencia que no es tuya**.

### P2 — Check interdependencies

Con todas las decisiones sobre la mesa, revisar el conjunto antes de tocar nada:

- **¿Alguna decisión contradice a otra?** (ej. AC-2 resuelto con 200 y AC-5 con 404
  para el mismo caso). Resolverlo acá, no en el archivo.
- **¿Alguna decisión vuelve irrelevante a otro unknown?** Descartarlo con una nota.
- **¿Alguna decisión choca con el terreno relevado?** (ej. se decidió reusar un puerto
  que el inventario muestra con otra firma). Corregir la decisión, no el inventario.
- **¿Alguna de confianza baja quedaría fijada por otra de confianza alta?** Alinearlas.

Este paso es imposible en un bucle por unknown — es la razón principal de separar P.

### P3 — Select what to escalate

Sobre la lista **completa** de candidatos, elegir los de mayor impacto.

**Presupuesto: máximo 3 escalamientos por corrida.** No es un recorte ciego, es una
señal: si **más de 3** unknowns son de intención de producto o alcance, el ítem no
está listo para clarificarse. Escalar los 3 de mayor impacto, resolver el resto con
confianza baja, y **decirlo explícitamente en el cierre**:

> "<N> unknowns requerían tu criterio pero el presupuesto es 3. Los otros los resolví
> con confianza baja — puede convenir revisar el alcance de este ítem antes de seguir."

### P4 — Escalate in a single call

Los seleccionados se preguntan con `AskUserQuestion`, **todos en una sola llamada**
(hasta 3 preguntas juntas). Nunca un bucle de una por turno.

Por cada pregunta:
- `question`: el unknown formulado directo, mencionando por qué no se pudo resolver solo.
- `header`: etiqueta corta (máx 12 caracteres) que identifique el AC (ej. "AC-2 alcance").
- `options`: 2-4 alternativas. La recomendada **primero** con `" (Recomendado)"` al
  final del `label`; su `description` lleva el fundamento en 1-2 oraciones.
- El "Other" implícito ya cubre respuestas propias — no agregar opción "Otra".

### Decision table

Al cerrar P: por cada unknown → decisión, fundamento, fuente, confianza, y si fue
autónoma o consultada. **Todavía no se escribió nada.**

---

# PHASE I — Implement

**Regla de la fase: aplicar lo decidido. No decidir nada nuevo.**

Si acá aparece una duda que no estaba en la tabla, es que R fue incompleta:
resolverla con la jerarquía y anotarla como confianza baja — no abrir una pregunta
nueva a esta altura.

### I1 — Write the decision log first

**Escribir `## Resolución de Ambigüedades` en `spec.md` antes que nada.** Si la
corrida se interrumpe, lo que sobrevive es el razonamiento completo — que es lo caro
de reconstruir; reaplicar edits es trivial.

```markdown
## Resolución de Ambigüedades

- **AC-2 · autónoma (alta):** ¿Qué código HTTP ante lista vacía? → **200 con array
  vacío**.
  *Fundamento:* es el estándar REST para colecciones sin resultados; 404 se reserva
  para recurso inexistente. *Fuente:* convención HTTP (nivel 4).

- **AC-3 · autónoma (media):** ¿Largo máximo de `Payee`? → **255**.
  *Fundamento:* consistencia con el campo análogo ya existente.
  *Fuente:* `apps/finances/.../transaction.entity.ts:merchant` (nivel 3).

- **AC-4 · consultada:** ¿`dryRun` en todos los commands de escritura o solo donde
  el caso es claro? → **En todos, sin excepciones** (decisión del desarrollador).
  *Por qué se consultó:* define la superficie transversal del ítem — categoría alcance.

- **AC-6 · autónoma (baja):** ¿Formato del identificador de lote? → **ULID**.
  *Fundamento:* ordenable temporalmente, sin coordinación.
  *Sin precedente:* el repo no tiene convención de identificadores de lote todavía.
```

Registrar también las búsquedas **sin resultado** y las inconsistencias halladas en
R4 — son señales para `/design`.

### I2 — Apply the resolutions to the ACs

1. Editar cada AC en `spec.md` con la redacción precisada.
2. **Eliminar el marcador `[NEEDS CLARIFICATION: ...]`** de esa línea si venía de uno.
   No debe quedar ningún marcador resuelto en el archivo.

### I3 — EARS rephrasing (automatic, never asked)

Cuando un AC falla testabilidad, reescribirlo en notación **EARS** — sin preguntar.
Es reformulación redaccional: no cambia comportamiento, no hay decisión que delegar.

| Pattern | Form | Use |
|---|---|---|
| Ubiquitous | `EL SISTEMA DEBE <respuesta>` | Regla siempre activa |
| Event-driven | `CUANDO <evento>, EL SISTEMA DEBE <respuesta>` | Disparo por un evento |
| State-driven | `MIENTRAS <estado>, EL SISTEMA DEBE <respuesta>` | Comportamiento durante un estado |
| Unwanted | `SI <condición de error>, ENTONCES EL SISTEMA DEBE <respuesta>` | Manejo de error/edge case |
| Optional | `DONDE <feature presente>, EL SISTEMA DEBE <respuesta>` | Condicional a una feature |

- **Preservar el texto original** como línea `> Original: "<texto>"` debajo.
- Usar varias líneas EARS si el AC tiene happy path + caso de error.
- **Nunca** reformular un AC que ya es claro y testable.

### I4 — Write `## Technical Context` (only what the human declared)

Esta sección de `spec.md` lleva **exclusivamente lo que el desarrollador declaró en
R5**: restricciones técnicas y deuda técnica relevante. Nada inferido, nada relevado
del código — eso vive en `context.md`, que es su lugar.

Usar `references/tech-context-template.md`. **Si el desarrollador no declaró nada,
omitir la sección entera.**

### I5 — Write `context.md`

Volcar el inventario de R4 en `<STACK_REFS>/references/context-template.md` (default:
`../scan/references/context-template.md`) y guardarlo en
`work/active/sm-<number>/context.md`.

Incluir siempre la sección de **gaps detectados**: lo que no se encontró, la
documentación ausente, y las inconsistencias del repo halladas en R4. `/design` y
`/plan` dependen de esa lista tanto como del inventario.

### I6 — Batch review

Mostrar en el chat (no en los archivos), ordenado por **confianza ascendente** — lo
dudoso arriba, que es donde el ojo tiene que caer:

```
Clarificado sm-<number>: <N> decisiones autónomas, <M> consultadas, <K> ACs en EARS.
Relevamiento: <C> componente(s), <Q> consultas al grafo, <S> precedentes, <T> sin precedente.

⚠ Revisá con atención (confianza baja):
  1. AC-6 — <pregunta> → <decisión>  ·  sin precedente en el repo

Decididas con fuente firme:
  2. AC-2 — <pregunta> → <decisión>  ·  <fuente>
  3. AC-3 — <pregunta> → <decisión>  ·  <fuente>

context.md: <n> módulos inventariados, <g> gaps detectados.

Para revertir cualquiera: «cambiá la 2 a <otra decisión>».
```

- Si no hubo ninguna de confianza baja, omitir el grupo `⚠`.
- Si el presupuesto recortó escalamientos, incluir la advertencia de P3.

### Handoff

```bash
grep -c 'NEEDS CLARIFICATION' work/active/sm-<number>/spec.md
```

- Conteo `0` → "Listo para diseñar. Cuando revises, `/design sm-<number>`."
- Quedan marcadores → "Quedan <N> marcadores. `/design` no avanza hasta resolverlos
  — volvé a correr `/clarify sm-<number>`."

Stop — no iniciar el diseño.

---

## Legacy mode (`--ask`)

Con `--ask` no hay separación RPI: cada unknown se resuelve con `AskUserQuestion`,
uno a la vez, en bucle, sin presupuesto y sin auto-resolución; EARS se ofrece en vez
de aplicarse; y el contexto técnico se releva preguntando (componente, artefactos,
patrones, restricciones, integraciones, deuda técnica), una por turno. El inventario
del código y `context.md` se producen igual.

Útil cuando el ítem toca terreno donde no querés que nada se decida sin verlo —
típicamente dominio nuevo o implicancias contractuales fuertes.

---

## CRITICAL: Output Language

Todo el contenido de `spec.md` y `context.md` en español. Excepción: nombres de
componentes, clases, rutas de archivo, identificadores y código — siempre en inglés.

---

## Common Issues

| Issue | Cause | Resolution |
|-------|-------|------------|
| spec.md no existe | `/spec` no ejecutado | STOP: indicar ejecutar `/spec sm-<number>` primero |
| Componente no identificable | Ítem sin keywords claras | Preguntar en R3 — no se puede diferir, sin componente no hay relevamiento |
| Módulo no encontrado en el componente | Módulo nuevo o con otro nombre | No es bloqueo: es un unknown más, se escala en P junto con el resto |
| Aparece una duda nueva en fase I | La fase R fue incompleta | Resolverla con la jerarquía y marcarla confianza baja; no abrir preguntas en I |
| El grafo devuelve resultados contradictorios | El repo resolvió lo mismo de dos formas | No es precedente: bajar al nivel 4 y registrar la inconsistencia en `context.md` |
| Más de 3 unknowns califican para escalar | Ítem con mucha decisión de producto abierta | Escalar los 3 de mayor impacto y advertir que el alcance puede no estar listo |
| `CODEGRAPH: no` en el profile | Proyecto sin grafo indexado | Delegar el **inventario** al subagente explorador; los **precedentes** se resuelven con niveles 4-5 |
| Componente fuera de `BASE_BRANCH` | Base no preparada | Advertir y continuar — se releva lo que esté checked out; sugerir `/prepare` |
| Solo hace falta refrescar `context.md` | El código cambió, los ACs no | Usar `/scan sm-<number>` — no re-clarificar |
| El usuario revierte varias decisiones seguidas | Rúbrica mal calibrada para el dominio | Aplicar los cambios y sugerir `--ask` para los próximos ítems del área |

---

## Example

**Input:** `/clarify sm-1933`

**Fase R:**
- R1: 3 unknowns — AC-2 sin código HTTP, "tipo de servicio" sin definir, filtro
  multi-valor sin semántica (AND/OR).
- R2: carga `rules.md`, `CLAUDE.md`, profile y la rúbrica.
- R3: identifica `apps/ledger`; está en `develop` limpio.
- R4: **tres consultas en una sola tanda** — una de inventario (`apps/ledger` módulo
  de zonas) y dos de precedente (`"service type enum"`, `"list empty response"`). La
  primera de precedente encuentra `ServiceType`; la segunda no devuelve nada.
- R5: los tres unknowns quedaron cubiertos por fuentes formales o son de negocio →
  **no se pregunta nada**.

**Fase P:**

| Unknown | Fuente | Resultado |
|---|---|---|
| AC-2 código HTTP | Nivel 4 — convención REST | Autónoma (alta): 200 con array vacío |
| AC-1 "tipo de servicio" | Nivel 3 — `ServiceType` hallado en R4 | Autónoma (media): los valores del enum |
| AC-1 AND u OR | Ninguna lo determina; cambia el resultado que ve el operador | **Escalar** — intención de negocio |

- P2: sin interdependencias. P3: 1 candidato, dentro del presupuesto.
- P4: una llamada `AskUserQuestion`. El usuario elige OR.

**Fase I:** registro primero, después ACs, EARS en AC-1, sin `Technical Context` (el
desarrollador no declaró restricciones), `context.md` con el módulo inventariado y 1
gap de documentación, y el bloque de cierre.

**Antes (dos skills):** `/clarify` con 4 preguntas en bucle y sondeo acotado, después
`/scan` re-explorando el mismo módulo con su propia ronda de unknowns.
**Ahora:** una pasada, 3 consultas en paralelo, 1 pregunta, dos artefactos.
