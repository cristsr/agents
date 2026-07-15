---
name: skill-creator
description: >
  Guía interactiva para crear una skill nueva de cero, siguiendo la guía oficial
  de Anthropic para construir skills. Entrevista al usuario para definir 2–3
  casos de uso concretos, elige la categoría y el patrón de workflow adecuados,
  redacta el frontmatter YAML con disparadores explícitos, arma la estructura de
  carpetas (SKILL.md + scripts/ + references/ + assets/), escribe instrucciones
  accionables con manejo de errores, y propone la batería de tests de
  disparo antes de cerrar. Use when the user says "/skill-creator", "crear una
  skill", "nueva skill", "generar SKILL.md", "quiero automatizar este flujo con
  una skill", "convertir este proceso en skill", "armar una skill para X", or
  describes a repeatable workflow they want Claude to follow consistently.
  Do NOT use to review or score an existing skill (use /skill-evaluator), to
  edit project artifacts of a user story (use /refine), or to define
  project-wide governing principles (use /constitution).
---

# skill-creator

## Overview

Una **skill** es una carpeta con instrucciones que le enseña a Claude a manejar
una tarea o workflow repetible. Esta skill guía la creación de una skill nueva
siguiendo la guía oficial de Anthropic.

Esta skill es **agnóstica** — sirve para crear skills de cualquier proyecto o
dominio. No asume la estructura de este workspace.

**Announce at start:** "Vamos a crear una skill nueva. Arranco por los casos de uso."

**Output:** una carpeta `<skill-name>/` con `SKILL.md` y, si aplica,
`references/`, `scripts/` y `assets/`.

**Core principle:** el **frontmatter es lo más importante**. Es lo único que
Claude siempre tiene cargado, y es lo que decide si la skill se activa. Una
skill con instrucciones brillantes y una `description` vaga nunca se dispara.

---

## PHASE 1: Casos de uso (no saltear)

**No escribir nada de la skill hasta tener 2–3 casos de uso concretos.** Este es
el gate de esta skill: sin casos de uso, la `description` sale vaga y la skill
no dispara.

Preguntar de a una:

1. "¿Qué quiere lograr el usuario cuando usa esta skill?"
2. "¿Qué frase exacta diría para pedirlo?" (esto alimenta los disparadores)
3. "¿Qué pasos multi-etapa requiere?"
4. "¿Qué herramientas necesita? (built-in, MCP, scripts)"
5. "¿Qué conocimiento de dominio o buenas prácticas hay que embeber?"

Registrar cada caso de uso en este formato:

```
Caso de uso: Planificación de sprint
Disparador: el usuario dice "ayudame a planear este sprint" o "crear tareas del sprint"
Pasos:
  1. Traer estado actual del proyecto desde Linear (vía MCP)
  2. Analizar velocity y capacidad del equipo
  3. Sugerir priorización de tareas
  4. Crear tareas en Linear con labels y estimados
Resultado: sprint planeado con tareas creadas
```

> **Pro tip de la guía:** los creadores más efectivos iteran sobre **una sola
> tarea difícil** hasta que Claude la resuelve bien, y recién ahí extraen el
> enfoque ganador a una skill. Si el usuario todavía no logró la tarea ni una
> vez a mano, sugerirle hacerlo primero — da señal mucho más rápida que diseñar
> en abstracto.

---

## PHASE 2: Categoría y patrón

### Step 1 — Elegir categoría

Usar `AskUserQuestion` (`header: "Categoría"`) si no es evidente:

| Categoría | Para qué | Técnicas clave |
|---|---|---|
| **1. Creación de documentos y assets** | Output consistente y de alta calidad: documentos, presentaciones, apps, diseños, código | Style guides embebidos, plantillas, checklists de calidad, sin herramientas externas |
| **2. Automatización de workflow** | Procesos multi-paso que se benefician de una metodología consistente | Pasos con validation gates, plantillas, loops de refinamiento |
| **3. Enhancement de MCP** | Guía de workflow sobre el acceso que da un servidor MCP | Coordina varias llamadas MCP en secuencia, embebe expertise, maneja errores de MCP |

