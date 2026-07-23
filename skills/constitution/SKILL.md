---
name: constitution
description: >
  Creates or amends a project's constitution — the document of non-negotiable
  principles governing design, implementation, and review. Generic: works for
  any project, not just this workspace. Interviews the developer by category
  (architecture, testing, security, code quality, data, dependencies,
  delivery), takes the best of Spec Kit (articles, quality gates,
  semantic-versioned governance) and Kiro (EARS-style testable principles,
  inclusion modes), and produces a polished constitution.md.
  Use when the user says "/constitution", "crear constitución",
  "definir principios del proyecto", "generar constitution.md", "enmendar la
  constitución", "actualizar principios", "reglas no-negociables del proyecto",
  or wants to establish or amend project-wide governing principles that other
  skills (design, plan) must validate against.
  Do NOT use to edit a single user story's artifacts (use /refine), to capture
  per-story technical context (use /clarify), or to document code conventions
  that are descriptive rather than governing (those live in docs/).
---

# constitution

## Perfil del proyecto (leer primero, siempre)

Esta skill ya es agnóstica (sirve para cualquier proyecto). Aun así, leé
`.agents/profile.md` (en la raíz del proyecto actual) para tomar el `OUTPUT_LANGUAGE` (idioma de salida) y el
`PROJECT_NAME`. La constitución que produce es la fuente que valida el resto del
flujo: `/design` chequea sus quality gates y `/plan` la respeta.

---

## Overview

La **constitución** es el conjunto de principios no-negociables de un proyecto.
A diferencia de la documentación descriptiva (`docs/`), la constitución es
**normativa** (usa MUST/SHALL) y es la fuente contra la que otras skills validan
cumplimiento: `/design` chequea sus quality gates antes de aprobar un contrato,
y `/plan` la respeta al generar tareas.

Esta skill es **genérica** — no asume la estructura de este workspace. Funciona
para crear la constitución de cualquier proyecto.

**Announce at start:** "Vamos a definir la constitución del proyecto." (o
"…enmendar la constitución del proyecto." si ya existe).

**Output:** un `constitution.md` (ruta configurable — ver PHASE 1).

**Core principle:** capturar solo lo **no-negociable**. Si algo es "preferible
pero negociable", va en `docs/`, no acá. Una constitución con 30 artículos no
se cumple; apuntar a 6–10 artículos de alto impacto.

---

## PHASE 1: Resolve destination and mode

### Step 1 — Determine the file path

Preguntar/elegir dónde vive la constitución, con este orden de preferencia:
1. Si el usuario pasó una ruta explícita → usarla.
2. Si ya existe un `constitution.md` en la raíz donde corre Claude Code (el
   directorio de trabajo primario) → usar ese.
3. Si no, el default es `constitution.md` en la raíz del proyecto (junto a
   `CLAUDE.md`). Es la ubicación estándar: visible, versionada con el repo y en
   la raíz que las skills leen. El usuario puede overridear a otra ruta
   (ej. `docs/constitution.md`) si lo prefiere.

### Step 2 — Detect create vs. amend

```bash
CONST=<ruta resuelta>
if [ -s "$CONST" ]; then echo "EXISTE_CON_CONTENIDO"; \
elif [ -f "$CONST" ]; then echo "EXISTE_VACIO"; \
else echo "NO_EXISTE"; fi
```

- `NO_EXISTE` o `EXISTE_VACIO` → **modo Crear**. Versión inicial `1.0.0`.
- `EXISTE_CON_CONTENIDO` → **modo Enmendar**. Leer el archivo completo, extraer
  la versión actual del front-matter y los artículos ya definidos. Usar
  `AskUserQuestion` (`header: "Constitución"`, opciones
  `"Enmendar (agregar/ajustar artículos)"` / `"Reescribir desde cero"`).
  En modo Enmendar, **preservar** los artículos que el usuario no toca.

### Step 3 — Seed from existing documentation (optional)

Si el proyecto ya tiene documentación de convenciones/arquitectura, ofrecer
extraer candidatos a principios de ahí antes de entrevistar — evita repreguntar
lo ya escrito. Buscar señales:

```bash
ls docs/architecture/conventions.md docs/architecture/testing.md CONTRIBUTING.md 2>/dev/null
```

