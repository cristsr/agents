# Hexagonal Rules — shared knowledge (stack-agnostic)

This file is the single source of the hexagonal rules. Both `hexagonal-architecture`
(BUILD) and `hexagonal-audit` (AUDIT) load it. Never duplicate these rules elsewhere;
the concrete syntax per stack lives in `<STACK_REFS>/architecture/` (e.g.
`module-blueprint.md`, `errors-and-logging.md`, `nestjs-binding.md`, `audit-scan.sh`).

> Per-stack resolution: wherever a rule says "abstraction", "DI token" or "naming",
> the concretion comes from the stack pack and the profile's keys (section 7:
> `DI_TOKENS`, `DTO_STYLE`, `IDENTIFIER_LANGUAGE`).

## The Non-Negotiable Rule: Dependency Direction

Dependencies point inward only. `domain` knows nothing. `application` knows `domain`.
`infrastructure` knows both. Nothing outer is ever imported by something inner.

```
infrastructure  ──►  application  ──►  domain
     (adapters)        (use cases)      (entities, VOs, domain services, repositories)
```

| Layer | MAY import | MUST NOT import |
|-------|-----------|-----------------|
| `domain` | shared kernel domain, pure libs (date, uuid, pattern matching) | any framework, ORM, HTTP client, `application/*`, `infrastructure/*` |
| `application` | `domain`, shared kernel (domain + application), the DI marker only | any adapter, any SDK client, `infrastructure/*` |
| `infrastructure` | everything | another module's `domain` or `infrastructure` |

The **only** framework import allowed above `infrastructure` is the DI marker
(per stack: `@Injectable()`, `@Component`, `#[Service]`, …). A domain file with a
framework decorator is a bug — see "Domain services".

## Canonical Structure

One folder per bounded module at the source root. Never group by technical type
(`controllers/`, `services/`) at the top level — group by **module**, then by **layer**.

```
src/
├── shared/                             # shared kernel — NOT a module for business logic
│   ├── application/  exceptions/ ports/ logging/
│   ├── domain/       exception/ types/ value-objects/
│   ├── infrastructure/  adapters/http/ config/ decorators/ guards/ dtos/
│   └── <shared>.module                   # per stack
│
└── <module>/                           # bounded context
    ├── domain/
    │   ├── <aggregate>/                # one per aggregate root — flat when the module owns just one
    │   │   ├── entity / enum / repository (port) / data-source port / service / exception
    │   │   └── barrel
    │   └── barrel
    ├── application/
    │   ├── dto/ exceptions/ mappers/ ports/ types/ usecases/
    ├── infrastructure/
    │   ├── adapters/
    │   │   ├── bootstrap/ events/ http/ schedulers/   # driving
    │   │   ├── persistence/<db>/<aggregate>/          # driven
    │   │   └── <external>/                            # driven — provider + mapper
    │   └── config/<service>/
    └── <module>.module                   # at the module ROOT, per stack (module.ts, __init__, app.py…)
```

Create a folder only when it has content. An empty `exceptions/` with an empty barrel is noise.

### Layer topology — a layer root holds folders, not files

Inside a layer, **every file belongs to a folder that names its role**. The root of
`domain/`, `application/` and `infrastructure/` carries nothing but its barrel; the
root of a module carries nothing but its module file.

**One exception, and only one: a single-entity `domain/`.** When a module owns exactly
one entity, its domain files may sit flat at the root. The moment a second entity
appears, one folder per aggregate root becomes mandatory and the first one moves too.

Grouping by aggregate, never by technical type — `entities/`, `repositories/`,
`services/` inside `domain/` is the rule broken one level down.

`application/` and `infrastructure/` have no such exception: they hold roles from
the start. The first level of `application/` is **roles, and only roles** — use cases
live inside `usecases/`, never beside `ports/` at the root. A use case may own a
folder *inside* `usecases/` (CQRS: command + handler + spec travel together) — both
readings are correct; what is never correct is mixing the two levels.

Why it matters: the root of a layer is where a module leaks. A loose
`X.repository` next to seven use-case folders is what another module ends up
importing. Folders by role make the module's surface explicit.

### Barrels and aliases

- Every folder with content ships a barrel (`index.ts` / equivalent). Import through
  the barrel, never a deep file path. Exception: files inside the same
  aggregate/adapter folder import each other relatively.
