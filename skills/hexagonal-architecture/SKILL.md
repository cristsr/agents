---
name: hexagonal-architecture
description: >
  Enforces module-oriented hexagonal architecture (Ports and Adapters + DDD) in TypeScript
  codebases: layer boundaries, folder layout, naming, where each port lives, binding ports to
  adapters, and the exception hierarchy. Framework-agnostic, with NestJS wiring in a reference.
  Two modes - BUILD (start a project, add a module) and AUDIT (review an existing codebase and
  report fixes). Use when the user says "arquitectura hexagonal", "estructurar el proyecto",
  "crear un modulo", "donde va este puerto", "esto es dominio o aplicacion", "revisa la
  arquitectura", "audita/auditalo el proyecto", "detectar mejoras de arquitectura", "esto respeta
  hexagonal", or when creating or editing a *.entity.ts, *.port.ts, *.usecase.ts or *.module.ts.
  Do NOT use for TypeScript syntax (use typescript), try/catch rules (use error-handling), SOLID
  reasoning (use design-principles), C4 diagrams of the whole system (use architecture), or
  reading the codebase for a user story (use scan).
metadata:
  author: styve
  version: "2.0"
  tags: [hexagonal, ports-adapters, ddd, clean-architecture, modules, audit, conventions, nestjs]
  category: architecture
---

# Hexagonal Architecture (Module-Oriented)

**Announce at start:**
- BUILD mode: "Voy a estructurar esto con arquitectura hexagonal. Arranco por el dominio."
- AUDIT mode: "Voy a auditar la arquitectura contra las reglas. Arranco mapeando el terreno."

**Output:**
- BUILD → source files in the canonical layout, plus the module wiring.
- AUDIT → a findings report ranked by severity. **Never edit code in AUDIT mode** unless the user
  asks for the fixes to be applied.

## Instructions

CRITICAL: These rules are MANDATORY. They define where every file lives, what each layer may
import, and how abstractions are bound to implementations. Violations are architectural debt,
not style preferences.

Pick the mode before doing anything else:

| Mode | Trigger | Load |
|------|---------|------|
| **BUILD** | Creating a project, adding a module, adding an adapter/use case | `references/module-blueprint.md` |
| **AUDIT** | Evaluating an existing project, finding improvements | `references/audit-guide.md` |

Other references, load when relevant:
- `references/errors-and-logging.md` — exception hierarchy and error logging contract.
- `references/nestjs-binding.md` — **NestJS specifics**: DI tokens, module wiring, decorators,
  Mongoose persistence, config factories. The rules below are framework-agnostic; that file is
  how they are realised in Nest. Read it whenever the project uses NestJS.

> Companion skills: `typescript` (syntax), `error-handling` (try/catch mechanics),
> `design-principles` (SOLID/DRY/YAGNI). This skill governs **placement and boundaries**.

---

## The Non-Negotiable Rule: Dependency Direction

CRITICAL: Dependencies point inward only. `domain` knows nothing. `application` knows `domain`.
`infrastructure` knows both. Nothing outer is ever imported by something inner.

```
infrastructure  ──►  application  ──►  domain
     (adapters)        (use cases)      (entities, VOs, domain services, repositories)
```

| Layer | MAY import | MUST NOT import |
|-------|-----------|-----------------|
| `domain` | `shared/domain`, pure libs (date, uuid, pattern matching) | any framework, ORM, HTTP client, `application/*`, `infrastructure/*` |
| `application` | `domain`, `shared/domain`, `shared/application`, the DI decorator only | any adapter, any SDK client, `infrastructure/*` |
| `infrastructure` | everything | another module's `domain` or `infrastructure` |

The **only** framework import allowed above `infrastructure` is the DI marker on use cases
(`@Injectable()` in Nest). A domain file with a decorator is a bug — see "Domain services" below.

---

## Canonical Structure