### Step 2 — Elegir el framing

- **Problem-first:** "necesito armar un workspace de proyecto" → la skill
  orquesta las llamadas correctas en el orden correcto. El usuario describe el
  resultado; la skill maneja las herramientas.
- **Tool-first:** "tengo Notion MCP conectado" → la skill le enseña a Claude los
  workflows óptimos. El usuario ya tiene acceso; la skill aporta el expertise.

### Step 3 — Elegir patrón

Consultar `references/patterns.md` para la estructura completa de cada patrón:

| Patrón | Usar cuando |
|---|---|
| **1. Orquestación secuencial** | El proceso tiene pasos en un orden específico con dependencias |
| **2. Coordinación multi-MCP** | El workflow cruza varios servicios |
| **3. Refinamiento iterativo** | La calidad del output mejora iterando |
| **4. Selección contextual de herramienta** | Mismo resultado, distinta herramienta según contexto |
| **5. Inteligencia de dominio** | La skill aporta conocimiento especializado más allá del acceso a herramientas |

Una skill puede combinar patrones, pero si no encaja en ninguno, revisar si en
realidad son dos skills.

---

## PHASE 3: Frontmatter (la parte más importante)

Consultar `references/frontmatter-reference.md` para todos los campos y reglas.

### Reglas duras (bloqueantes)

| Regla | Detalle |
|---|---|
| Nombre de carpeta | kebab-case. No espacios, no guiones bajos, no mayúsculas |
| Archivo | Exactamente `SKILL.md` (case-sensitive). No `SKILL.MD`, no `skill.md` |
| `name` | kebab-case, debe coincidir con el nombre de la carpeta |
| `description` | Obligatoria. Debe incluir **QUÉ hace** y **CUÁNDO usarla**. Máx. 1024 caracteres |
| Prohibido | Corchetes angulares XML en el frontmatter. Nombres con "claude" o "anthropic" (reservados) |
| Prohibido | `README.md` dentro de la carpeta de la skill — la doc va en `SKILL.md` o `references/` |

> **Por qué la restricción de XML:** el frontmatter entra en el system prompt de
> Claude. Contenido malicioso ahí podría inyectar instrucciones.

### Redactar la `description`

Fórmula: **[qué hace] + [cuándo usarla] + [capacidades clave]**

Tomar las frases literales que el usuario dio en PHASE 1 (pregunta 2) y meterlas
como disparadores. Si la skill compite con otra parecida, agregar
**disparadores negativos** (`Do NOT use to…`) para evitar sobre-disparo.

```yaml
# Bien — específica, accionable, con disparadores
description: Analiza archivos de diseño de Figma y genera documentación de
  handoff para desarrollo. Use when user uploads .fig files, asks for "design
  specs", "component documentation", or "design-to-code handoff".

# Mal — demasiado vaga, nunca va a disparar bien
description: Ayuda con proyectos.

# Mal — sin disparadores, Claude no sabe cuándo cargarla
description: Crea sistemas de documentación multi-página sofisticados.

# Mal — técnica, sin lenguaje de usuario
description: Implementa el modelo de entidad Project con relaciones jerárquicas.
```

Checklist de la `description` antes de seguir:
- [ ] Dice qué hace la skill
- [ ] Dice cuándo usarla, con frases que el usuario realmente diría
- [ ] Menciona tipos de archivo si son relevantes (`.fig`, `.csv`, `.pdf`)
- [ ] Tiene disparadores negativos si hay skills vecinas
- [ ] Menos de 1024 caracteres, sin `<` ni `>`

---

## PHASE 4: Estructura de carpetas

```
<skill-name>/
├── SKILL.md          # Requerido — instrucciones principales
├── scripts/          # Opcional — código ejecutable (Python, Bash)
├── references/       # Opcional — documentación cargada bajo demanda
└── assets/           # Opcional — plantillas, fuentes, íconos usados en el output
```

