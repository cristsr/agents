---
name: clarify
description: >
  Detects ambiguities in hu.md's acceptance criteria (testability, edge cases,
  unspecified behavior) and then captures technical context already known by
  the developer — both before scanning the codebase. Use when the user says
  "/clarify sm-XXX", "clarificar historia", "revisar ambigüedades",
  "enriquecer historia", "agregar contexto técnico", "antes del scan quiero
  revisar algo", "ya sé qué módulos aplican", or has created hu.md with /hu
  and wants to resolve ambiguity or add known technical context before /scan.
  Do NOT use to correct acceptance criteria after design/plan already exist
  (use /refine), scan the codebase (use /scan), or create the user story
  (use /hu).
---

# clarify

## Overview

Dos fases sobre `work/active/sm-<number>/hu.md`:

- **Fase A — Detección de ambigüedades:** autochequeo de cada AC contra una checklist de
  testabilidad/completitud. Si hay gaps, se resuelven **todos** con preguntas guiadas
  (patrón speckit), en bucle, una a la vez, hasta que no quede ningún unknown pendiente.
- **Fase B — Contexto técnico:** preguntas guiadas para capturar conocimiento técnico que el
  desarrollador ya tiene (microservicio, artefactos reutilizables, patrones, restricciones).

Ambas fases son opcionales de saltar si no aplican, pero **Fase A corre siempre primero** —
clarificar la historia antes de invertir tiempo de scan en una historia ambigua.

**Announce at start:** "Clarificando sm-<number> antes del scan."

**Output:** `work/active/sm-<number>/hu.md` (modificado in-place)

---

## Perfil del proyecto (leer primero, siempre)

Antes de cualquier otra cosa, leé `.agents/profile.md` (en la raíz del proyecto actual): define el patrón de ID
de historia, las rutas de artefactos, el idioma de salida y el stack objetivo. Si
no existe, avisá al usuario que lo cree copiando `~/.agents/sdd-profile.template.md` a `.agents/profile.md` del proyecto, y detené: sin perfil no conocés las convenciones de este proyecto.

**Los literales de este documento son solo un ejemplo de resolución** (el perfil de Smart Mobility).
Los valores reales salen del `profile.md` del proyecto en el que estés trabajando — si difieren, mandan los del perfil:

| En este documento | Clave en profile.md |
|---|---|
| `sm-<number>` | `STORY_ID_PATTERN` |
| `work/active/sm-<number>/` | `WORKDIR_ACTIVE` |
| salida en español | `OUTPUT_LANGUAGE` |
| microservicio · artefactos de código (entidad, módulo, DTO, servicio) | sección 7 «Stack y arquitectura» |

---

## CRITICAL: Prerequisites

### Step 1 — Extract the story number

Extraer `sm-<number>` del input. Si no está presente, preguntar:
> "¿Para qué historia? (ej: sm-1933)"

### Step 2 — Verify hu.md exists

```bash
[ -f work/active/sm-<number>/hu.md ] && echo "OK" || echo "MISSING"
```

Si NO existe → STOP:
> "No encontré `work/active/sm-<number>/hu.md`. Ejecutá `/hu sm-<number>` primero."

### Step 3 — Read hu.md

Leer el archivo completo. Extraer y mantener en memoria:
- Título de la historia
- Historia de Usuario (Como/Quiero/Para)
- Lista de ACs completa, numerada
- Reglas de Negocio si existen
- **Marcadores `[NEEDS CLARIFICATION: ...]`** insertados por `/hu` — cada uno es
  un unknown ya identificado que Fase A debe resolver y eliminar del archivo.

### Step 4 — Verify existing sections

- Si ya existe `## Resolución de Ambigüedades` **y no quedan marcadores
  `[NEEDS CLARIFICATION]` en el archivo** → Fase A ya se completó antes. Anunciar:
  "Ya hay ambigüedades resueltas para esta historia. Saltando a Fase B." y continuar
  directo en Fase B.
- Si ya existe `## Resolución de Ambigüedades` **pero todavía quedan marcadores
  `[NEEDS CLARIFICATION]`** → una corrida previa se interrumpió o difirió unknowns. Correr
  Fase A solo sobre los marcadores restantes y **agregar** sus entradas a la sección
  existente (no recrearla). Anunciar: "Retomando ambigüedades pendientes de sm-<number>."
