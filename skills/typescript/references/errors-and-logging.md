# TypeScript Exception Shape — the base form

The **syntax** of typed exceptions in TypeScript. Three things live elsewhere by
design:
- the **two families** — `DomainException` vs `ApplicationException`, who extends
  which, where they live and where to catch — are the `hexagonal-architecture`
  skill's `references/exception-placement.md` (they only exist where there are
  layers);
- the **mechanics** (never raw `Error`, never swallow, `await` in try/catch) are the
  `error-handling` skill;
- the **HTTP mapping** (the filter that turns `code` into a status) is the `nestjs`
  skill (or the project's framework skill).

This file defines the one class every exception shares, the formatter, and the
conventions. A concrete exception declares a `readonly code` in SCREAMING_SNAKE and
takes a **typed context object** — never a loose string. Context holds **primitives**
(`id.value`, not `id`) so the log line is serializable.

## Base class — copy verbatim into the shared kernel

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

`format()` is abstract: **each family decides its own shape** — the
`hexagonal-architecture` skill's `references/exception-placement.md` implements it
for the domain and application families (e.g. whether `cause` is included in the
output). This file does not decide that; it only declares the contract.

## Concrete exceptions

```typescript
export class OrderAlreadyPaidError extends BaseException {
  readonly code = 'ORDER_ALREADY_PAID';

  constructor(context: { orderId: string }) {
    super(`Order ${context.orderId} is already paid`, { context });
  }
}
```

A concrete exception extends the family that matches what failed (domain vs
application — see `hexagonal-architecture`), never `BaseException` directly, once a
family exists. Context holds primitives, never objects.

## Logging — every error goes through the formatter

Never pass a raw error to the logger. Every error log goes through `ErrorLogFormatter`,
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
