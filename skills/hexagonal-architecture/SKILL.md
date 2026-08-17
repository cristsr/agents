---
name: hexagonal-architecture
description: >
  Enforces module-oriented hexagonal architecture (Ports and Adapters + DDD) in
  any codebase: layer boundaries, folder layout, naming, where each port lives,
  binding ports to adapters, and the exception hierarchy. Stack-agnostic — the
  concrete syntax per framework lives in the framework skill the project declares
  (e.g. `nestjs`). BUILD mode only: start a project,
  add a module, wire adapters. To audit an existing codebase use /hexagonal-audit.
  Use when the user says "hexagonal architecture", "structure the project",
  "create a module", "where does this port go", "is this domain or application",
  "start the project with hexagonal", or when creating or editing a module,
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

**Announce at start:** "I'll structure this with hexagonal architecture. Starting from the domain."

**Output:** source files in the canonical layout, plus the module wiring.

## Instructions

CRITICAL: The rules are MANDATORY. They define where every file lives, what each
layer may import, and how abstractions are bound to implementations. Violations
are architectural debt, not style preferences.

1. **Load the rules first:** `references/rules.md` — the single source of the
   hexagonal rules (dependency direction, canonical structure, layer topology,
   domain/application/infrastructure rules, wiring). Never skip it.
2. **Resolve the stack:** from the profile (stack block): `LANGUAGE`, `FRAMEWORK`,
   `MODULE_ROOT`, `IDENTIFIER_LANGUAGE`, and `SKILLS`. This skill is stack-agnostic —
   the rules never change; what changes is the **dialect** that expresses them, and
   that comes from the framework skill the project declares in `stack.SKILLS`:
   - NestJS project (`SKILLS` includes `nestjs`) → load it with the Skill tool and
     use its references for the binding syntax:
     - the `nestjs` skill's `references/nestjs-binding.md` — DI tokens, wiring,
       decorators, persistence.
     - the `nestjs` skill's `references/module-blueprint.md` — the Nest project/module
       phases.
     - the `typescript` skill's `references/errors-and-logging.md` — the exception
       base form (`BaseException`, formatter); this skill's
       `references/exception-placement.md` — the two families, where exceptions
       live and where to catch.
   - No framework skill declared (plain TS, Express, CLI, frontend) → the generic
     rules + the profile's conventions apply; the DI/binding rules are simply N/A
     and are not loaded. Ask about any syntax doubts.

> Companion skills: the project's language skill (for TS: `typescript`),
> `error-handling` (try/catch mechanics), `design-principles` (SOLID/DRY/YAGNI).
> This skill governs **placement and boundaries**. To audit: `/hexagonal-audit`.

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
**module**, then by **layer**. A layer root holds folders, not files. The full
layout, the single-entity `domain/` exception and the barrel/alias rules are in
`references/rules.md` — read it; don't rebuild the tree here.

---

## Phases (BUILD)

Inside-out order (domain first) — that way the dependency direction is correct by
construction. The framework dialect details the concrete syntax (the `nestjs` skill's
`references/module-blueprint.md`, if the project declares a framework skill).

### Phase 0 — Bootstrap (new project only)
1. Shared kernel before any feature module: types, base exceptions, value objects
   (uuid, date), application ports (event emitter).
2. Exception hierarchy — see `references/exception-placement.md` (the two families
   + where to catch); the base form is the language skill's (for TS, the `typescript`
   skill's `references/errors-and-logging.md`).
3. Per-module aliases (app + test config) — the language skill's convention (for TS,
   the `typescript` skill's `references/path-alias-setup.md`).

### Phase 1 — Domain
1. Name the module (bounded context) and its aggregates.
2. Entity: private constructor + static factory, behavior in the entity,
   business constants in the entity.
3. Enum (key = value), repository (port) and data-source port if the domain calls for it.
4. Domain exception; a domain service only if it crosses aggregates/ports.
5. Barrels in every folder that has content.

### Phase 2 — Application
1. Application ports (what the use cases drive).
2. One use case per intent, a single `execute()`, abstractions in the constructor.
3. Input/output DTOs + application mapper (one direction: domain → transport).

### Phase 3 — Infrastructure
1. Persistence: schema entity ≠ domain entity + mapper + repository.
2. External providers: retry, mapping before the error handler, read degrades /
   write throws a typed exception, config read in the constructor body.
3. Thin driving adapters: controllers/schedulers/events/bootstrap only delegate;
   the catch-and-log policy for those outside a request is
   `references/exception-placement.md`.

### Phase 4 — Wiring (composition root)
1. Every port bound to exactly one adapter in the module file.
2. Every driving adapter registered + a wiring test asserting it.
3. Module registration at the root; alias in app + test config.
4. Cross-module: only exported use cases or events, wrapped in a local port
   (anti-corruption layer).

---

## Naming Quick Reference

The full table — entities, enums, ports, services, use cases, DTOs, adapters,
module — is in `references/rules.md` (single source). Its two lines that decide
boundaries here: role suffixes identify the layer's artifacts, and the exact case
rules come from the language/framework skills (`nestjs` on Nest projects) +
`IDENTIFIER_LANGUAGE`.

---

## Common Issues

**Error:** the DI container can't resolve a use case's dependencies (in NestJS:
"Can't resolve dependencies of XUsecase (?)")
- Cause: the port isn't usable as a DI token (in TS: an `interface`), or its
  binding is missing from the module.
- Fix: declare the abstraction per the stack and bind it in the composition root.

**Error:** A webhook/event type is silently ignored
- Cause: the handler isn't registered, or the branching isn't exhaustive.
- Fix: register it and assert it with a wiring test; exhaustive matching.

**Error:** Circular import between barrels
- Cause: a file inside the aggregate imports its sibling through the module's barrel.
- Fix: relative imports inside the aggregate's folder; barrels only between folders.

**Error:** A business rule duplicated in a controller and a scheduler
- Cause: logic in the driving adapter instead of the use case.
- Fix: move it to the use case, or to the entity if it's an invariant.

**Error:** Changing the persistence engine touches dozens of files
- Cause: the domain entity is the ORM's entity, or the repos return ORM documents.
- Fix: split the classes and introduce a mapper — see the stack's blueprint.

---

## Example

**User says:** "create a reports module that reads from Postgres and exposes an endpoint"

Shown in TypeScript — the shape is identical in any language; only the file
extensions and the binding syntax differ (per the language/framework skills).

**Actions:**
1. Announce, load `references/rules.md` + the stack's blueprint.
2. `domain/report/` — entity (private constructor + `create`), enum, repository
   port, barrel.
3. `application/usecases/retrieve-report.usecase.ts` with a single `execute`, output
   DTO and mapper.
4. `infrastructure/adapters/persistence/postgres/report/` — schema entity, mapper,
   repository implementing the port. `infrastructure/adapters/http/report.controller`
   only delegating.
5. `report.module` binding port → adapter; register the module and add the alias
   in app + test config.

**Result:** the module compiles, the controller has no logic, and swapping Postgres
is a one-line change.

---

## CRITICAL: Output Language

Code, identifiers, paths and file names in English (or `IDENTIFIER_LANGUAGE`).

**Chat interaction follows the user's language** (`OUTPUT_LANGUAGE` in the profile).
The message samples in this document are written in English; render them in the
user's language when that differs.