- Si ya existe `## Technical Context` → usar `AskUserQuestion` con
  `question: "Ya existe una sección Technical Context en hu.md. ¿Qué querés hacer?"`,
  header `"Tech Context"`, y opciones `"Sobreescribirla"` / `"Agregarle más información"`.
  Esperar respuesta antes de llegar a Fase B (no bloquea Fase A).

---

## PHASE A: Ambiguity detection

### Step 0 — Collect /hu's markers

Antes del autochequeo, listar todos los `[NEEDS CLARIFICATION: ...]` presentes en
`hu.md`. Cada uno ya es un unknown identificado por `/hu` — entran directo a la
lista de unknowns con su texto de pregunta. Deben resolverse y **eliminarse** del
archivo en esta fase (un marcador sin resolver bloquea `/design`).

### Self-check checklist

Para CADA AC, evaluar internamente (no mostrar el chequeo crudo al usuario, solo el
resultado). El checklist cubre cinco dimensiones — **happy path, edge cases,
errores/fallos, testabilidad e inconsistencias**:

| Dimension | Question | What to look for |
|---|---|---|
| **Testabilidad** | ¿Es verificable tal como está escrito? | Palabras como "razonable", "adecuado", "debería", "rápido" sin criterio objetivo |
| **Testabilidad** | ¿Usa términos de negocio sin definición clara? | Ej: "activo", "vigente", "elegible" sin regla explícita |
| **Happy path** | ¿Está completo el camino feliz? ¿Define formato de salida / código de respuesta / estado resultante? | AC que describe "qué" pero no "cómo se ve la respuesta exitosa" |
| **Edge cases** | ¿Cubre los límites? (vacío, cero, máximo, duplicado, concurrencia, listas sin resultados) | Caso límite implícito en la Historia de Usuario o en las Reglas de Negocio sin AC asociado |
| **Errores/fallos** | ¿Define el comportamiento ante input inválido, faltante, o falla de una dependencia? | AC silencioso sobre validación, autorización, o error de un sistema externo/BD |
| **Inconsistencias** | ¿Contradice a otro AC o a una Regla de Negocio? | Dos ACs que se pisan, o un AC que viola una regla declarada |
| **Cobertura** | ¿Hay un comportamiento descrito en prosa (Historia/Reglas) sin ningún AC que lo capture? | Requisito mencionado que no quedó como criterio verificable |

### Build the list of unknowns

Combinar (a) los marcadores del Paso 0 y (b) los gaps detectados por el checklist,
deduplicando (si un marcador y un gap apuntan al mismo hueco, es un solo unknown).

Priorizar por impacto define el **orden** en que se resuelven (de mayor a menor), no un
recorte de la lista:
1. **Inconsistencias/contradicciones** entre ACs o reglas (bloquean todo lo demás)
2. Gaps que **bloquean el diseño de DTOs o reglas de negocio** (happy path, términos)
3. Comportamiento ante **errores y edge cases**
4. Testabilidad de wording

Resolver **todos** los unknowns en esta corrida, sin tope — recorrer la lista completa en
bucle, uno a la vez y en orden de prioridad, hasta que no quede ninguno pendiente. Nunca
eliminar un marcador sin resolverlo, y nunca cerrar Fase A dejando unknowns sin tratar (a
menos que el propio usuario decida diferir uno explícitamente).

Si NO hay marcadores ni gaps → anunciar: "No se detectaron ambigüedades en los ACs."
y pasar directo a FASE B.

### Resolve unknowns (speckit pattern — one at a time, in a loop)

Recorrer la lista de unknowns en bucle hasta vaciarla. Para cada unknown, llamar
`AskUserQuestion` con una sola pregunta:

- `question`: el unknown del AC, formulado como pregunta directa.
- `header`: etiqueta corta (máx 12 caracteres) que identifique el AC (ej. "AC-2 código").
- `options`: 2-4 alternativas. La opción recomendada va **primero** con
  `" (Recomendado)"` al final de su `label`; su `description` lleva la
  razón en 1-2 oraciones (esto reemplaza la vieja línea "Recomendación:").
- El "Other" implícito del tool ya cubre cualquier respuesta propia del
  usuario fuera de las opciones listadas — no agregar una opción "Otra".

**Reglas:**
- Sin tope de preguntas: procesar la lista completa de unknowns en bucle hasta vaciarla
- Una llamada a `AskUserQuestion` por unknown — esperar la respuesta antes del siguiente
- Nunca revelar preguntas futuras
- Aplicar la resolución de cada unknown (editar el AC + eliminar su marcador) antes o
  inmediatamente después de pasar al siguiente, para no perder el trabajo si la corrida se
  interrumpe a mitad de la lista

