# Constitution Template

Produce exactly this structure. Replace all `<placeholders>` with real content.
Remove optional articles/sections that have no content. Keep the document
normative (MUST/SHALL), concise, and focused on the non-negotiable.

---

```markdown
---
version: <MAJOR.MINOR.PATCH>
ratified: <YYYY-MM-DD>
last_amended: <YYYY-MM-DD>
---

# Constitución del Proyecto — <nombre del proyecto>

## Propósito

Este documento define los principios **no-negociables** que gobiernan el
diseño, la implementación y la revisión de código de este proyecto. Es
**normativo** (usa DEBE / NUNCA), no descriptivo. Ante conflicto entre este
documento y cualquier otra guía (`docs/`, comentarios, costumbre), **prevalece
la constitución**.

Las skills del flujo lo consumen así:
- `/design` valida los **Quality Gates** antes de aprobar un contrato.
- `/plan` respeta los artículos al generar tareas.
- La revisión de código (humana o `conventions-reviewer`) chequea cumplimiento.

---

## Principios (Artículos)

### Artículo 1: <Nombre corto del principio>

**Principio:** <regla en forma MUST/SHALL, testable — un revisor puede
responder sí/no si un cambio la cumple>.

**Razón:** <por qué es no-negociable, 1 oración>.

**Cómo se verifica:** <en qué gate/fase se chequea: review · `/design` ·
`/plan` · CI · test>.

<!-- Repeat "### Artículo N" for each principle. Aim for 6–10 total. -->

---

## Quality Gates obligatorios

Checklist binaria que `/design` (y donde aplique `/plan`) debe pasar antes de
aprobar. Cada gate se cumple o se documenta explícitamente por qué no aplica.

- [ ] **Simplicity Gate** — <criterio: no agregar capas/proyectos/abstracciones
  sin un caso de uso presente que lo justifique>.
- [ ] **Anti-Abstraction Gate** — <criterio: usar el framework/librería directo
  antes de envolverlo en una abstracción propia>.
- [ ] **Integration-First Gate** — <criterio: contrato (OpenAPI/schema) y
  contract tests definidos antes de implementar el endpoint>.
- [ ] **Test-First Gate** — <criterio: el test se escribe y falla antes del
  código de producción>.

<!-- Add project-specific gates (e.g. Accessibility Gate) or remove any that
     do not apply. Keep only the ones actually enforced. -->

---

## Restricciones de flujo de trabajo

<!-- OPTIONAL: constraints on branching, commits, releases, environments that
     are non-negotiable but don't fit as an "Artículo". Remove if empty. -->

- <ej: Nunca ejecutar `/build` sobre `main`/`master`.>
- <ej: Conventional commits obligatorios: `tipo(SM-XXXX): descripción`.>

---

## Gobernanza

**Enmiendas:** cualquier cambio a este documento se hace vía `/constitution`
(modo enmendar), con versión actualizada y fecha en `last_amended`.

**Versionado semántico del documento:**
- **MAJOR** — se elimina o redefine un principio de forma incompatible.
- **MINOR** — se agrega un principio, gate o sección nueva.
- **PATCH** — aclaración de redacción sin cambiar el alcance.

**Precedencia:** ante conflicto, esta constitución prevalece sobre `docs/` y
sobre cualquier convención tácita. Si una historia necesita violar un
principio, eso es una excepción explícita que debe justificarse y aprobarse,
no una decisión silenciosa de implementación.
```

---

## Rules for each section

**Front-matter:** `version` en formato semver. `ratified` es la fecha de la
primera versión y no cambia en enmiendas; `last_amended` se actualiza siempre.

**Artículos:** cada uno debe ser testable. Si no se puede escribir "Cómo se
verifica" de forma concreta, el principio es demasiado vago — reformularlo o
descartarlo. Preferir pocos artículos fuertes a muchos débiles.

**Quality Gates:** son binarios y los aplica `/design`. No mezclar un gate
(chequeo puntual antes de aprobar) con un artículo (principio permanente).

**Restricciones de flujo:** solo lo no-negociable. Lo "preferible" va en `docs/`.

**Idioma:** el cuerpo en el idioma de la documentación del proyecto; los nombres
de gates pueden quedar en inglés; identificadores y rutas siempre en inglés.