CRITICAL: One folder per bounded module at the source root. Never group by technical type
(`controllers/`, `services/`) at the top level — group by **module**, then by **layer**.

```
src/
├── shared/                             # shared kernel — NOT a module for business logic
│   ├── application/  exceptions/ ports/ logging/
│   ├── domain/       exception/ types/ value-objects/
│   ├── infrastructure/  adapters/http/ config/ decorators/ guards/ dtos/
│   └── shared.module.ts
│
└── <module>/                           # daily, okr, notification...
    ├── domain/
    │   ├── <aggregate>/                # one per aggregate root — flat when the module owns just one
    │   │   ├── <aggregate>.entity.ts
    │   │   ├── <aggregate>.enum.ts
    │   │   ├── <aggregate>.repository.ts        # abstract class
    │   │   ├── <aggregate>-data-source.port.ts  # driven port the DOMAIN needs
    │   │   ├── <aggregate>.service.ts           # domain service (plain class)
    │   │   ├── <aggregate>.exception.ts
    │   │   └── index.ts
    │   └── index.ts
    ├── application/
    │   ├── dto/ exceptions/ mappers/ ports/ types/ usecases/
    ├── infrastructure/
    │   ├── adapters/
    │   │   ├── bootstrap/ events/ http/ schedulers/   # driving
    │   │   ├── persistence/<db>/<aggregate>/          # driven
    │   │   └── <external>/                            # driven — provider + mapper
    │   └── config/<service>/
    └── <module>.module.ts              # at the module ROOT, not inside infrastructure
```

Create a folder only when it has content. An empty `exceptions/` with an empty barrel is noise.

### Layer topology — a layer root holds folders, not files

CRITICAL: Inside a layer, **every file belongs to a folder that names its role**. The root of
`domain/`, `application/` and `infrastructure/` carries nothing but its barrel; the root of a
module carries nothing but `<module>.module.ts`.

```
application/                 application/
├── usecases/                ├── usecases/
├── ports/                   ├── ports/
├── dto/                     ├── dto/
└── mappers/                 ├── task.repository.ts       ✗ orphan
                             ├── task-name.registry.ts    ✗ orphan
    correct                  └── posting-origin.ts        ✗ orphan
```

**One exception, and only one: a single-entity `domain/`.** When a module owns exactly one
entity, its domain files may sit flat at the root — there is nothing to tell apart, and a lone
`task/` folder inside `domain/` adds a level that carries no information. The moment a second
entity appears, one folder per aggregate root becomes mandatory and the first one moves too.

```
domain/                          domain/
├── notification.entity.ts       ├── okr-task/       ← entity, repository, service, port, exception
├── notification.repository.ts   ├── key-result/
└── index.ts                     ├── objective/
                                 └── index.ts
   one entity: flat is fine         several: one folder per aggregate, always
```

Grouping by aggregate, never by technical type — `entities/`, `repositories/`, `services/` inside
`domain/` is rule 2 broken one level down. The aggregate is what changes together; the file type
is not.

`application/` and `infrastructure/` have no such exception: they hold roles from the start.

CRITICAL: the first level of `application/` is **roles, and only roles** — `usecases/`,
`ports/`, `dto/`, `mappers/`, `repositories/`, `services/`, `types/`, `read-models/`. Use cases
are one of those roles, not a peer of them, so they live **inside `usecases/`** and never beside
it.

A use case may still own a folder — that is a decision *inside* `usecases/`, and both readings
are fine:

```
application/                        application/
├── usecases/                       ├── usecases/
│   ├── open-account.usecase.ts     │   ├── open-account/        ← command + handler + spec
│   ├── close-account.usecase.ts    │   ├── close-account/
│   └── index.ts                    │   └── get-account-tree/    ← query + handler
├── ports/                          ├── ports/
└── dto/                            └── read-models/

  one file per use case              one folder per use case (CQRS: the pieces travel together)
```

