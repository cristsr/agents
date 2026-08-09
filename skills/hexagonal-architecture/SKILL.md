---
name: hexagonal-architecture
description: >
  Enforces module-oriented hexagonal architecture (Ports and Adapters + DDD) in
  any codebase: layer boundaries, folder layout, naming, where each port lives,
  binding ports to adapters, and the exception hierarchy. Stack-agnostic — the
  concrete syntax per stack lives in the STACK_REFS pack (ej.
  typescript-nestjs/architecture/). BUILD mode only: start a project, add a
  module, wire adapters. To audit an existing codebase use /hexagonal-audit.
  Use when the user says "arquitectura hexagonal", "estructurar el proyecto",
  "crear un modulo", "donde va este puerto", "esto es dominio o aplicacion",
  "arranca el proyecto con hexagonal", or when creating or editing a module,
  port, use case or entity file. Do NOT use to audit code (use /hexagonal-audit),
  for TypeScript syntax (use typescript), try/catch rules (use error-handling),
  SOLID reasoning (use design-principles), C4 diagrams of the whole system (use
  architecture), or reading the codebase for a user story (use scan).
metadata:
  author: styve
  version: "3.0"
  tags: [hexagonal, ports-adapters, ddd, clean-architecture, modules, conventions]
  category: architecture
---

# Hexagonal Architecture — BUILD (Module-Oriented)

**Announce at start:** "Voy a estructurar esto con arquitectura hexagonal. Arranco por el dominio."

**Output:** source files in the canonical layout, plus the module wiring.

## Instructions

CRITICAL: The rules are MANDATORY. They define where every file lives, what each
layer may import, and how abstractions are bound to implementations. Violations
are architectural debt, not style preferences.

1. **Load the rules first:** `references/rules.md` — the single source of the
   hexagonal rules (dependency direction, canonical structure, layer topology,
   domain/application/infrastructure rules, wiring). Never skip it.
2. **Resolve the stack:** del profile (sección 7): `LANGUAGE`, `FRAMEWORK`,
   `DI_TOKENS`, `DTO_STYLE`, `MODULE_ROOT`, `IDENTIFIER_LANGUAGE`; y
   `<STACK_REFS>` (sección 7) para la concreción por stack. Si el proyecto usa
   NestJS/TypeScript, cargar del pack:
   - `<STACK_REFS>/architecture/module-blueprint.md` — blueprint de proyecto y
     módulo (fases 0-4 con sintaxis concreta).
   - `<STACK_REFS>/architecture/nestjs-binding.md` — DI tokens, wiring,
     decorators, persistence (NestJS).
   - `<STACK_REFS>/architecture/errors-and-logging.md` — jerarquía de
     excepciones y formatter de logs (implementación TS).
   Si `STACK_REFS` no está definido o no tiene `architecture/`, usar las reglas
   genéricas + las convenciones del profile y preguntar por las dudas de sintaxis.

> Companion skills: `typescript` (syntax), `error-handling` (try/catch mechanics),
> `design-principles` (SOLID/DRY/YAGNI). This skill governs **placement and
> boundaries**. Para auditar: `/hexagonal-audit`.

---

## The Non-Negotiable Rule: Dependency Direction

CRITICAL: Dependencies point inward only. `domain` knows nothing. `application`
knows `domain`. `infrastructure` knows both. Nothing outer is ever imported by
something inner. The only framework import allowed above `infrastructure` is the
DI marker. See `references/rules.md` for the full matrix.

```
infrastructure  ──►  application  ──►  domain
     (adapters)        (use cases)      (entities, VOs, domain services, repositories)
```

---

## Canonical Structure

CRITICAL: One folder per bounded module at the source root. Never group by
technical type (`controllers/`, `services/`) at the top level — group by
**module**, then by **layer**. A layer root holds folders, not files. Full layout
and the single-entity `domain/` exception in `references/rules.md`.

```
src/
├── shared/                             # shared kernel — NOT a module for business logic
└── <module>/                           # bounded context
    ├── domain/         entities, VOs, repos (ports), domain services, exceptions
    ├── application/    usecases/ ports/ dto/ mappers/ exceptions/ types/
    ├── infrastructure/ adapters/ (driving + driven) · config/
    └── <module>.module                 # composition root, at the module ROOT
```

---

## Phases (BUILD)

Orden inside-out (dominio primero) — así la dirección de dependencias queda
correcta por construcción. El blueprint por stack detalla la sintaxis concreta
(`<STACK_REFS>/architecture/module-blueprint.md` si existe).

