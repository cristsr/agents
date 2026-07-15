# NestJS Exception Hierarchy

## Mapping domain exceptions to HTTP status codes

Use an exception filter to translate domain exceptions into HTTP responses. This keeps
HTTP concerns out of the domain layer.

```typescript
// exceptions/domain.exception.ts
export class DomainException extends Error {
  constructor(
    message: string,
    readonly code: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = this.constructor.name;
  }
}

export class NotFoundException extends DomainException {
  constructor(resource: string, id: string) {
    super(`${resource} with id "${id}" not found`, 'NOT_FOUND');
  }
}

export class ConflictException extends DomainException {
  constructor(message: string) {
    super(message, 'CONFLICT');
  }
}

export class ValidationException extends DomainException {
  constructor(field: string, reason: string) {
    super(`Validation failed on "${field}": ${reason}`, 'VALIDATION_ERROR');
  }
}

export class UnauthorizedException extends DomainException {
  constructor(reason?: string) {
    super(reason ?? 'Unauthorized', 'UNAUTHORIZED');
  }
}

export class PersistenceException extends DomainException {
  constructor(message: string, options?: ErrorOptions) {
    super(message, 'PERSISTENCE_ERROR', options);
  }
}
```

## Exception filter

```typescript
// filters/domain-exception.filter.ts
import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus, Logger } from '@nestjs/common';

@Catch(DomainException)
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  catch(exception: DomainException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const status = this.toHttpStatus(exception);

    this.logger.error(exception.message, {
      code: exception.code,
      cause: exception.cause,
    });

    response.status(status).send({
      statusCode: status,
      code: exception.code,
      message: exception.message,
    });
  }

  private toHttpStatus(exception: DomainException): number {
    const map: Record<string, number> = {
      NOT_FOUND:         HttpStatus.NOT_FOUND,
      CONFLICT:          HttpStatus.CONFLICT,
      VALIDATION_ERROR:  HttpStatus.BAD_REQUEST,
      UNAUTHORIZED:      HttpStatus.UNAUTHORIZED,
      PERSISTENCE_ERROR: HttpStatus.INTERNAL_SERVER_ERROR,
    };
    return map[exception.code] ?? HttpStatus.INTERNAL_SERVER_ERROR;
  }
}
```

## Registration (main.ts or AppModule)

```typescript
// main.ts
app.useGlobalFilters(new DomainExceptionFilter());

// or per-module
@UseFilters(DomainExceptionFilter)
@Controller('users')
class UserController { }
```

## What NOT to do in NestJS

```typescript
// Wrong: throwing NestJS HTTP exceptions from domain/use-case layer
import { NotFoundException } from '@nestjs/common'; // NestJS HTTP concern
throw new NotFoundException('User not found'); // leaks HTTP into domain

// Correct: throw domain exception, let the filter translate it
throw new NotFoundException('User', userId); // your domain exception
```
