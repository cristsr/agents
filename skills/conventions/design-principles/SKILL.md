---
name: design-principles
description: >
  Enforces software design principles: SOLID, DRY, YAGNI, and Tell Don't Ask. Use when
  designing classes, services, or modules; reviewing code for duplication or unnecessary
  complexity; creating abstractions; adding new features; or asked about OOP best practices,
  code design, responsibilities, or coupling.
metadata:
  author: styve
  version: "1.0"
  tags: [solid, dry, yagni, tell-dont-ask, oop, design, principles]
  category: code-quality
---

# Design Principles

## Instructions

CRITICAL: These are MANDATORY design principles for this project. Apply them when designing
or reviewing any class, service, module, or function.

For detailed examples, see:
- `references/solid-guide.md` — SOLID examples with NestJS context
- `references/tell-dont-ask-examples.md` — Tell Don't Ask patterns

---

## Tell Don't Ask

CRITICAL: Tell objects what to do. Never extract data from an object and make decisions about
it externally — put that logic inside the object itself.

```typescript
// Wrong: asking for data, deciding outside
if (user.getStatus() === 'active' && user.getAge() >= 18) {
  user.grantAccess();
}

// Correct: tell the object what to do
user.requestAccess(); // User decides internally if it can grant access
```

The symptom: a chain of getters followed by external logic. The fix: move that logic into
the class as a method.

---

## DRY — Don't Repeat Yourself

CRITICAL: Every piece of knowledge must have a single representation. When you find yourself
writing the same logic twice, extract it.

```typescript
// Wrong: validation duplicated in two places
class CreateUserHandler {
  handle(dto: CreateUserDto) {
    if (!dto.email.includes('@')) throw new Error('Invalid email');
    // ...
  }
}

class UpdateUserHandler {
  handle(dto: UpdateUserDto) {
    if (!dto.email.includes('@')) throw new Error('Invalid email'); // duplicated
    // ...
  }
}

// Correct: single source of truth
class EmailValidator {
  static validate(email: string): void {
    if (!email.includes('@')) throw new Error('Invalid email');
  }
}
```

DRY applies to logic, not just code. Duplicated business rules, validation, or transformations
are the most dangerous violations — they drift apart silently.

---

## YAGNI — You Aren't Gonna Need It

CRITICAL: Do not implement functionality until it is actually required. No speculative
abstractions, no "future-proofing", no unused parameters or configuration.

```typescript
// Wrong: adding flexibility nobody asked for
class NotificationService {
  send(message: string, channel: 'email' | 'sms' | 'push' | 'slack' = 'email') {
    // only email is used today — the rest is speculation
  }
}

// Correct: implement what is needed now
class NotificationService {
  sendEmail(message: string): void {
    // focused, simple, testable
  }
}
```

If a requirement is not in the current story, do not implement it. Extend when the need
arrives — not before.

---

## SOLID

### S — Single Responsibility

CRITICAL: A class should have one reason to change. If a class handles persistence, business
logic, AND formatting, split it.

```typescript
// Wrong: one class doing too much
class UserService {
  async createUser(dto: CreateUserDto) {
    const hashed = bcrypt.hash(dto.password, 10); // crypto
    await this.db.save({ ...dto, password: hashed }); // persistence
    await this.mailer.send(dto.email, 'Welcome!'); // notification
    return { id: uuid(), ...dto }; // formatting
  }
}

// Correct: each class has one job
class PasswordHasher { hash(plain: string): Promise<string> { } }
class UserRepository { save(user: User): Promise<void> { } }
class WelcomeMailer { send(email: string): Promise<void> { } }
class CreateUserUseCase {
  async execute(dto: CreateUserDto): Promise<User> {
    const password = await this.hasher.hash(dto.password);
    const user = User.create({ ...dto, password });
    await this.repo.save(user);
    await this.mailer.send(user.email);
    return user;
  }
}
```

### O — Open/Closed

Classes should be open for extension, closed for modification. Add behavior by extending,
not by editing existing code.

```typescript
// Wrong: adding a new discount type requires modifying the class
class PriceCalculator {
  calculate(type: 'standard' | 'vip' | 'employee'): number {
    if (type === 'vip') return price * 0.8;
    if (type === 'employee') return price * 0.6;
    return price;
  }
}

// Correct: new discount = new class, nothing modified
abstract class DiscountStrategy {
  abstract apply(price: number): number;
}
class VipDiscount extends DiscountStrategy {
  apply(price: number) { return price * 0.8; }
}
class EmployeeDiscount extends DiscountStrategy {
  apply(price: number) { return price * 0.6; }
}
```

### L — Liskov Substitution

A subclass must be substitutable for its base class without breaking behavior. If an override
throws or removes behavior, the hierarchy is wrong.

```typescript
// Wrong: subclass breaks expected behavior
class Rectangle {
  setWidth(w: number) { this.width = w; }
  setHeight(h: number) { this.height = h; }
  area() { return this.width * this.height; }
}

class Square extends Rectangle {
  setWidth(w: number) { this.width = this.height = w; } // breaks caller assumptions
}

// Correct: model the domain correctly — Square is not a Rectangle
abstract class Shape { abstract area(): number; }
class Rectangle extends Shape { area() { return this.width * this.height; } }
class Square extends Shape { area() { return this.side ** 2; } }
```

### I — Interface Segregation

CRITICAL: Do not force a class to depend on methods it does not use. Split fat interfaces
into focused ones.

```typescript
// Wrong: implementors are forced to stub unused methods
interface UserRepository {
  findById(id: string): Promise<Nullable<User>>;
  findAll(): Promise<User[]>;
  save(user: User): Promise<void>;
  delete(id: string): Promise<void>;
  generateReport(): Promise<Report>; // not every repo needs this
}

// Correct: split by consumer need
interface UserReader {
  findById(id: string): Promise<Nullable<User>>;
  findAll(): Promise<User[]>;
}
interface UserWriter {
  save(user: User): Promise<void>;
  delete(id: string): Promise<void>;
}
interface UserReporter {
  generateReport(): Promise<Report>;
}
```

### D — Dependency Inversion

CRITICAL: High-level modules must not depend on low-level modules. Both should depend on
abstractions. Inject dependencies — never instantiate them inside a class.

```typescript
// Wrong: high-level class depends on a concrete implementation
class CreateUserUseCase {
  private repo = new PostgresUserRepository(); // hard dependency

  async execute(dto: CreateUserDto) { }
}

// Correct: depend on abstraction, inject at construction
abstract class UserRepository {
  abstract save(user: User): Promise<void>;
}

class CreateUserUseCase {
  constructor(private readonly repo: UserRepository) { }

  async execute(dto: CreateUserDto) {
    await this.repo.save(User.create(dto));
  }
}
```

See `references/solid-guide.md` for NestJS-specific DI patterns.

---

## Quick Reference

| Principle | Rule | Symptom of Violation |
|-----------|------|----------------------|
| Tell Don't Ask | Logic inside objects, not outside | Chain of getters + external if |
| DRY | One source of truth per concept | Copy-pasted logic or validation |
| YAGNI | Build what is needed now | Unused params, speculative abstractions |
| SRP | One reason to change per class | Class with 5+ unrelated methods |
| OCP | Extend, don't modify | Switch/if growing with each new type |
| LSP | Subtypes are drop-in replacements | Override throws or removes behavior |
| ISP | Focused interfaces | Class with stubbed/empty method |
| DIP | Depend on abstractions | `new ConcreteClass()` inside a class |
