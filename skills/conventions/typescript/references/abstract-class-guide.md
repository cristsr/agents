# Abstract Class vs Interface — Decision Guide

## Decision Table

| Use Case | Use |
|----------|-----|
| Pure contract, no implementation | `interface` |
| Shared logic between classes | `abstract class` |
| Composition with base behavior | `abstract class` |
| DTOs and data shapes | `interface` |
| Template method pattern | `abstract class` |
| Dependency injection token | `abstract class` (preferred in NestJS) |

## Rule of thumb

> If you find yourself writing the same method in two different classes,
> that method belongs in an abstract class.

## Examples

### Abstract class — shared behavior

```typescript
abstract class BaseUseCase<TInput, TOutput> {
  abstract execute(input: TInput): Promise<TOutput>;

  async run(input: TInput): Promise<TOutput> {
    // shared cross-cutting logic (logging, validation, etc.)
    return this.execute(input);
  }
}

class CreateUserUseCase extends BaseUseCase<CreateUserDto, User> {
  async execute(input: CreateUserDto): Promise<User> {
    // specific logic only
  }
}
```

### Interface — pure contract

```typescript
interface EventHandler<T> {
  handle(event: T): Promise<void>;
}

interface Serializable<T> {
  toJSON(): string;
  fromJSON(raw: string): T;
}
```

### Wrong — forcing interface when shared logic is needed

```typescript
// Wrong: every implementor must duplicate the retry logic
interface ApiClient {
  get<T>(url: string): Promise<T>;
  // Can't put shared retry/timeout logic here
}

// Correct: abstract class holds shared logic
abstract class BaseApiClient {
  protected abstract baseUrl: string;

  async get<T>(path: string): Promise<T> {
    // shared: retry, timeout, headers
    const response = await fetch(`${this.baseUrl}${path}`);
    return response.json() as T;
  }
}
```
