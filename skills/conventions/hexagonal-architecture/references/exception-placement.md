# Exception Placement & Catch Policy

The layer an exception belongs to is decided by **what failed**, not by where it was
thrown. Two things live elsewhere by design:
- the **base form** (`BaseException`, `ErrorLogFormatter`, conventions) is the
  `typescript` skill's `references/errors-and-logging.md`;
- the **HTTP mapping** (the filter that turns `code` into a status) is the `nestjs`
  skill (or the project's framework skill).

This file decides the two **families** — the only artifact that exists because there
are layers — and where to catch. A project without layers has no `DomainException`
vs `ApplicationException` split and ignores the hierarchy below.

## The hierarchy — placement view

```
BaseException (shared/domain/exception)          abstract — code, context, cause, format()
├── DomainException (shared/domain/exception)    a business rule or invariant was violated
│   ├── NotFoundException                        the thing the domain needs does not exist
│   └── <module> domain exceptions               domain/<aggregate>/<aggregate>.exception
└── ApplicationException (shared/application)    orchestration or a dependency failed
    ├── ExternalServiceException                 a third-party call failed
    └── <module> application exceptions          application/exceptions/<entity>.exception
```

| What failed | Layer | Base to extend |
|-------------|-------|----------------|
| A business invariant ("a done task cannot be reopened") | domain | `DomainException` |
| Something the domain requires is missing | domain | `NotFoundException` |
| A third-party write/read failed | application | `ExternalServiceException` |
| A use case cannot complete for orchestration reasons | application | `ApplicationException` |
| An HTTP contract violation (bad request, unauthorized) | infrastructure | the HTTP framework's exception family (NestJS: `HttpException`), in the adapter only |

Never throw the HTTP framework's not-found exception (NestJS: `NotFoundException`) from a use
case — that is an HTTP concept. Throw the domain one and let the adapter translate.

## The two families

The families extend the base class the language skill defines and implement its
`format()` contract. The difference is the **placement decision**, not the syntax:

- **Domain family** — a business rule violation has no underlying technical error,
  so its formatted output carries no `cause`.
- **Application family** — an orchestration or dependency failure always has an
  underlying cause, so its formatted output includes it.

The class shapes are the **language skill's**: the `typescript` skill's
`references/errors-and-logging.md` defines the base form for TS projects; a Python,
Go or other project's language skill carries its own. Concrete exceptions live next
to what failed — `domain/<aggregate>/` for the domain family,
`application/exceptions/` for the application family (file extensions per the
language skill) — and follow the language skill's exception conventions: a typed
context object, never a loose string, and a stable machine-readable code.

## Where to catch

| Location | Policy |
|----------|--------|
| Domain entity / service | Throw. Never catch. |
| Use case | Catch only to add business meaning; otherwise let it propagate. |
| Repository | Let driver errors propagate, or wrap in a typed persistence exception. Never return `null` to hide a failure — `null` means "not found", not "it broke". |
| External provider — read | Log via formatter, degrade (`EMPTY`, empty list). |
| External provider — write | Throw a typed `ExternalServiceException` subclass. |
| Controller | Do not catch. Let the framework's filter map it. |
| Scheduler / event handler / bootstrap | MUST catch and log — an unhandled rejection here kills the process. |

## The HTTP mapping lives in exactly one place

If the project exposes an HTTP API, add one exception filter in `shared/infrastructure`
that maps `BaseException.code` to a status code — so the mapping lives in exactly one
place. The filter syntax belongs to the framework skill (`nestjs` for NestJS); the
decision to map there, and the code→status contract, is decided here.