Decidir con el usuario qué carpetas hacen falta. Regla: **empezar con solo
`SKILL.md`** y agregar carpetas cuando haya contenido real que justifique cada
una. Una skill con `references/` vacía es ruido.

### Los tres niveles de progressive disclosure

| Nivel | Qué es | Cuándo se carga |
|---|---|---|
| 1 | Frontmatter YAML | Siempre, en el system prompt |
| 2 | Cuerpo de `SKILL.md` | Cuando Claude cree que la skill es relevante |
| 3 | Archivos enlazados (`references/`) | Solo cuando Claude decide navegarlos |

Aprovecharlo: mantener `SKILL.md` en las instrucciones core (**bajo 5.000
palabras**) y mover lo detallado a `references/` con enlaces explícitos.

---

## PHASE 5: Escribir las instrucciones

Consultar `references/skill-template.md` para la plantilla completa.

### Estructura recomendada

```markdown
# Nombre de la Skill

## Instructions
### Step 1: [Primer paso mayor]
Explicación clara de qué pasa.

## Examples
Example 1: [escenario común]
User says: "…"
Actions: 1. … 2. …
Result: …

## Troubleshooting
Error: [mensaje común]
Cause: [por qué pasa]
Solution: [cómo se arregla]
```

### Reglas de redacción

| Regla | Bien | Mal |
|---|---|---|
| **Específica y accionable** | ``Correr `python scripts/validate.py --input {filename}` para chequear formato`` | "Validar los datos antes de seguir" |
| **Sin ambigüedad** | "CRITICAL: antes de llamar a `create_project`, verificar: nombre no vacío, al menos un miembro asignado, fecha de inicio no pasada" | "Asegurate de validar bien las cosas" |
| **Concisa** | Bullets y listas numeradas; lo detallado a `references/` | Párrafos largos que Claude no sigue |
| **Instrucciones críticas arriba** | Encabezados `## Important` / `## Critical` al principio | Regla clave enterrada en el medio |

### Incluir siempre

1. **Manejo de errores** — una sección de issues comunes con causa y solución.
2. **Ejemplos** — al menos un escenario end-to-end con lo que dice el usuario,
   las acciones y el resultado.
3. **Enlaces explícitos a los references** — no basta con que el archivo exista:

```markdown
Antes de escribir queries, consultar `references/api-patterns.md` para:
- Guía de rate limiting
- Patrones de paginación
- Códigos de error y manejo
```

> **Técnica avanzada:** para validaciones críticas, conviene empaquetar un
> script que las haga programáticamente en vez de confiar en instrucciones en
> lenguaje natural. El código es determinista; la interpretación del lenguaje no.

---

## PHASE 6: Criterios de éxito y tests

Definir con el usuario cómo se va a saber si la skill funciona. Son objetivos
aspiracionales, no umbrales exactos.

| Tipo | Métrica | Cómo se mide |
|---|---|---|
| Cuantitativa | Dispara en el 90% de las queries relevantes | Correr 10–20 queries de prueba; contar cuántas veces carga sola vs. requiere invocación explícita |
| Cuantitativa | Completa el workflow en X llamadas a herramientas | Comparar la misma tarea con y sin la skill; contar llamadas y tokens |
| Cuantitativa | 0 llamadas fallidas por workflow | Monitorear logs del MCP durante las corridas |
| Cualitativa | El usuario no necesita indicar los siguientes pasos | Anotar cuántas veces hay que redirigir o aclarar |
| Cualitativa | El workflow termina sin corrección del usuario | Correr el mismo pedido 3–5 veces y comparar consistencia |

Generar la batería de disparo (el usuario la corre después):

```
Debería disparar:
- "<frase literal del caso de uso 1>"
- "<parafraseo del caso de uso 1>"
- "<frase literal del caso de uso 2>"

NO debería disparar:
- "<query de un dominio vecino>"
- "<query genérica no relacionada>"
```

---