Si hay archivos, leerlos y proponer una lista de principios candidatos que el
usuario aprueba/descarta, en vez de arrancar de una hoja en blanco. Si no hay
nada, continuar con la entrevista limpia.

---

## PHASE 2: Interview by category

Recorrer las categorías **de a una**. Por cada una, hacer **una** pregunta
abierta corta y esperar la respuesta antes de la siguiente. El usuario puede
responder "skip"/"ninguno"/"no aplica" → esa categoría no genera artículo.

Para cada respuesta, ayudar a convertirla en un principio **testable** (ver
PHASE 3) — si la respuesta es vaga ("buen código"), repreguntar por el criterio
objetivo ("¿qué regla concreta hace que un cambio se rechace en review?").

### Categories (adapt the order to the project type)

| # | Category | Guiding question |
|---|-----------|---------------|
| C1 | **Arquitectura** | "¿Qué patrón/estructura es obligatorio y qué está prohibido? (ej: hexagonal, no lógica de negocio en controllers, abstract class como token DI)" |
| C2 | **Testing** | "¿Cuál es la disciplina de tests innegociable? (ej: TDD test-first, cobertura mínima, contract tests obligatorios para endpoints)" |
| C3 | **Seguridad** | "¿Qué reglas de seguridad no se pueden violar nunca? (ej: nunca loggear secretos, validar todo input externo, authz explícita por endpoint)" |
| C4 | **Calidad de código** | "¿Qué convenciones son de cumplimiento obligatorio, no sugerencias? (ej: naming, manejo de errores tipado, sin `any`)" |
| C5 | **Datos y migraciones** | "¿Cómo se gobiernan los cambios de esquema? (ej: migraciones SQL manuales, nunca `synchronize:true`, no borrar columnas en caliente)" |
| C6 | **Dependencias e integraciones** | "¿Qué límites hay para dependencias externas o llamadas entre servicios? (ej: no romper contrato de API vigente, no acoplar servicios por BD compartida)" |
| C7 | **Entrega y versionado** | "¿Qué reglas rigen commits, ramas y releases? (ej: conventional commits, nunca build en main, feature branch obligatoria)" |
| C8 | **Simplicidad** | "¿Cómo se controla el over-engineering? (ej: no abstraer hasta el 2º caso de uso, usar el framework directo, máximo N capas)" |

> Ajustá las categorías al proyecto: para una librería, C6 puede ser "API
> pública / semver"; para un frontend, C3 puede incluir accesibilidad. La
> tabla es una guía, no un formulario rígido.

### Focus rule

Después de la entrevista, si hay más de ~10 principios candidatos, priorizar
con el usuario: quedarse con los que, si se violan, **rompen el sistema o
generan retrabajo caro**. El resto se relega a `docs/`.

---

## PHASE 3: Draft testable principles

Cada artículo se redacta como principio **verificable**, no como deseo. Tomar
el estilo EARS/normativo:

- Usar **MUST / SHALL** (o su equivalente en español: "DEBE", "NUNCA").
- Formular de modo que un revisor pueda responder sí/no si un cambio lo cumple.
- Malo: "El código debe estar bien estructurado."
- Bueno: "Toda regla de negocio DEBE vivir en `application/` — un controller
  que contenga lógica de negocio se rechaza en review."

Por cada artículo capturar tres campos (ver `references/constitution-template.md`):
- **Principio** (la regla MUST/SHALL, testable).
- **Razón** (por qué es no-negociable — 1 oración).
- **Cómo se verifica** (en qué gate/fase se chequea: review, `/design`,
  `/plan`, CI, etc.).

---

## PHASE 4: Define the mandatory Quality Gates

Independientes de los artículos, la constitución declara **gates** que las
skills de diseño/plan aplican como checklist binaria. Proponer estos cuatro
(tomados de Spec Kit) y dejar que el usuario los active/edite/quite:

| Gate | What it enforces | Default |
|------|-----------|---------|
| **Simplicity Gate** | No introducir capas/proyectos/abstracciones sin un caso de uso presente que lo justifique | Activo |
| **Anti-Abstraction Gate** | Usar el framework/librería directamente antes de envolverlo en una abstracción propia | Activo |
| **Integration-First Gate** | Contrato (OpenAPI/schema) y contract tests definidos antes de implementar el endpoint | Activo |
| **Test-First Gate** | El test se escribe y falla antes del código de producción | Activo |