What is never correct is mixing the two levels — use-case folders sitting *beside* `ports/` and
`repositories/` at the root of `application/`:

```
application/
├── open-account/        ← a use case
├── close-account/       ← a use case
├── get-account-tree/    ← a use case
├── ports/               ← a role
├── repositories/        ← a role
└── services/            ← a role      ✗ two criteria at the same level
```

It reads as one flat list where half the entries are business intents and half are technical
roles, so the eye cannot tell how many use cases the module has without knowing the domain. Nest
them under `usecases/` and the count is one `ls` away.

The same test applies to whatever else the module needs — reactors, sagas, policies: each is a
role folder at the first level, or it does not exist.

Why it matters beyond tidiness: the root of a layer is where a module leaks. A loose
`X.repository.ts` next to seven use-case folders is what another module ends up importing,
because it is the only thing with an obvious path. Folders by role make the module's surface
explicit — what is a use case, what is a port, what is an internal collaborator.

CRITICAL for AUDIT: a layer root full of loose files usually looks the *same in every module*,
which is exactly what makes it invisible — see the topology dimension in
`references/audit-guide.md`.

### Barrels

CRITICAL: Every folder with content ships an `index.ts`. Import through the barrel, never a deep
file path.

```typescript
// Correct
import { OkrTask, OkrTaskRepository, OkrTaskService } from '@okr/domain';

// Wrong
import { OkrTask } from '@okr/domain/okr-task/okr-task.entity';
```

Exception: files **inside the same aggregate/adapter folder** import each other relatively
(`./okr-task.entity`). An entity that imports its own barrel risks a circular resolution.

### Path aliases

CRITICAL: One alias per module. Relative `../../..` is banned. Declare them in **both** the app
tsconfig and the test tsconfig — a test config missing the aliases makes every spec that touches
an aliased file fail to compile, and the suite looks green because nothing runs.

```json
"paths": {
  "@shared/*": ["src/shared/*"],
  "@okr/*":    ["src/okr/*"]
}
```

---

## Domain Layer

### Entities

