---
name: typescript
description: >
  Enforces TypeScript coding conventions: guard clauses, Nullable<T> types, optional chaining,
  abstract classes over interfaces, path aliases, readonly immutability, and naming conventions.
  Use when writing or reviewing TypeScript code, creating types or interfaces, handling
  null/undefined values, naming files/classes/methods/variables, structuring imports, or asked
  about TypeScript best practices, patterns, or conventions.
metadata:
  author: styve
  version: "1.3"
  tags: [typescript, patterns, conventions, guard-clauses, nullable, abstract-class, readonly, naming]
  category: code-quality
---

# TypeScript Patterns

## Instructions

CRITICAL: These patterns are MANDATORY conventions for this project. Apply them consistently
whenever writing or reviewing TypeScript code.

For detailed decision guides, see:
- `references/abstract-class-guide.md` — when to choose abstract class vs interface
- `references/path-alias-setup.md` — configuring path aliases in tsconfig.json

> Error handling conventions are in the `error-handling` skill.

---

## Guard Clauses

CRITICAL: Use early returns to eliminate nesting. Never use nested if-else when a guard
clause can handle the failure case first.

```typescript
// Correct: guard clauses at the top, happy path at the bottom
function processUser(user: User): Result {
  if (!user.isActive) return Result.fail("User is not active");
  if (!user.hasPermission) return Result.fail("No permission");

  return Result.ok(user.process());
}

// Wrong: nested if-else
function processUser(user: User): Result {
  if (user.isActive) {
    if (user.hasPermission) {
      return Result.ok(user.process());
    } else {
      return Result.fail("No permission");
    }
  } else {
    return Result.fail("User is not active");
  }
}
```

---

## Falsy Validation

CRITICAL: Use JavaScript boolean coercion for empty/null/undefined checks. Never use explicit
comparisons to `0`, `""`, `null`, or `undefined` when a falsy check is sufficient.

```typescript
// Correct
if (!count) { }         // 0, null, undefined, NaN
if (!name) { }          // "", null, undefined
if (!items.length) { }  // empty array

function validate(value: string | null): boolean {
  if (!value) return false;
  if (!value.trim()) return false;
  return true;
}

// Wrong
if (count === 0) { }
if (name === "") { }
if (items.length === 0) { }
```

---

## Optional Chaining

CRITICAL: Always use optional chaining (`?.`) for nullable property access. Never chain
manual null checks with `&&`.

```typescript
// Correct
const name = user?.profile?.name;
const first = items?.[0];
const result = callback?.();
const display = user?.profile?.name ?? "Anonymous";

if (user?.permissions?.includes("admin")) { }

// Wrong
const name = user && user.profile && user.profile.name;
if (user && user.permissions && user.permissions.includes("admin")) { }
```

---

## Nullable<T>

CRITICAL: Always use `Nullable<T>` instead of `T | null`. Direct union `T | null` is not
allowed in this codebase.

```typescript
// Type definition (defined once in shared/types)
export type Nullable<T> = T | null;

// Correct
function findUser(id: string): Promise<Nullable<User>> { }
function getConfig(key: string): Nullable<string> {
  return process.env[key] ?? null;
}

// Wrong — do not use T | null directly
function findUser(id: string): Promise<User | null> { }
```

---

## Abstract Class vs Interface

CRITICAL: Use `abstract class` when shared implementation is needed. Use `interface` only
for pure contracts with no shared logic.

```typescript
// Correct: abstract class for shared behavior
abstract class BaseValidator<T> {
  abstract validate(value: T): boolean;

  validateOrThrow(value: T): void {
    if (!this.validate(value)) throw new Error(`Invalid: ${String(value)}`);
  }
}

class EmailValidator extends BaseValidator<string> {
  validate(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }
}

// Correct: interface for pure contracts (DTOs, data shapes)
interface Logger {
  log(message: string): void;
  error(message: string, error?: Error): void;
}

// Wrong: interface when you need shared logic — forces duplication
interface BaseValidator<T> {
  validate(value: T): boolean;
  // can't share validateOrThrow here
}
```

See `references/abstract-class-guide.md` for the full decision table.

---

## Path Aliases

CRITICAL: Always use path aliases for imports. Deep relative paths (`../../..`) are not
allowed.

