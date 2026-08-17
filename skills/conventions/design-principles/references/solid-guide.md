# SOLID — NestJS Reference Guide

## SRP in NestJS

In a NestJS service, a common SRP violation is mixing orchestration with business logic,
persistence, and external calls in a single method.

**Pattern: Use Case per operation**

```typescript
// Each use case = one operation = one reason to change
@Injectable()
class CreateAppointmentUseCase {
  constructor(
    private readonly repo: AppointmentRepository,
    private readonly notifier: AppointmentNotifier,
    private readonly validator: AppointmentValidator,
  ) { }

  async execute(dto: CreateAppointmentDto): Promise<Appointment> {
    await this.validator.validate(dto);
    const appointment = Appointment.create(dto);
    await this.repo.save(appointment);
    await this.notifier.notify(appointment);
    return appointment;
  }
}
```

## OCP in NestJS

Use strategy pattern + NestJS DI to add behavior without modifying existing code.

```typescript
abstract class NotificationChannel {
  abstract send(message: string, recipient: string): Promise<void>;
}

@Injectable()
class EmailChannel extends NotificationChannel {
  async send(message: string, recipient: string) { /* email logic */ }
}

@Injectable()
class SmsChannel extends NotificationChannel {
  async send(message: string, recipient: string) { /* sms logic */ }
}

// New channel = new class, no modification to NotificationService
@Injectable()
class NotificationService {
  constructor(
    @Inject('NOTIFICATION_CHANNELS')
    private readonly channels: NotificationChannel[],
  ) { }

  async broadcast(message: string, recipient: string) {
    await Promise.all(this.channels.map(c => c.send(message, recipient)));
  }
}
```

## DIP in NestJS

NestJS DI container enforces DIP naturally when you use abstract classes as tokens.

```typescript
// Define the port (abstraction)
abstract class UserRepository {
  abstract findById(id: string): Promise<Nullable<User>>;
  abstract save(user: User): Promise<void>;
}

// Adapter (implementation)
@Injectable()
class TypeOrmUserRepository extends UserRepository {
  constructor(@InjectRepository(UserEntity) private repo: Repository<UserEntity>) {
    super();
  }
  async findById(id: string): Promise<Nullable<User>> { /* ... */ }
  async save(user: User): Promise<void> { /* ... */ }
}

// Module wiring
@Module({
  providers: [
    { provide: UserRepository, useClass: TypeOrmUserRepository },
    CreateUserUseCase,
  ],
})
class UserModule { }

// Consumer — only knows about the abstraction
@Injectable()
class CreateUserUseCase {
  constructor(private readonly repo: UserRepository) { } // injected, not instantiated
}
```

## ISP in NestJS

Split repository interfaces by the consumer's actual needs.

```typescript
// Read-only use cases only need UserReader
abstract class UserReader {
  abstract findById(id: string): Promise<Nullable<User>>;
  abstract findByEmail(email: string): Promise<Nullable<User>>;
}

// Write use cases only need UserWriter
abstract class UserWriter {
  abstract save(user: User): Promise<void>;
  abstract delete(id: string): Promise<void>;
}

// The concrete adapter implements both
@Injectable()
class TypeOrmUserRepository extends UserReader {
  // implements read methods
}
// Register under both tokens if needed, or have two adapters
```