## PHASE 7: Validación y cierre

Correr la checklist antes de entregar:

- [ ] Carpeta en kebab-case
- [ ] `SKILL.md` existe con ese nombre exacto (case-sensitive)
- [ ] Frontmatter con delimitadores `---`
- [ ] `name` en kebab-case, coincide con la carpeta, sin "claude"/"anthropic"
- [ ] `description` con QUÉ y CUÁNDO, bajo 1024 caracteres
- [ ] Sin `<` ni `>` en ninguna parte del frontmatter
- [ ] Sin `README.md` dentro de la carpeta
- [ ] Instrucciones claras y accionables
- [ ] Manejo de errores incluido
- [ ] Ejemplos incluidos
- [ ] References enlazados explícitamente desde `SKILL.md`
- [ ] `SKILL.md` bajo 5.000 palabras

### Handoff

Mostrar un resumen:
- Ruta de la carpeta y archivos creados.
- Los 2–3 casos de uso que cubre.
- La batería de tests de disparo para que el usuario la corra.

Decir:
> "Skill creada en `<ruta>`. Corré las queries de disparo para verificar que
> carga cuando debe. Para una revisión completa con puntaje y riesgos de
> sobre/sub-disparo, usá `/skill-evaluator <ruta>`."

Stop — no correr la skill nueva ni empezar a usarla.

---

## CRITICAL: Output Language

El contenido de `SKILL.md` en el idioma del proyecto donde vive la skill (para
este workspace: español). Excepción: identificadores técnicos, nombres de
campos del frontmatter, rutas y código siempre en inglés. Los disparadores de
la `description` deben estar en el **idioma en que el usuario realmente habla**
— si el usuario pide cosas en español, los disparadores van en español (y
conviene incluir también los equivalentes en inglés si usa ambos).

---

## Common Issues

| Issue | Causa | Resolución |
|---|---|---|
| El usuario no sabe qué casos de uso poner | Idea todavía difusa | No avanzar: pedirle que describa la última vez que hizo la tarea a mano, paso a paso |
| La skill quiere hacer demasiado | Varios workflows sin relación mezclados | Partir en dos skills; cada una con su `description` y disparadores negativos cruzados |
| `description` genérica ("ayuda con X") | Se saltó PHASE 1 | Volver a los casos de uso y extraer las frases literales del usuario |
| `SKILL.md` gigante | Todo inline en vez de progressive disclosure | Mover lo detallado a `references/` y enlazarlo |
| Choca con una skill existente | Alcances solapados | Agregar disparadores negativos en ambas (`Do NOT use to…`) |
| Nombre inválido | Espacios, mayúsculas o guiones bajos | Convertir a kebab-case: `My Cool Skill` → `my-cool-skill` |

---

## Example

**Input:** "Quiero una skill que me arme el reporte semanal de incidentes"

**Flujo:**
1. PHASE 1: entrevista → 2 casos de uso. Frases literales: "armá el reporte
   semanal", "reporte de incidentes de esta semana". Herramientas: MCP de
   monitoreo + un script de validación.
2. PHASE 2: categoría 3 (enhancement de MCP), framing problem-first, patrón 3
   (refinamiento iterativo — el reporte mejora con validación y re-generación).
3. PHASE 3: `name: incident-weekly-report`; `description` con qué + cuándo +
   las frases literales + `Do NOT use for ad-hoc incident queries`.
4. PHASE 4: `SKILL.md` + `scripts/check_report.py` + `references/severity-rules.md`.
5. PHASE 5: instrucciones con draft inicial → quality check → loop de
   refinamiento → finalización, más troubleshooting de conexión al MCP.
6. PHASE 6: batería de disparo (3 positivas, 2 negativas) + baseline de tokens.
7. PHASE 7: checklist OK → handoff.

**Salida:**
> "Skill creada en `incident-weekly-report/`. Corré las queries de disparo para
> verificar que carga cuando debe. Para revisión completa, usá
> `/skill-evaluator incident-weekly-report/`."