```typescript
// Correct
import { UserService } from "@/services/user.service";
import { Nullable } from "@/shared/types";
import { CreateUserDto } from "@/dtos/create-user.dto";

// Wrong
import { UserService } from "../../../services/user.service";
import { Nullable } from "../../shared/types";
```

See `references/path-alias-setup.md` for tsconfig configuration.

---

## Readonly Immutability

CRITICAL: Mark all class properties as `readonly` unless mutation is explicitly required.
Mark constructor parameters as `readonly` in NestJS injectable classes.

```typescript
// Correct: readonly everywhere mutation is not needed
class UserCreatedEvent {
  constructor(
    readonly userId: string,
    readonly email: string,
    readonly occurredAt: Date = new Date(),
  ) {}
}

// Correct: readonly in NestJS services (dependencies never reassigned)
@Injectable()
class CreateUserUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly mailer: Mailer,
  ) {}
}

// Correct: readonly arrays prevent accidental mutation
class Role {
  readonly permissions: readonly string[];

  constructor(permissions: string[]) {
    this.permissions = Object.freeze([...permissions]);
  }
}

// Wrong: mutable properties when mutation never happens
class UserCreatedEvent {
  userId: string;      // should be readonly
  email: string;       // should be readonly
}
```

Use `as const` for literal objects and enums that must never change:

```typescript
// Correct
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NOT_FOUND: 404,
} as const;

type HttpStatus = typeof HTTP_STATUS[keyof typeof HTTP_STATUS]; // 200 | 201 | 404
```

---

## Naming Conventions

CRITICAL: Consistent naming makes code predictable. Follow these rules without exception.

### Files — kebab-case, always with type suffix

```
user.service.ts
create-user.use-case.ts
user.repository.ts
user-created.event.ts
create-user.dto.ts
user.entity.ts
user.controller.ts
user.module.ts
user.service.spec.ts
```

### Classes — PascalCase, matching file suffix

```typescript
class UserService { }
class CreateUserUseCase { }
class UserRepository { }          // abstract port
class TypeOrmUserRepository { }   // concrete adapter
class UserCreatedEvent { }
class CreateUserDto { }
```

### Booleans — always `is`, `has`, `can`, `should`

```typescript
// Correct
const isActive: boolean;
const hasPermission: boolean;
const canAccessReport: boolean;
const shouldRetry: boolean;

// Wrong — ambiguous
const active: boolean;
const permission: boolean;
const accessReport: boolean;
```

### Methods — verb + noun, intention-revealing

```typescript
// Correct
getUserById(id: string)
createAppointment(dto: CreateAppointmentDto)
isEligibleForDiscount(): boolean
sendWelcomeEmail(user: User): Promise<void>

// Wrong — vague
get(id: string)
process(dto: any)
check(): boolean
send(user: User): Promise<void>
```

### Constants — SCREAMING_SNAKE_CASE for true constants, camelCase for config objects

```typescript
const MAX_RETRY_ATTEMPTS = 3;
const DEFAULT_PAGE_SIZE = 20;

const defaultPaginationConfig = { page: 1, size: 20 }; // object, not a primitive constant
```

---

## Quick Reference

| Pattern | Rule | Common Violation |
|---------|------|-----------------|
| Guard Clauses | Early return, no nesting | `if (a) { if (b) { } }` |
| Falsy Validation | Use `!value` | `if (count === 0)` |
| Optional Chaining | Always `?.` for nullable | `user && user.profile` |
| Nullable<T> | Never `T \| null` directly | `Promise<User \| null>` |
| Abstract Class | For shared implementation | Interface with duplicated logic |
| Path Aliases | Always `@/...` | `import from '../../../'` |
| Readonly | All stable properties | `userId: string` (mutable) |
| Naming — Files | `kebab-case.type.ts` | `UserService.ts`, `userservice.ts` |
| Naming — Booleans | `is/has/can/should` prefix | `active`, `permission`, `access` |
| Naming — Methods | Verb + noun, specific | `process()`, `handle()`, `get()` |

## Common Issues

**Error:** Using `T | null` instead of `Nullable<T>`
- Fix: Import `Nullable` from `@/shared/types` and replace all direct unions

**Error:** Nested if-else making code hard to read
- Fix: Invert the condition and return early (guard clause)

**Error:** Deep relative imports break when files are moved
- Fix: Use path aliases — see `references/path-alias-setup.md`