- One alias per module (per stack: tsconfig `paths`, `__init__` exports, crate/lib
  exports…). Relative `../../..` is banned. Declare aliases in **both** the app and
  the test configuration — a test config missing them makes every spec that touches
  an aliased file fail to compile, and the suite looks green because nothing runs.

## Domain Layer

### Entities

CRITICAL: Private constructor + static factory. Never instantiate an entity directly
outside the class. Behavior lives in the entity (Tell Don't Ask) — a use case must
never read fields and decide.

Rules:
- Factory `create` takes the properties-only type; `update` takes the partial.
- Primitive obsession is a smell: identifiers are value objects, dates are a date
  type, never a plain string.
- Query methods read `is*` / `has*` / `should*` / `mustBe*`; commands read as verbs.
- **Business constants belong to the entity**, not to the use case. A threshold like
  `VISIBILITY_WINDOW_HOURS = 48` is a private static on the entity, and the method
  that uses it takes no argument.

### Repositories and driven ports — abstractions that can be DI tokens

CRITICAL: Never declare a port as an abstraction that vanishes at runtime (an
`interface` in TS, a non-instantiable contract elsewhere) if it must be a DI token.
Use the stack's convention for runtime token + contract (TS: `abstract class`;
others: trait/interface + DI map, protocol, …). See `<STACK_REFS>/architecture/`.

Port method naming:

| Intent | Method |
|--------|--------|
| Read one | `findById` / `findBy<Criteria>` → nullable of T |
| Read many | `findAll` / `findBy<Criteria>` → list of T |
| Insert | `create` / `insert` |
| Upsert | `save` |
| Update existing | `update` |
| Delete | `remove` |

CRITICAL: A read that can miss returns a nullable type. Declaring a plain T and
returning "not found" is a type lie — callers stop guarding and the null surfaces as
a crash somewhere else.

### Where does a port live?

Placement follows **who calls it**, not what technology is behind it. Decide in order:

1. Does a **domain service** or an aggregate invariant call it? → `domain/<aggregate>/`
2. Otherwise, do **only use cases** call it? → `application/ports/`
3. Do **two or more modules** call it? → shared kernel `application/ports/`

A module with no domain service has no reason to put anything in `domain/` beyond
its repository. Within one module, apply the same rule to every aggregate — drift is
mixing placements across aggregates with the same profile.

Name driven ports for the role, not the vendor: `OrderDataSourcePort`, not
`StripeOrderPort`. The vendor belongs to the adapter name.

### Domain services

A domain service holds logic spanning several aggregates or ports. It MUST NOT carry
a framework decorator — that would put a framework dependency in the domain.
Construct it explicitly in the composition root (per stack: `useFactory`, manual
construction, …).

Only create one when the logic does not belong to a single entity. One-aggregate
logic goes in the entity; pure step sequencing goes in a use case.

## Application Layer

### Use cases

CRITICAL: One use case = one business intent = one public entry point (`execute()`).
If a class has two public entry points, it is two use cases.

Rules:
- Class `<Action><Entity>Usecase` (suffix per stack conventions, one spelling only —
  never mix `Usecase` and `UseCase`).
- Constructor/init takes **abstractions only**. Importing a DB model, an SDK client
  or a concrete adapter is a boundary violation.
- Never read configuration (env vars, config service) from a use case. Inject a
  resolved value object provided by infrastructure.
- Never throw a transport exception from a use case. Throw a domain or application
  exception and let the adapter translate it.
- Inputs are domain types or input DTOs — never raw framework objects (Request,
  Body).
- Outputs are `void` or output DTOs from an application mapper — never domain
  entities to HTTP.
- Branch over enums with exhaustive matching, so a new enum member breaks the build.
- When iterating a batch, decide explicitly whether one failure aborts the run. If
  it should not, wrap each item and continue.

### DTOs and mappers

Input/output DTOs with validation, per the stack's `DTO_STYLE`. Dates cross the
boundary as ISO strings, ids as plain strings.

Application mapper: one direction only, domain → transport. Persistence and external
mapping are infrastructure's job.

## Infrastructure Layer

### Adapter naming: `<technology>-<entity>.<role>`