### Apply resolutions

Por cada unknown resuelto que implique reescribir o precisar un AC:
1. Editar el AC correspondiente en `hu.md` con la redacción precisada.
2. **Si el unknown venía de un marcador `[NEEDS CLARIFICATION: ...]`, eliminar el
   marcador** de esa línea (la decisión ya quedó incorporada al AC). No debe
   quedar ningún marcador resuelto en el archivo.
3. Agregar una entrada a la sección `## Resolución de Ambigüedades` (crearla si no existe):

```markdown
## Resolución de Ambigüedades

- **AC-N:** [pregunta resuelta] → [decisión tomada]
```

No agregar la sección si no hubo ningún unknown.

### EARS rephrasing (offer when the AC fails testability)

Cuando un AC resulta poco testable (wording vago, comportamiento implícito), además
de precisarlo, **ofrecer** reescribirlo en notación **EARS** — el estándar de
requisitos testables (patrón Kiro). EARS estructura el criterio en una de estas
formas:

| Pattern | Form | Use |
|---|---|---|
| Ubiquitous | `EL SISTEMA DEBE <respuesta>` | Regla siempre activa |
| Event-driven | `CUANDO <evento>, EL SISTEMA DEBE <respuesta>` | Disparo por un evento |
| State-driven | `MIENTRAS <estado>, EL SISTEMA DEBE <respuesta>` | Comportamiento durante un estado |
| Unwanted | `SI <condición de error>, ENTONCES EL SISTEMA DEBE <respuesta>` | Manejo de error/edge case |
| Optional | `DONDE <feature presente>, EL SISTEMA DEBE <respuesta>` | Comportamiento condicional a una feature |

Preguntar con `AskUserQuestion` (`header: "EARS AC-N"`, opciones
`"Sí, reformular en EARS (Recomendado)"` — description "Deja el criterio
verificable sin ambigüedad, cubre happy path y error explícitamente" —
`"No, dejar la redacción precisada"`).

- Si acepta → reemplazar el cuerpo del AC por la forma EARS (una o varias líneas
  EARS si el AC tiene happy path + caso de error). **Preservar el texto original de
  Jira** como una línea `> Original: "<texto>"` debajo, para no perder la traza al
  backlog.
- Si rechaza → dejar la redacción precisada tal cual (no forzar EARS).

Nunca reformular en EARS un AC que ya es claro y testable — solo se ofrece para los
que fallaron el checklist.

---

## PHASE B: Technical context

Hacer cada pregunta **de a una**. Esperar respuesta antes de pasar a la siguiente.

Si el usuario responde "skip", "-", "ninguno", "no sé" o similar → marcar ese campo como vacío y continuar.

### Q1 — Target microservice(s)
> "¿En qué microservicio(s) cae esta historia? (ej: sm-scheduling-ms)"

Acepta uno o varios. Si menciona un nombre desconocido, continuar sin validar — el desarrollador es la fuente de verdad.

> Nota: `AskUserQuestion` no aplica acá — el workspace tiene más de 4
> microservicios candidatos (`sm-capabilities-ms`, `sm-capabilities-loader-ms`,
> `sm-graphql-fb-ms`, `sm-scheduling-ms`, `sm-users-ms`, y otros como
> `sm-audits-ms`/`sm-notifications-ms`), y el tool tiene un máximo de 4
> opciones por pregunta — forzar un subconjunto sería arbitrario.

### Q2 — Artifacts to reuse
> "¿Hay clases, repositorios, casos de uso o DTOs existentes que deberían reutilizarse?
> (ej: AvailabilitySlotRepository, CreateSlotUseCase)"

Acepta lista libre. Si el usuario da nombres con rutas, preservarlas tal como las escribe.

### Q3 — Mandatory patterns
> "¿Hay patrones o estructuras que la implementación DEBE seguir?
> (ej: caso de uso hexagonal, abstract class como token DI, naming específico)"

### Q4 — Technical constraints
> "¿Hay algo que la implementación NO debe hacer o tiene limitaciones conocidas?
> (ej: no modificar tabla X directamente, no romper contrato de API actual, usar solo conexión read-only)"

### Q5 — Known integrations
> "¿La historia requiere llamadas a otros microservicios o sistemas externos que ya conocés?
> (ej: HTTP GET a sm-capabilities-ms /zones/{id}, Redis Streams)"