El usuario puede renombrar, desactivar o agregar gates propios (ej. un
"Accessibility Gate" en frontend). Registrar solo los activos.

---

## PHASE 5: Write the file

1. Consultar `references/constitution-template.md` para la estructura exacta.
2. Rellenar front-matter:
   - **modo Crear** → `version: 1.0.0`, `ratified: <fecha de hoy>`,
     `last_amended: <fecha de hoy>`.
   - **modo Enmendar** → subir la versión según impacto (regla en PHASE 6),
     `last_amended: <fecha de hoy>`, `ratified` sin cambios.
3. **CRITICAL (enmienda):** para no perder artículos previos, leer el archivo
   completo, mergear los artículos preservados con los nuevos/editados, y
   escribir todo junto — nunca escribir solo la sección nueva.
4. Guardar en la ruta resuelta en PHASE 1.

---

## PHASE 6: Versioning and close

### Semantic version rule (Amend mode)

| Change | Bump |
|--------|------|
| Se elimina o redefine un principio de forma incompatible | **MAJOR** (x+1.0.0) |
| Se agrega un principio o gate nuevo, o una sección | **MINOR** (x.y+1.0) |
| Aclaración de redacción sin cambiar el alcance | **PATCH** (x.y.z+1) |

### Handoff

Mostrar un resumen:
- Ruta del archivo, versión resultante.
- Lista de artículos (nombre) y gates activos.
- Qué cambió (solo en modo Enmendar).

Decir:
> "Constitución guardada en `<ruta>` (v`<versión>`). Las skills `/design` y
> `/plan` la validan como fuente de principios no-negociables. Si querés que
> el flujo la aplique, confirmá que `/design` y `/plan` la referencian."

Stop — no iniciar diseño ni plan.

---

## CRITICAL: Output Language

El contenido del `constitution.md` en el idioma que use el resto de la
documentación del proyecto (para este workspace: español). Excepción:
identificadores técnicos, nombres de archivos/rutas y código siempre en inglés.
Los nombres de los gates pueden quedar en inglés (son términos de arte).

---

## Common Issues

| Issue | Cause | Resolution |
|-------|-------|------------|
| Principios vagos ("buen código") | Respuesta no testable | Repreguntar por el criterio objetivo de rechazo en review |
| Demasiados artículos (>10) | Se mezcló lo negociable con lo no-negociable | Priorizar; mover lo negociable a `docs/` |
| Constitución ya existe con contenido | Re-ejecución | Preguntar enmendar vs reescribir; en enmendar, preservar lo no tocado |
| Archivo existe pero vacío (0 bytes) | Andamiaje previo sin poblar | Tratar como modo Crear, versión 1.0.0 |
| Usuario no sabe qué poner | Proyecto sin convenciones escritas | Sembrar desde `docs/`/CONTRIBUTING si existen, o usar los defaults de gates |

---

## Example

**Input:** `/constitution`

**Flujo (modo Crear, este workspace):**
1. PHASE 1: resuelve `constitution.md` en la raíz (no existe → modo Crear,
   v1.0.0). Detecta `docs/architecture/conventions.md` y `testing.md` → ofrece
   sembrar. Usuario acepta.
2. PHASE 2: entrevista. C1 → "hexagonal obligatorio, abstract class como token DI";
   C2 → "TDD test-first, contract tests para endpoints"; C5 → "migraciones SQL
   manuales, nunca synchronize:true"; C6 → "no romper contrato de API vigente";
   C7 → "conventional commits, nunca build en main". C3/C4/C8 → defaults.
3. PHASE 3: redacta cada uno como principio testable con razón + cómo se verifica.
4. PHASE 4: activa los 4 gates por default.
5. PHASE 5: escribe `constitution.md` v1.0.0.
6. PHASE 6: resumen — 6 artículos, 4 gates, v1.0.0.

**Salida:**
> "Constitución guardada en `constitution.md` (v1.0.0). Las skills
> `/design` y `/plan` la validan como fuente de principios no-negociables."