CRITICAL: Private constructor + static factory. Never `new Entity()` outside the class.
Behavior lives in the entity (Tell Don't Ask) — a use case must never read fields and decide.

```typescript
export class OkrTask {
  id: Uuid;
  status: OkrTaskStatus;
  progress: number;

  private constructor(input: PropertiesOnly<OkrTask>) {
    Object.assign(this, input);
  }

  static create(input: PropertiesOnly<OkrTask>): OkrTask {
    return new OkrTask(input);
  }

  isDone(): boolean {
    return this.status === OkrTaskStatus.DONE;
  }
}
```

Rules:
- `PropertiesOnly<T>` in `create`, `Partial<PropertiesOnly<T>>` in `update`.
- Primitive obsession is a smell: identifiers are value objects, dates are a date type, never `string`.
- Nullable fields use `Nullable<T>`, never `T | null`.
- Query methods read `is*` / `has*` / `should*` / `mustBe*`; commands read as verbs.
- **Business constants belong to the entity**, not to the use case. A threshold like
  `VISIBILITY_WINDOW_HOURS = 48` is a private static on the entity, and the method that uses it
  takes no argument.

Full templates: `references/module-blueprint.md`.

### Repositories and driven ports — always `abstract class`

CRITICAL: Never declare a port as an `interface`. Interfaces vanish at runtime and cannot be a DI
token. Abstract classes are both the contract and the token.

```typescript
export abstract class OkrTaskRepository {
  abstract findById(id: Uuid): Promise<Nullable<OkrTask>>;
  abstract save(task: OkrTask): Promise<void>;
  abstract remove(id: Uuid): Promise<void>;
}
```

| Intent | Method |
|--------|--------|
| Read one | `findById` / `findBy<Criteria>` → `Promise<Nullable<T>>` |
| Read many | `findAll` / `findBy<Criteria>` → `Promise<T[]>` |
| Insert | `create` / `insert` |
| Upsert | `save` |
| Update existing | `update` |
| Delete | `remove` |

CRITICAL: A read that can miss returns `Nullable<T>`. Declaring `Promise<T>` and returning `null`
is a type lie — callers stop guarding and the null surfaces as a crash somewhere else.

### Where does a port live?

CRITICAL: Placement follows **who calls it**, not what technology is behind it. Decide with this,
in order:

1. Does a **domain service** or an aggregate invariant call it? → `domain/<aggregate>/`
2. Otherwise, do **only use cases** call it? → `application/ports/`
3. Do **two or more modules** call it? → `shared/application/ports/`

The common confusion: a module with **no domain service** has no reason to put anything in
`domain/` beyond its repository — all its driven ports go to `application/ports/`. That is not an
inconsistency with a sibling module that keeps them in `domain/`; both are correct under rule 1.

Within one module, apply the same rule to every aggregate. Aggregate A's data-source port in
`domain/` and aggregate B's in `application/ports/`, with neither having a domain service, **is**
drift.

Name driven ports for the role, not the vendor: `OkrTaskDataSourcePort`, not
`NotionOkrTaskPort`. The vendor belongs to the adapter name.

### Domain services

CRITICAL: A domain service holds logic spanning several aggregates or ports. It MUST NOT carry a
framework decorator — that would put a framework dependency in the domain. Construct it explicitly
in the composition root (in Nest: `useFactory` — see `references/nestjs-binding.md`).

Only create one when the logic does not belong to a single entity. One-aggregate logic goes in the
entity; pure step sequencing goes in a use case.

---

## Application Layer

### Use cases

CRITICAL: One use case = one business intent = one public `execute()`. If a class has two public
entry points, it is two use cases.

```typescript
@Injectable()
export class SyncOkrTaskStatusUsecase {
  constructor(private readonly okrTaskDataSource: OkrTaskDataSourcePort) {}

  /** Push the task progress derived from its status back to the data source */
  async execute(taskId: Uuid): Promise<void> {
    const task = await this.okrTaskDataSource.fetchById(taskId);

    if (!task) return;
    if (!task.syncProgressWithStatus()) return;

    await this.okrTaskDataSource.updateProgress(taskId, task.progress);
  }
}
```

Rules:
- Class `<Action><Entity>Usecase`, file `<action>-<entity>.usecase.ts`. Keep one spelling of the
  suffix across the codebase — never mix `UseCase` and `Usecase`.
- Constructor takes **abstractions only**. A use case importing a DB model, an SDK client or a
  concrete adapter is a boundary violation.
- Never read configuration (`process.env`, a config service) from a use case. Inject a resolved
  value object provided by infrastructure.
- Never throw a transport exception (an HTTP error class) from a use case. Throw a domain or
  application exception and let the adapter translate it.
- Inputs are domain types or input DTOs — never raw framework objects (`Request`, `Body`).
- Outputs are `void` or output DTOs from an application mapper — never domain entities to HTTP.
- Branch over enums/tuples with exhaustive pattern matching, so a new enum member breaks the build.
- When iterating a batch, decide explicitly whether one failure aborts the run. If it should not,
  wrap each item in try/catch and `continue`.

### DTOs and mappers

`<name>.input.dto.ts` / `<name>.output.dto.ts` with validation decorators and an `Object.assign`
constructor. Dates cross the boundary as ISO strings, ids as plain `string`.

Application mapper: `static toDTO(entity): OutputDto` — one direction only, domain → transport.
Persistence and external mapping are infrastructure's job.

---

## Infrastructure Layer

### Adapter naming: `<technology>-<entity>.<role>.ts`

| Role | File | Class |
|------|------|-------|
| Persistence repo | `mongodb-okr-task.repository.ts` | `MongodbOkrTaskRepository` |
| Persistence schema | `mongodb-okr-task.entity.ts` | `MongodbOkrTaskEntity` |
| Persistence mapper | `mongodb-okr-task.mapper.ts` | `MongodbOkrTaskMapper` (`toDomain`/`toEntity`) |
| External provider | `notion-okr-task.provider.ts` | `NotionOkrTaskProvider` |
| External mapper | `notion-okr-task.mapper.ts` | `NotionOkrTaskMapper` (`toDomain`) |
| Controller | `daily-task.controller.ts` | `DailyTaskController` |
| Scheduler | `daily-task.scheduler.ts` | `DailyTaskScheduler` |
| Event handler | `okr-task.event-handler.ts` | `OkrTaskEventHandler` |
| Bootstrap | `setup-okr.bootstrap.ts` | `SetupOkrBootstrap` |

### Driving adapters are thin

CRITICAL: Controllers, schedulers, event handlers and bootstraps contain **zero** business logic.
They translate an external trigger into `usecase.execute(...)` and nothing else.

Every driving adapter that runs **outside a request** (scheduler, event handler, bootstrap) MUST
catch and log — an unhandled rejection there takes the process down.

### Persistence entities are not domain entities

Two separate classes, always, joined by a mapper. The schema class lives in infrastructure; the
domain entity has no decorators. Persist primitives, rebuild value objects in `toDomain`.

### External providers

Wrap SDK calls with retry, map to domain via the mapper, and handle failure **asymmetrically**:

- **Read** operations: log through the error formatter and degrade (empty result) so a partial
  outage does not break a sync loop.
- **Write** operations: throw a typed external-service exception carrying context and cause. A
  failed write that only logs produces silent data divergence — the worst class of bug to debug.

CRITICAL: Order the pipeline so the error handler wraps the mapping too. A `catchError` placed
before the `map` does not catch what the mapper throws.

CRITICAL: Read configuration in the **constructor body**, never in a field initializer. Field
initializers run before constructor parameters are assigned, so `this.config` is undefined there
under `useDefineForClassFields` (ES2022+).

### Configuration

Config is read **only** in infrastructure — factories, providers, guards, adapters. Values travel
inward as plain data. See `references/nestjs-binding.md` for the client-token and factory pattern.

---

## Wiring (composition root)

CRITICAL: One place — the module file — is where an abstraction meets an implementation. Nothing
else may name a concrete adapter.

- Every port is bound to exactly one adapter there.
- Swapping a technology must be a **one-line change**. If it isn't, the port leaks implementation
  details.
- Every driving adapter must be **registered**. An event handler that exists but is not registered
  is invisible: no error, no logs, just dropped events. Assert this with a wiring test.
- Cross-module access goes through the other module's **exported use cases** or through events —
  never its domain entities, repositories or adapters. Wrap the foreign use case in a local port
  adapter (anti-corruption layer) so only that adapter knows the other module exists.

NestJS syntax for all of this: `references/nestjs-binding.md`.

---

## Naming Quick Reference

| Artifact | File | Class |
|----------|------|-------|
| Entity | `<entity>.entity.ts` | `OkrTask` |
| Enum | `<entity>.enum.ts` | `OkrTaskStatus` |
| Repository (port) | `<entity>.repository.ts` | `OkrTaskRepository` (abstract) |
| Data-source port | `<entity>-data-source.port.ts` | `OkrTaskDataSourcePort` (abstract) |
| Application port | `<name>.port.ts` | `DailyTaskNotifierPort` (abstract) |
| Domain service | `<entity>.service.ts` | `OkrTaskService` (plain class) |
| Domain exception | `<entity>.exception.ts` | `OkrTaskNotFoundError` |
| Value object | `<name>.vo.ts` | `Uuid` |
| Use case | `<action>-<entity>.usecase.ts` | `SyncOkrTaskStatusUsecase` |
| Input / Output DTO | `<name>.input.dto.ts` / `<name>.output.dto.ts` | `NotificationInput` |
| Module | `<module>.module.ts` | `OkrModule` |

Files kebab-case, classes PascalCase, enum members SCREAMING_SNAKE with identical string values,
exception codes SCREAMING_SNAKE.

---

## Quick Reference — the ten rules

| # | Rule | Violation smell |
|---|------|-----------------|
| 1 | Dependencies point inward only | a DB model imported inside `application/` |
| 2 | Group by module, then by layer | top-level `controllers/`, `services/` |
| 2b | A layer root holds folders, not files | `X.repository.ts` loose beside seven use-case folders |
| 3 | Ports are `abstract class`, never `interface` | string DI tokens everywhere |
| 4 | Domain is framework-free | a decorator in `domain/` |
| 5 | Entity owns its behavior and its constants | use case reading fields and deciding |
| 6 | One use case, one `execute()` | a `Service` class with 6 public methods |
| 7 | Driving adapters are thin | business rules in a controller or cron |
| 8 | Domain entity ≠ persistence entity | schema decorators on the domain class |
| 9 | Bindings live only in the composition root | `new SdkClient()` inside a use case |
| 10 | Cross-module via exported use cases or events | importing another module's repository |

## Common Issues

**Error:** "Can't resolve dependencies of XUsecase (?)"
- Cause: the port was declared as an `interface`, or its binding is missing from the module.
- Fix: make the port an `abstract class` and bind it in the composition root.

**Error:** A webhook/event type is silently ignored
- Cause: the handler is not registered, or the branching is not exhaustive.
- Fix: register it and assert it with a wiring test; use exhaustive matching.

**Error:** Circular import between barrels
- Cause: a file inside an aggregate importing its sibling through the module barrel.
- Fix: relative imports inside the aggregate folder; barrels only across folders.

**Error:** Business rule duplicated in a controller and a scheduler
- Cause: logic placed in the driving adapter instead of the use case.
- Fix: move it into the use case, or the entity if it is an invariant.

**Error:** Changing the persistence engine touches dozens of files
- Cause: the domain entity is the ORM entity, or repositories return ORM documents.
- Fix: split the classes and introduce a mapper — see `references/module-blueprint.md`.

---

## Example

### BUILD

**User says:** "creá un módulo de reportes que lea de Postgres y exponga un endpoint"

**Actions:**
1. Announce, load `references/module-blueprint.md`, and `references/nestjs-binding.md` if the
   project uses Nest.
2. `domain/report/` — entity with private constructor + `create`, enum, `ReportRepository`
   abstract class, barrel.
3. `application/usecases/retrieve-report.usecase.ts` with a single `execute`, plus output DTO and
   mapper.
4. `infrastructure/adapters/persistence/postgres/report/` — schema entity, mapper, repository
   implementing the port. `infrastructure/adapters/http/report.controller.ts` delegating only.
5. `report.module.ts` binding `ReportRepository → PostgresReportRepository`; register the module
   and add the path alias to both tsconfigs.

**Result:** the module compiles, the controller has no logic, and swapping Postgres is one line.

### AUDIT

**User says:** "auditalo"

**Actions:**
1. Announce, load `references/audit-guide.md`, run `scripts/audit-scan.sh <src>`.
2. Read each hit before claiming it — a grep hit is a lead, not a finding.
3. Score the 13 dimensions, rank findings HIGH/MEDIUM/LOW, each with `file:line`, the rule broken,
   the concrete failure, and the smallest fix.
4. Report. **Do not edit code** unless the user asks.

**Result:** a report the user can act on, ending with the 3–5 changes with the best gain-to-diff
ratio.

---

## CRITICAL: Output Language

Reports, findings and explanations go **in the user's language**. If the project has an
`.agents/profile.md`, take `OUTPUT_LANGUAGE` from it; otherwise use the language the user is
writing in. Code, identifiers, file paths, rule names and finding IDs stay in English — the
templates in the references are English scaffolding, not a language instruction.
