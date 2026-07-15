---
name: error-handling
description: >
  Enforces consistent error handling conventions: custom exception hierarchy, never throw raw
  Error, never swallow errors silently, async error propagation, and NestJS exception filters.
  Use when throwing or catching errors, creating exception classes, handling async failures,
  writing try/catch blocks, or asked about error handling, exceptions, or failure cases.
metadata:
  author: styve
  version: "1.0"
  tags: [error-handling, exceptions, nestjs, async, try-catch]
  category: code-quality
---

# Error Handling

## Instructions

CRITICAL: These conventions are MANDATORY. Inconsistent error handling is one of the hardest
problems to debug in production. Apply them in every service, use case, and repository.

For detailed patterns, see:
- `references/nestjs-exceptions.md` — custom exception hierarchy and NestJS filters
- `references/async-error-patterns.md` — async/await failure scenarios

---

## Never Throw Raw Error

CRITICAL: Never throw `new Error("message")`. Always throw a typed, named exception class
that communicates what went wrong and why.

```typescript
// Wrong
throw new Error("User not found");
throw new Error("Invalid input");

// Correct
throw new UserNotFoundException(userId);
throw new InvalidEmailException(email);
throw new AppointmentConflictException(slotId);
```

Typed exceptions allow callers to catch specifically, enable NestJS filters to map to HTTP
status codes, and make logs meaningful.

---

## Never Swallow Errors

CRITICAL: Never catch an error without either handling it meaningfully or re-throwing it.
An empty catch block is always wrong.

```typescript
// Wrong — error disappears silently
try {
  await this.repo.save(user);
} catch (e) {}

// Wrong — log and swallow, caller never knows it failed
try {
  await this.repo.save(user);
} catch (e) {
  console.error(e);
}

// Correct — handle or re-throw
try {
  await this.repo.save(user);
} catch (error) {
  throw new PersistenceException("Failed to save user", { cause: error });
}

// Correct — catch specific, re-throw unknown
try {
  await this.externalService.call();
} catch (error) {
  if (error instanceof NetworkTimeoutException) {
    throw new ServiceUnavailableException("External service timed out");
  }
  throw error; // unknown errors propagate up
}
```

---

## Custom Exception Hierarchy

Structure exceptions from base to specific. Every exception must carry enough context to
be useful in logs and error responses.

```typescript
// Base domain exception
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

// Domain-specific exceptions
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

// Usage — descriptive, not generic
throw new NotFoundException('User', userId);
throw new ConflictException('Appointment slot already taken');
throw new ValidationException('email', 'must be a valid email address');
```

See `references/nestjs-exceptions.md` for mapping to HTTP status codes.

---

## Async Error Propagation

CRITICAL: Always `await` async calls inside try/catch. Never use `.catch()` to silently
discard errors. Let errors propagate to the caller — do not hide failures.

```typescript
// Wrong — promise error is unhandled
async function processOrder(id: string) {
  this.repo.save(order); // missing await — error silently lost
}

// Wrong — .catch() hiding the failure
await this.repo.save(order).catch(() => null);

// Correct — await + explicit error handling
async function processOrder(id: string): Promise<Order> {
  try {
    const order = await this.repo.findById(id);
    if (!order) throw new NotFoundException('Order', id);

    await this.repo.save(order.process());
    return order;
  } catch (error) {
    if (error instanceof DomainException) throw error;
    throw new PersistenceException('Failed to process order', { cause: error });
  }
}
```

---

## Catch Scope — Keep try/catch Narrow

CRITICAL: Wrap only the operation that can fail. Do not wrap entire methods in a single
try/catch — it hides which line actually threw.

```typescript
// Wrong — too wide, any line could have thrown
async function handle(dto: CreateUserDto): Promise<User> {
  try {
    const existing = await this.repo.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already in use');
    const user = User.create(dto);
    await this.repo.save(user);
    await this.mailer.sendWelcome(user.email);
    return user;
  } catch (e) {
    throw new Error('Something went wrong');
  }
}

// Correct — each operation has its own failure context
async function handle(dto: CreateUserDto): Promise<User> {
  const existing = await this.repo.findByEmail(dto.email);
  if (existing) throw new ConflictException('Email already in use');

  const user = User.create(dto);

  try {
    await this.repo.save(user);
  } catch (error) {
    throw new PersistenceException('Failed to save user', { cause: error });
  }

  try {
    await this.mailer.sendWelcome(user.email);
  } catch (error) {
    // non-critical: log but don't fail the operation
    this.logger.error('Welcome email failed', { userId: user.id, error });
  }

  return user;
}
```

---

## Quick Reference

| Rule | Wrong | Correct |
|------|-------|---------|
| Exception type | `throw new Error("msg")` | `throw new NotFoundException('User', id)` |
| Empty catch | `catch (e) {}` | Re-throw or handle explicitly |
| Async | `.catch(() => null)` | `await` inside try/catch |
| Catch scope | Wrap entire method | Wrap only the failing operation |
| Unknown errors | `catch (e) { log(e) }` | `throw error` to propagate |

## Common Issues

**Error:** `UnhandledPromiseRejection` in production
- Cause: missing `await` on async call inside try/catch
- Fix: always await async operations; never fire-and-forget without a catch strategy

**Error:** NestJS returns 500 for a "not found" case
- Cause: throwing `new Error()` instead of a mapped exception
- Fix: use custom exceptions mapped to HTTP codes — see `references/nestjs-exceptions.md`

**Error:** Error message is "Something went wrong" in logs — no context
- Cause: catching specific error and re-throwing a generic one, losing the original
- Fix: use `{ cause: error }` in the new exception to preserve the chain