### Q6 — Relevant technical debt
> "¿Hay deuda técnica en la zona de código afectada que el implementador debería conocer?
> (ej: módulo X tiene bug con Y, servicio Z usa patrón obsoleto)"

### Write the section

1. Construir `## Technical Context` usando `references/tech-context-template.md`.
   Omitir cualquier subsección sin información.
2. Mostrar preview antes de guardar y esperar confirmación.
3. Aplicar al archivo:
   - Si la sección NO existe: leer el contenido completo actual con Read, concatenar la
     nueva sección al final, escribir todo junto con Write — nunca solo la sección nueva.
   - Si EXISTE y se eligió sobreescribir → reemplazar solo la sección con Edit.
   - Si EXISTE y se eligió agregar → mergear en las subsecciones con Edit.

   **CRITICAL:** Write sobrescribe el archivo completo. Siempre leer primero y escribir
   contenido anterior + nueva sección juntos.

---

## Handoff

Antes de cerrar, verificar si quedan marcadores sin resolver:

```bash
grep -c 'NEEDS CLARIFICATION' work/active/sm-<number>/hu.md
```

- Si el conteo es `0` → cerrar:
  > "Historia clarificada en `work/active/sm-<number>/hu.md`. Sin marcadores
  > pendientes. Revisala y cuando estés listo ejecutá `/scan sm-<number>`."

- Si quedan marcadores (el usuario difirió alguno explícitamente o la corrida se
  interrumpió antes de vaciar la lista) → advertir:
  > "Historia clarificada, pero quedan <N> marcadores `[NEEDS CLARIFICATION]`
  > sin resolver. `/design` no va a avanzar hasta que se resuelvan — volvé a
  > ejecutar `/clarify sm-<number>` para tratar los restantes."

Stop — no iniciar el scan.

---

## CRITICAL: Output Language

Todo el contenido agregado al `hu.md` en español. Excepción: nombres de microservicios,
clases, rutas de archivo, identificadores TypeScript y código — siempre en inglés.

---

## Common Issues

| Issue | Cause | Resolution |
|-------|-------|------------|
| hu.md no existe | /hu no ejecutado | STOP: indicar ejecutar `/hu sm-<number>` primero |
| Ambigüedades ya resueltas antes | Re-ejecución sobre historia ya clarificada | Saltar Fase A, ir directo a Fase B |
| Technical Context ya existe | Re-ejecución sobre historia activa | Preguntar si sobreescribir o agregar antes de continuar |
| Todas las respuestas de Fase B vacías | Historia puramente CRUD sin contexto especial | Continuar — Fase A ya aportó valor aunque Fase B esté vacía |
| Usuario da nombres de clases sin rutas | Información parcial | Preservar como están; `/scan` resolverá las rutas |
| Microservicio no reconocido | Nombre nuevo o typo del usuario | Continuar sin validar; el desarrollador es la fuente de verdad |
| context.md ya existe del scan anterior | Historia re-clarificada después del scan | Advertir: "Ya existe `context.md`. Ejecutá `/scan sm-<number>` para regenerarlo." |

---

## Example

**Input del usuario:**
> `/clarify sm-1933`

**Flujo:**
1. Número: `1933`. Verifica `hu.md` → existe. Lee: título "Filtrar zonas por tipo de servicio", 2 ACs.
2. No existen secciones previas → continúa.
3. Anuncia: "Clarificando sm-1933 antes del scan."

**Fase A:**
- Autochequeo de AC-2 ("Si no hay resultados, retorna lista vacía"): no especifica código HTTP.
- `AskUserQuestion` (header "AC-2 código"): opción 1 "200 con array vacío (Recomendado)" —
  description "Es el estándar REST para listas sin resultados, no un 404" — opción 2 "404".
- Usuario elige la opción recomendada.
- Se edita AC-2 → "Si no hay resultados, retorna lista vacía con código 200."
- Se agrega:
  ```markdown
  ## Resolución de Ambigüedades

  - **AC-2:** ¿Qué código HTTP ante lista vacía? → 200 con array vacío (estándar REST).
  ```

**Fase B:**
- Q1: "sm-scheduling-ms" · Q2: "AvailabilitySlotRepository" · Q3: "Caso de uso hexagonal" · Q4-Q6: "skip"
- Se construye y guarda `## Technical Context` con solo Q1-Q3.

**Salida al usuario:**
> "Historia clarificada en `work/active/sm-1933/hu.md`. Revisala y cuando estés listo ejecutá `/scan sm-1933`."