### Phase 0 — Bootstrap (solo proyecto nuevo)
1. Shared kernel antes que cualquier feature module: types, exceptions base,
   value objects (uuid, fecha), ports de aplicación (event emitter).
2. Jerarquía de excepciones — ver `<STACK_REFS>/architecture/errors-and-logging.md`.
3. Aliases por módulo (app + test config) — convención del stack.

### Phase 1 — Domain
1. Nombrar el módulo (bounded context) y sus agregados.
2. Entidad: constructor privado + factory estática, comportamiento en la entidad,
   constantes de negocio en la entidad.
3. Enum (key = value), repositorio (port) y data-source port si el dominio lo llama.
4. Excepción de dominio; service de dominio solo si cruza agregados/ports.
5. Barrels en cada carpeta con contenido.

### Phase 2 — Application
1. Puertos de aplicación (lo que los use cases conducen).
2. Un use case por intento, un solo `execute()`, abstracciones en el constructor.
3. DTOs input/output + mapper de aplicación (una dirección: dominio → transporte).

### Phase 3 — Infrastructure
1. Persistencia: schema entity ≠ entidad de dominio + mapper + repository.
2. Providers externos: retry, mapping antes del error handler, read degrada /
   write lanza excepción tipada, config leída en el cuerpo del constructor.
3. Adaptadores driving delgados: controllers/schedulers/events/bootstrap solo
   delegan; los que corren fuera de un request CATCH y loguean.

### Phase 4 — Wiring (composition root)
1. Todo port atado a un único adapter en el module file.
2. Todo driving adapter registrado + wiring test que lo afirme.
3. Registro del módulo en el root; alias en app + test config.
4. Módulos cruzados: solo use cases exportados o eventos, envueltos en un port local
   (anti-corruption layer).

---

## Naming Quick Reference

| Artifact | Convention |
|----------|------------|
| Entity | `<entity>` |
| Repository (port) | `<entity>.repository` |
| Data-source port | `<entity>-data-source.port` |
| Use case | `<action>-<entity>.usecase` |
| Input / Output DTO | `<name>.input.dto` / `<name>.output.dto` |
| Module | `<module>.module` |

Files kebab-case, clases PascalCase, enum SCREAMING_SNAKE (per stack). Los
suffixes exactos salen del pack de stack + `IDENTIFIER_LANGUAGE`.

---

## Common Issues

**Error:** "Can't resolve dependencies of XUsecase (?)"
- Cause: el port no es usable como token DI (en TS: `interface`), o falta su
  binding en el módulo.
- Fix: declarar la abstracción según el stack y bindearla en el composition root.

**Error:** Un webhook/event type es ignorado silenciosamente
- Cause: el handler no está registrado, o el branching no es exhaustivo.
- Fix: registrarlo y afirmarlo con un wiring test; matching exhaustivo.

**Error:** Circular import entre barrels
- Cause: un archivo dentro del agregado importa su hermano a través del barrel del módulo.
- Fix: imports relativos dentro de la carpeta del agregado; barrels solo entre carpetas.

**Error:** Regla de negocio duplicada en un controller y un scheduler
- Cause: lógica en el driving adapter en vez del use case.
- Fix: moverla al use case, o a la entidad si es un invariante.

**Error:** Cambiar el motor de persistencia toca decenas de archivos
- Cause: la entidad de dominio es la entidad del ORM, o los repos devuelven
  documentos del ORM.
- Fix: separar las clases e introducir un mapper — ver blueprint del stack.

---

## Example

**User says:** "creá un módulo de reportes que lea de Postgres y exponga un endpoint"

**Actions:**
1. Announce, load `references/rules.md` + el blueprint del stack.
2. `domain/report/` — entidad (constructor privado + `create`), enum, port del
   repositorio, barrel.
3. `application/usecases/retrieve-report.usecase.ts` con un solo `execute`, DTO de
   salida y mapper.
4. `infrastructure/adapters/persistence/postgres/report/` — schema entity, mapper,
   repository implementando el port. `infrastructure/adapters/http/report.controller`
   delegando solo.
5. `report.module` binding port → adapter; registrar el módulo y agregar el alias
   en app + test config.

**Result:** el módulo compila, el controller no tiene lógica, y cambiar Postgres
es un cambio de una línea.

---

## CRITICAL: Output Language

Interacción en el idioma del usuario (o `OUTPUT_LANGUAGE` del profile). Código,
identificadores, rutas y nombres de archivos en inglés (o `IDENTIFIER_LANGUAGE`).
