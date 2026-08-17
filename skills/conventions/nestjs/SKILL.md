---
name: nestjs
description: >
  Enforces NestJS framework patterns — the FRAMEWORK dialect of this codebase's
  rules: DI with the module file as the composition root (abstract-class tokens,
  useFactory for framework-free domain services, provider ordering, the global
  shared module), thin driving adapters (controllers, schedulers, event handlers,
  bootstrap), Mongoose persistence kept separate from the domain, RxJS pipelines
  for external providers, exception filters mapping domain codes to HTTP, wiring
  tests and the Jest setup. It shows how Nest EXPRESSES the rules, never restates
  them: architecture rules live in hexagonal-architecture, language syntax in
  typescript, try/catch mechanics in error-handling. Use when writing NestJS code —
  modules, providers, controllers, injection, persistence, guards/filters/pipes —
  or asked how Nest wires a port or adapter. Do NOT use for architecture rules
  (use hexagonal-architecture), TypeScript syntax (use typescript), or catch
  mechanics (use error-handling).
metadata:
  author: styve
  version: "1.0"
  tags: [nestjs, framework, di, module, mongoose, rxjs, filters, wiring]
  category: framework
---

# NestJS Patterns

## Instructions

CRITICAL: These patterns are MANDATORY for NestJS code. They are the Nest *dialect*:
they show how the architecture rules are expressed with Nest's DI container — the
rules themselves live in the `hexagonal-architecture` skill and the `typescript`
skill. When a pattern looks like a rule, it's restated nowhere here: defer.

Load before writing Nest code:
- `references/nestjs-binding.md` — DI tokens, the composition root, `useFactory`,
  injection tokens, the global module, wiring tests, Jest config.
- `references/module-blueprint.md` — the Nest project/module phases (bootstrap,
  infrastructure, wiring).

> Companion skills: `hexagonal-architecture` (placement and rules),
> `typescript` (language syntax), `error-handling` (try/catch mechanics).
> The audit material (`audit-smells.md`, `audit-scan.sh`) is consumed by
> `/hexagonal-audit`.

---

## The module file is the composition root

The `@Module()` file binds every port to its adapter and registers every driving
adapter. Provider order: driving adapters → use cases → port bindings → domain
services. Full syntax in `references/nestjs-binding.md`.

CRITICAL: A driving adapter missing from `providers` produces **no error and no
log** — the events simply never arrive. Guard it with a wiring test.

---

## Ports are abstract classes, bound in the module

Nest resolves providers by runtime token; a TypeScript `interface` does not exist
at runtime. So a port is an `abstract class` (the token) and the adapter
`implements` it; the binding happens in the module, never with `extends`.
See `references/nestjs-binding.md` for the reason and the exact forms
(`useFactory` for domain services, subclassed third-party clients, string tokens
only for collections).

---

## Injected dependencies are `private readonly`

The `readonly` convention is the `typescript` skill's; its decorated form is Nest's —
every constructor-injected collaborator is `private readonly`, since the container
assigns it once and nothing reassigns it:

```typescript
@Injectable()
export class CreateUserUsecase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly mailer: Mailer,
  ) {}
}
```

---

## Domain services stay framework-free

A domain service carries no `@Injectable()` and no `@nestjs/*` import — it enters
the container through `useFactory` with an explicit `new`. See the binding
reference.

---

## How a Nest driving adapter delegates

Rule 7 ("driving adapters are thin") is the `hexagonal-architecture` skill's — in Nest
it lands on controllers, schedulers, event handlers and bootstrap components, each of
which calls a use case and holds nothing else. The three that run outside a request
catch and log per the `hexagonal-architecture` skill's
`references/exception-placement.md`; the Nest form is:

```typescript
@OnEvent('notion.event')
async onNotionEvent(event: NotionEventInput): Promise<void> {
  try {
    await match(event.type)
      .with(NotionEventType.PAGE_CREATED, () => this.syncUsecase.execute(id))
      .exhaustive();
  } catch (error) {
    this.logger.error(ErrorLogFormatter.format(error));
  }
}
```

CRITICAL: `await` the `match(...)` when its handlers are async, or rejections
escape the surrounding `try/catch`.

---

## How Mongoose stays off the domain entity

Rule 8 ("domain entity ≠ persistence entity") is the `hexagonal-architecture` skill's
— in Nest it means the `@Schema()` class is a second class that never leaves
infrastructure. It lives in `infrastructure/adapters/persistence/mongodb/<aggregate>/`
and is mapped to and from the domain entity, so the repository implements the domain
port and returns domain entities. Syntax in `references/nestjs-binding.md`.

---

## External providers: RxJS pipeline, map before the error handler

Reads degrade (log via `ErrorLogFormatter`, `EMPTY`), writes throw a typed
`ExternalServiceException` subclass. `defer → retry → map → catchError` — the
`map` to domain comes **before** the outer `catchError`. Syntax in
`references/nestjs-binding.md`.

---

## HTTP: one filter maps domain codes to status codes

The application layer throws domain/application exceptions with a `code`; it never
throws an HTTP exception — that is an HTTP concept. One `ExceptionFilter` in
`shared/infrastructure` maps `BaseException.code` to a status code, so the mapping
lives in exactly one place:

```typescript
@Catch(BaseException)
export class BaseExceptionFilter implements ExceptionFilter {
  private readonly statusByCode: Record<string, number> = {
    NOT_FOUND: HttpStatus.NOT_FOUND,
    // ...
  };

  catch(exception: BaseException, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse();
    res.status(this.statusByCode[exception.code] ?? HttpStatus.INTERNAL_SERVER_ERROR).json(exception.format());
  }
}
```

The exception *base form* (`BaseException`, `format()`, `code`/`context`/`cause`)
is the `typescript` skill's; the two families (domain vs application) and where to
catch are the `hexagonal-architecture` skill's `references/exception-placement.md`.

---

## Wiring tests

A module smoke test asserts every port resolves and every driving adapter is
registered. Stub the global module, override persistence tokens with
`overrideProvider`, and check `module.get(<Token>)` is defined. Syntax in
`references/nestjs-binding.md`.

---

## Bootstrap

`NestFactory.create(AppModule)` + `setGlobalPrefix('api')` + CORS + the global
`ValidationPipe` via `APP_PIPE`. `AppModule` stays a wiring file — no logic.
Syntax in `references/nestjs-binding.md`.

---

## Output language

Code, identifiers, paths and file names in English (or `IDENTIFIER_LANGUAGE`).

**Chat interaction follows the user's language** (`OUTPUT_LANGUAGE` in the profile).