| Role | Suffix pattern |
|------|----------------|
| Persistence repo | `<tech>-<entity>.repository` |
| Persistence schema | `<tech>-<entity>.entity` (persistence model) |
| Persistence mapper | `<tech>-<entity>.mapper` (`toDomain` / `to<Schema>`) |
| External provider | `<vendor>-<entity>.provider` |
| External mapper | `<vendor>-<entity>.mapper` (`toDomain`) |
| Controller | `<entity>.controller` |
| Scheduler | `<entity>.scheduler` |
| Event handler | `<entity>.event-handler` |
| Bootstrap | `setup-<module>.bootstrap` |

### Driving adapters are thin

CRITICAL: Controllers, schedulers, event handlers and bootstraps contain **zero**
business logic. They translate an external trigger into `usecase.execute(...)` and
nothing else.

Every driving adapter that runs **outside a request** (scheduler, event handler,
bootstrap) MUST catch and log — an unhandled rejection there takes the process down.

### Persistence entities are not domain entities

Two separate classes, always, joined by a mapper. The schema class lives in
infrastructure; the domain entity has no framework annotations. Persist primitives,
rebuild value objects in `toDomain`.

### External providers

Wrap SDK calls with retry, map to domain via the mapper, and handle failure
**asymmetrically**:

- **Read** operations: log through the error formatter and degrade (empty result)
  so a partial outage does not break a sync loop.
- **Write** operations: throw a typed external-service exception carrying context
  and cause. A failed write that only logs produces silent data divergence.

CRITICAL: Order the pipeline so the error handler wraps the mapping too. A handler
placed before the mapping does not catch what the mapper throws.

CRITICAL: Read configuration in the **constructor/init body**, never in a field
initializer (field initializers run before init params are assigned in some
stacks/compile targets).

## Wiring (composition root)

CRITICAL: One place — the module file — is where an abstraction meets an
implementation. Nothing else may name a concrete adapter.

- Every port is bound to exactly one adapter there.
- Swapping a technology must be a **one-line change**. If it isn't, the port leaks
  implementation details.
- Every driving adapter must be **registered**. An event handler that exists but is
  not registered is invisible: no error, no logs, just dropped events. Assert this
  with a wiring test.
- Cross-module access goes through the other module's **exported use cases** or
  through events — never its domain entities, repositories or adapters. Wrap the
  foreign use case in a local port adapter (anti-corruption layer) so only that
  adapter knows the other module exists.

## Naming Quick Reference (generic)

| Artifact | Convention |
|----------|------------|
| Entity | `<entity>` |
| Enum | `<entity>.enum` / `<entity>.status` |
| Repository (port) | `<entity>.repository` |
| Data-source port | `<entity>-data-source.port` |
| Application port | `<name>.port` |
| Domain service | `<entity>.service` |
| Domain exception | `<entity>.exception` |
| Value object | `<name>.vo` / `<name>-value-object` |
| Use case | `<action>-<entity>.usecase` |
| Input / Output DTO | `<name>.input.dto` / `<name>.output.dto` |
| Module | `<module>.module` |

Files kebab-case (per stack), classes PascalCase (per stack), enum members
SCREAMING_SNAKE with identical string values, exception codes SCREAMING_SNAKE.
The exact suffixes and case rules come from the stack pack + `IDENTIFIER_LANGUAGE`.

## The ten rules

| # | Rule | Violation smell |
|---|------|-----------------|
| 1 | Dependencies point inward only | a DB model imported inside `application/` |
| 2 | Group by module, then by layer | top-level `controllers/`, `services/` |
| 2b | A layer root holds folders, not files | `X.repository` loose beside seven use-case folders |
| 3 | Ports are abstractions that can be DI tokens | string DI tokens everywhere |
| 4 | Domain is framework-free | a framework annotation in `domain/` |
| 5 | Entity owns its behavior and its constants | use case reading fields and deciding |
| 6 | One use case, one `execute()` | a `Service` class with 6 public methods |
| 7 | Driving adapters are thin | business rules in a controller or cron |
| 8 | Domain entity ≠ persistence entity | schema annotations on the domain class |
| 9 | Bindings live only in the composition root | `new SdkClient()` inside a use case |
| 10 | Cross-module via exported use cases or events | importing another module's repository |
