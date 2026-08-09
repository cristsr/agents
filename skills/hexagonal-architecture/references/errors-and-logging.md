# Exception Hierarchy & Error Logging Contract

The layer an exception belongs to is decided by **what failed**, not by where it was thrown.
This is the placement contract; the `error-handling` skill covers try/catch mechanics.

---

## The hierarchy

```
BaseException (shared/domain/exception)          abstract — code, context, cause, format()
├── DomainException (shared/domain/exception)    a business rule or invariant was violated
│   ├── NotFoundException                        the thing the domain needs does not exist
│   └── <module> domain exceptions               domain/<aggregate>/<aggregate>.exception.ts
└── ApplicationException (shared/application)    orchestration or a dependency failed
    ├── ExternalServiceException                 a third-party call failed
    └── <module> application exceptions          application/exceptions/<entity>.exception.ts
```

Rule of thumb:

| What failed | Layer | Base to extend |
|-------------|-------|----------------|
| A business invariant ("a done task cannot be reopened") | domain | `DomainException` |
| Something the domain requires is missing | domain | `NotFoundException` |
| A third-party write/read failed | application | `ExternalServiceException` |
| A use case cannot complete for orchestration reasons | application | `ApplicationException` |
| An HTTP contract violation (bad request, unauthorized) | infrastructure | Nest's own `HttpException` family, in the adapter only |

Never throw Nest's `NotFoundException` from a use case — that is an HTTP concept. Throw the
domain one and let the adapter translate.

---

## Base classes — copy verbatim into the shared kernel

```typescript
// shared/domain/exception/base.exception.ts
import { ObjectLiteral } from '@shared/domain/types';

export interface BaseExceptionOptions {
  cause?: Error;
  context?: ObjectLiteral;
}

export abstract class BaseException extends Error {
  abstract readonly code: string;
  readonly name: string;
  readonly context?: ObjectLiteral;
  readonly cause?: Error;

  protected constructor(message: string, options?: BaseExceptionOptions) {
    super(message);
    this.name = this.constructor.name;
    this.context = options?.context;
    this.cause = options?.cause;
  }

  abstract format(): ObjectLiteral;
}
```

```typescript
// shared/domain/exception/domain.exception.ts
export abstract class DomainException extends BaseException {
  format(): ObjectLiteral {
    return { name: this.name, code: this.code, message: this.message, context: this.context, stack: this.stack };
  }
}

// shared/domain/exception/not-found.exception.ts
export class NotFoundException extends DomainException {
  readonly code: string = 'NOT_FOUND';
}
```

```typescript
// shared/application/exceptions/application.exception.ts
export abstract class ApplicationException extends BaseException {
  format(): ObjectLiteral {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
      stack: this.stack,
      cause: this.cause && { message: this.cause.message, stack: this.cause.stack },
    };
  }
}

// shared/application/exceptions/external-service.exception.ts
export class ExternalServiceException extends ApplicationException {
  readonly code = 'EXTERNAL_SERVICE_ERROR';
}
```

Domain exceptions do not carry a `cause` in their formatted output — a business rule violation has
no underlying technical error. Application exceptions always do.

---

## Concrete exceptions

CRITICAL: Every concrete exception declares a `readonly code` in SCREAMING_SNAKE and takes a
**typed context object** — never a loose string.

```typescript
// domain — no cause
export class OkrTaskNotFoundError extends NotFoundException {
  readonly code = 'OKR_TASK_NOT_FOUND';

  constructor(context: { taskId: string }) {
    super(`OkrTask with id ${context.taskId} not found in source`, { context });
  }
}

// application — always carries the cause
export class OkrTaskSyncException extends ExternalServiceException {
  constructor(
    context: { taskId: string; keyResultId?: string; objectiveId?: string; progress?: number },
    cause: Error,
  ) {
    super('Failed to update OKR task in Datasource', { context, cause });
  }
}
```

Context holds **primitives** (`id.value`, not `id`) so the log line is serializable.

---

## Logging

CRITICAL: Never pass a raw error to the logger. Every error log goes through `ErrorLogFormatter`,
so logs have a stable shape (`code`, `message`, `context`, `cause`) whatever threw.

```typescript
// shared/infrastructure/logging/error-log.formatter.ts
export interface ErrorLogConfig {
  code: string;
  message: string;
  context?: Record<string, unknown>;
  cause?: Error;
}

export class ErrorLogFormatter {
  static format(error: Error): Record<string, unknown>;
  static format(config: ErrorLogConfig): Record<string, unknown>;
  static format(errorOrConfig: Error | ErrorLogConfig): Record<string, unknown> {
    if (errorOrConfig instanceof Error) {
      if (errorOrConfig instanceof BaseException) return errorOrConfig.format();

      return {
        code: 'UNEXPECTED_ERROR',
        message: 'An unexpected error occurred',
        cause: { message: errorOrConfig.message, stack: errorOrConfig.stack },
      };
    }

    return {
      code: errorOrConfig.code,
      message: errorOrConfig.message,
      context: errorOrConfig.context,
      cause: errorOrConfig.cause && { message: errorOrConfig.cause.message, stack: errorOrConfig.cause.stack },
    };
  }
}
```

Two call styles:

```typescript
// A caught exception you are logging as-is (bootstrap, event handler)
this.logger.error(ErrorLogFormatter.format(error));

// A degraded read where you invent the code and context
this.logger.warn(
  ErrorLogFormatter.format({
    code: 'FIND_OKR_TASKS_BY_KEY_RESULT_ID_FAILED',
    message: 'Failed to query OKR Tasks from Notion',
    context: { keyResultId: keyResultId.value },
    cause: err,
  }),
);
```

```typescript
// Wrong
this.logger.error('Something failed', error);
this.logger.warn('Failed to retrieve tasks', { cursor, message: err.message }); // ad-hoc shape, stack lost
console.error(error);
```

Codes follow `<ACTION>_<SUBJECT>_FAILED` (`FIND_OKR_TASK_FAILED`, `NOTION_QUERY_PENDING_TASKS_ERROR`)
so they are greppable and can drive alerting.

---

## Where to catch

| Location | Policy |
|----------|--------|
| Domain entity / service | Throw. Never catch. |
| Use case | Catch only to add business meaning; otherwise let it propagate. |
| Repository | Let driver errors propagate, or wrap in a typed persistence exception. Never return `null` to hide a failure — `null` means "not found", not "it broke". |
| External provider — read | Log via formatter, degrade (`EMPTY`, empty list). |
| External provider — write | Throw a typed `ExternalServiceException` subclass. |
| Controller | Do not catch. Let the Nest filter map it. |
| Scheduler / event handler / bootstrap | MUST catch and log — an unhandled rejection here kills the process. |

If the project exposes an HTTP API, add one exception filter in `shared/infrastructure` that maps
`BaseException.code` to a status code, so the mapping lives in exactly one place.
