# BUILD Mode — New Project & New Module Blueprint

Use this reference when creating a project from scratch or adding a module to an existing one.
Follow the phases in order: the order is inside-out (domain first), which is what keeps the
dependency direction correct by construction.

Phases 0–2 are framework-agnostic. Phases 3–4 use NestJS + Mongoose as the worked example — for the
DI mechanics behind them (tokens, `useFactory`, global modules, wiring tests) read
`nestjs-binding.md`. On a different stack, keep the structure and swap the syntax.

---

## Phase 0 — Bootstrap a new project (skip if the project exists)

1. **Scaffold** an Nx monorepo with a NestJS app: `apps/<app>/src/`.
2. **Create the shared kernel** before any feature module:

```
shared/
├── domain/
│   ├── types/            nullable.type.ts, properties-only.type.ts, object-literal.type.ts, index.ts
│   ├── exception/        base.exception.ts, domain.exception.ts, not-found.exception.ts, index.ts
│   └── value-objects/    uuid.vo.ts, index.ts
├── application/
│   ├── exceptions/       application.exception.ts, external-service.exception.ts, index.ts
│   └── ports/            event-emitter.port.ts, index.ts
├── infrastructure/
│   ├── adapters/http/    healthcheck.controller.ts
│   ├── config/           <service>/<service>.client.ts + <service>.client.factory.ts
│   ├── decorators/ guards/ dtos/ logging/ utils/
└── shared.module.ts      @Global()
```

Baseline types — copy verbatim:

```typescript
export type Nullable<T> = T | null;
export type ObjectLiteral = Record<string, unknown>;
export type PropertiesOnly<T> = Pick<T, { [K in keyof T]: T[K] extends Function ? never : K }[keyof T]>;
```

3. **Exception hierarchy**: see `errors-and-logging.md`. Create it before writing any adapter.
4. **Path aliases** in `tsconfig.app.json` — `@shared/*` plus one per module.
5. **`main.ts`**: `setGlobalPrefix('api')`, global `ValidationPipe({ transform: true, always: true })`
   via `APP_PIPE`, timezone from config (`Settings.defaultZone = config.get('TIME_ZONE')`).
6. **`app.module.ts`**: `ConfigModule.forRoot({ isGlobal: true })`, `SharedModule`, then feature
   modules. Keep it a wiring file — no providers with logic.
7. **Formatting**: prettier `printWidth: 120`, `singleQuote: true`, `trailingComma: "all"`.

---

## Phase 1 — Model the domain

### Step 1.1 — Name the module and its aggregates

A module is a **bounded context** (`daily`, `okr`, `notification`), not a database table.
Entities that only exist as part of an aggregate live in the same folder as it — they do not get
their own repository.

How `domain/` is laid out depends on how many aggregates the module owns:

- **One** — the files may sit flat at the root of `domain/`. A single `<aggregate>/` folder adds
  a level that separates nothing.
- **Two or more** — one folder per aggregate root, no exceptions, and the first one moves in
  when the second arrives. Group by **aggregate**, never by type: `entities/`, `repositories/`,
  `services/` inside `domain/` is grouping by technical type one level down.

CRITICAL: every file you create from here on goes **inside a folder that names its role**. The
root of `domain/`, `application/` and `infrastructure/` carries its barrel and nothing else; the
module root carries `<module>.module.ts` and nothing else. When something does not obviously
belong to an existing folder — a repository, a registry, a validator, a shared enum — the answer
is a new role folder (`repositories/`, `services/`, `types/`), never the layer root. Files left
loose there is the single most common way a clean module decays, because each one looks harmless
on its own.

### Step 1.2 — Entity

```typescript
// domain/<aggregate>/<aggregate>.entity.ts
import { DateTime } from 'luxon';
import { Uuid } from '@shared/domain/value-objects';
import { Nullable, PropertiesOnly } from '@shared/domain/types';
import { <Aggregate>Status } from './<aggregate>.enum';

export class <Aggregate> {
  id: Uuid;
  status: <Aggregate>Status;
  updatedAt: DateTime;
  ownerId: Nullable<Uuid>;

  private constructor(input: PropertiesOnly<<Aggregate>>) {
    Object.assign(this, input);
  }

  static create(input: PropertiesOnly<<Aggregate>>): <Aggregate> {
    return new <Aggregate>(input);
  }

  update(input: Partial<PropertiesOnly<<Aggregate>>>): void {
    Object.assign(this, input);
  }

  // --- queries ---
  isDone(): boolean {
    return this.status === <Aggregate>Status.DONE;
  }

  // --- commands ---
  markAsUpdated(): void {
    this.updatedAt = DateTime.local();
  }
}
```

Checklist: no decorators, no `@nestjs/*`, ids are `Uuid`, dates are `DateTime`, nullables are
`Nullable<T>`, every business question is a method (not a getter read from outside).

### Step 1.3 — Enum

```typescript
// domain/<aggregate>/<aggregate>.enum.ts
export enum <Aggregate>Status {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
}
```

Key and value identical. Never persist or expose the external system's raw labels — map them in
the infrastructure mapper (`{ 'Not started': Status.PENDING }`).

### Step 1.4 — Repository port

```typescript
// domain/<aggregate>/<aggregate>.repository.ts
export abstract class <Aggregate>Repository {
  abstract findById(id: Uuid): Promise<Nullable<<Aggregate>>>;
  abstract findAll(): Promise<<Aggregate>[]>;
  abstract create(entity: <Aggregate>): Promise<void>;
  abstract save(entity: <Aggregate>): Promise<void>;
  abstract remove(id: Uuid): Promise<void>;
}
```

Only declare methods you need **today** (YAGNI). Reads that can miss return `Nullable<T>`.

### Step 1.5 — Data-source port (only if the domain needs it)

If a domain service must talk to an external system of record, declare the port next to the
aggregate. If only use cases need it, it belongs in `application/ports/` instead.

```typescript
// domain/<aggregate>/<aggregate>-data-source.port.ts
export abstract class <Aggregate>DataSourcePort {
  abstract fetchById(id: Uuid): Promise<Nullable<<Aggregate>>>;
  abstract getPending(): Promise<<Aggregate>[]>;
  abstract updateStatus(id: Uuid, status: <Aggregate>Status): Promise<void>;
}
```

### Step 1.6 — Domain exception

```typescript
// domain/<aggregate>/<aggregate>.exception.ts
import { NotFoundException } from '@shared/domain/exception';

export class <Aggregate>NotFoundError extends NotFoundException {
  readonly code = '<AGGREGATE>_NOT_FOUND';

  constructor(context: { id: string }) {
    super(`<Aggregate> with id ${context.id} not found`, { context });
  }
}
```

### Step 1.7 — Domain service (only when logic spans aggregates/ports)

Plain class, no `@Injectable()`. If the logic fits inside one entity, it belongs in the entity;
if it is pure step sequencing, it belongs in a use case.

### Step 1.8 — Barrels

```typescript
// domain/<aggregate>/index.ts
export * from './<aggregate>.entity';
export * from './<aggregate>.enum';
export * from './<aggregate>.repository';
export * from './<aggregate>-data-source.port';
export * from './<aggregate>.exception';
export * from './<aggregate>.service';

// domain/index.ts
export * from './<aggregate>';
```

---

## Phase 2 — Application layer

### Step 2.1 — Application ports

Ports the use cases drive (notifications, side effects, foreign modules):

```typescript
// application/ports/<name>.port.ts
export abstract class <Name>Port {
  /**
   * What this port promises, in business terms
   * @param entity
   */
  abstract <verb>(entity: <Aggregate>): Promise<void>;
}
```

### Step 2.2 — Use cases

One file per business intent. Name it `<action>-<entity>.usecase.ts`.

```typescript
// application/usecases/<action>-<entity>.usecase.ts
@Injectable()
export class <Action><Entity>Usecase {
  private readonly logger = new Logger(<Action><Entity>Usecase.name); // only if it logs

  constructor(
    private readonly <entity>Repository: <Aggregate>Repository,
    private readonly <name>Port: <Name>Port,
  ) {}

  /**
   * <Business intent in one line>
   * @param id
   */
  async execute(id: Uuid): Promise<void> {
    const entity = await this.<entity>Repository.findById(id);

    if (!entity) throw new <Aggregate>NotFoundError({ id: id.value });
    if (entity.isDone()) return;

    await this.<name>Port.<verb>(entity);

    entity.markAsUpdated();

    await this.<entity>Repository.save(entity);
  }
}
```

Typical shapes, pick the one that matches:

| Intent | Name | Signature |
|--------|------|-----------|
| Initial full load at boot | `Setup<Entity>Usecase` | `execute(): Promise<void>` |
| Reconcile one item with the source | `Sync<Entity>Usecase` | `execute(id: Uuid): Promise<void>` |
| Read for transport | `Retrieve<Entity>Usecase` | `execute(): Promise<<Entity>Output[]>` |
| Delete one | `Remove<Entity>Usecase` | `execute(id: Uuid): Promise<void>` |
| Delete stale in bulk | `Purge<Entity>Usecase` | `execute(): Promise<void>` |
| Push a side effect | `Notify<Entity>Usecase` | `execute(): Promise<void>` |

### Step 2.3 — DTOs and application mapper

```typescript
// application/dto/<entity>.output.dto.ts
export class <Entity>Output {
  @IsUUID('4') id: string;
  @IsDateString() updatedAt: string;
  @IsString() @IsIn(Object.values(<Entity>Status)) status: <Entity>Status;

  constructor(payload: <Entity>Output) {
    Object.assign(this, payload);
  }
}

// application/mappers/<entity>.mapper.ts
export class <Entity>Mapper {
  static toDTO(entity: <Aggregate>): <Entity>Output {
    return new <Entity>Output({
      id: entity.id.value,
      updatedAt: entity.updatedAt.toISO(),
      status: entity.status,
    });
  }
}
```

### Step 2.4 — Application exceptions

`application/exceptions/<entity>.exception.ts`, extending `ExternalServiceException` (or another
`ApplicationException` subclass) with typed `context` and `cause`. Do not create the folder until
you have an exception to put in it — an empty barrel is dead weight.

---

## Phase 3 — Infrastructure layer

### Step 3.1 — Persistence (entity + mapper + repository)

```typescript
// infrastructure/adapters/persistence/mongodb/<aggregate>/mongodb-<aggregate>.entity.ts
@Schema({ collection: '<collection>' })
export class Mongodb<Aggregate>Entity {
  @Prop({ required: true }) id: string;
  @Prop({ type: String, default: null }) ownerId: Nullable<string>;
  @Prop({ type: Date, default: Date.now }) updatedAt: Date;
  @Prop({ type: String, default: <Aggregate>Status.PENDING }) status: <Aggregate>Status;

  constructor(payload: Mongodb<Aggregate>Entity) {
    Object.assign(this, payload);
  }
}

export const <Aggregate>Schema = SchemaFactory.createForClass(Mongodb<Aggregate>Entity);

export const Mongodb<Aggregate>EntityProvider: ModelDefinition = {
  name: Mongodb<Aggregate>Entity.name,
  schema: <Aggregate>Schema,
};
```

```typescript
// mongodb-<aggregate>.mapper.ts
export class Mongodb<Aggregate>Mapper {
  static toEntity(model: <Aggregate>): Mongodb<Aggregate>Entity {
    return new Mongodb<Aggregate>Entity({
      id: model.id.value,
      ownerId: model.ownerId?.value ?? null,
      updatedAt: model.updatedAt.toJSDate(),
      status: model.status,
    });
  }

  static toDomain(entity: Mongodb<Aggregate>Entity): <Aggregate> {
    return <Aggregate>.create({
      id: Uuid.create(entity.id),
      ownerId: Uuid.createOrNull(entity.ownerId),
      updatedAt: DateTime.fromJSDate(entity.updatedAt),
      status: entity.status,
    });
  }
}
```

```typescript
// mongodb-<aggregate>.repository.ts
@Injectable()
export class Mongodb<Aggregate>Repository implements <Aggregate>Repository {
  constructor(
    @InjectModel(Mongodb<Aggregate>Entity.name)
    private readonly model: Model<Mongodb<Aggregate>Entity>,
  ) {}

  async findById(id: Uuid): Promise<Nullable<<Aggregate>>> {
    const doc = await this.model.findOne({ id: id.value }).exec();
    if (!doc) return null;
    return Mongodb<Aggregate>Mapper.toDomain(doc);
  }

  async save(model: <Aggregate>): Promise<void> {
    const existing = await this.findById(model.id);

    if (!existing) {
      await this.model.create(Mongodb<Aggregate>Mapper.toEntity(model));
      return;
    }

    await this.model
      .updateOne({ id: model.id.value }, { $set: Mongodb<Aggregate>Mapper.toEntity(model) })
      .exec();
  }
}
```

Note `implements` (not `extends`) the abstract port — the binding happens in the module.

### Step 3.2 — External provider

```typescript
@Injectable()
export class <External><Aggregate>Provider implements <Aggregate>DataSourcePort {
  private readonly logger = new Logger(<External><Aggregate>Provider.name);

  private readonly databaseId: string = this.configService.get('<EXTERNAL>_DATABASE_ID');
  private readonly statusProperty: string = this.configService.get('<EXTERNAL>_STATUS_PROPERTY');

  constructor(
    private readonly client: <External>Client,
    private readonly configService: ConfigService,
  ) {}

  // READ — degrade on failure
  async fetchById(id: Uuid): Promise<Nullable<<Aggregate>>> {
    const source = defer(() => from(this.client.pages.retrieve({ page_id: id.value }))).pipe(
      retry({ count: 3, delay: 1000, resetOnSuccess: true }),
      map((page) => <External><Aggregate>Mapper.toDomain(page, { statusProperty: this.statusProperty })),
      catchError((err) => {
        this.logger.warn(
          ErrorLogFormatter.format({
            code: 'FIND_<AGGREGATE>_FAILED',
            message: 'Failed to fetch <Aggregate> from <External>',
            context: { id: id.value },
            cause: err,
          }),
        );
        return EMPTY;
      }),
    );

    return await lastValueFrom(source, { defaultValue: null });
  }

  // WRITE — never swallow
  async updateStatus(id: Uuid, status: <Aggregate>Status): Promise<void> {
    const source = defer(() => from(this.client.pages.update({ /* ... */ }))).pipe(
      retry({ count: 3, delay: 1000, resetOnSuccess: true }),
      catchError((err) => {
        throw new <Aggregate>SyncException({ id: id.value, status }, err);
      }),
    );

    await lastValueFrom(source);
  }
}
```

Paginated read: wrap the page query in a local `query(cursor?)` function and compose
`defer(() => query()).pipe(expand(...), takeWhile(s => s.hasMore, true), map(s => s.results), reduce(...))`.

### Step 3.3 — Driving adapters

```typescript
// http/<entity>.controller.ts — delegation only
@Controller('<resource>')
export class <Entity>Controller {
  constructor(private readonly retrieveUsecase: Retrieve<Entity>Usecase) {}

  @Get()
  get<Entity>s() {
    return this.retrieveUsecase.execute();
  }
}

// schedulers/<entity>.scheduler.ts
@Injectable()
export class <Entity>Scheduler {
  constructor(private readonly notifyUsecase: Notify<Entity>Usecase) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async notify(): Promise<void> {
    await this.notifyUsecase.execute();
  }
}

// events/<entity>.event-handler.ts
@Injectable()
export class <Entity>EventHandler {
  private readonly logger = new Logger(<Entity>EventHandler.name);
  private readonly dataSourceId: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly syncUsecase: Sync<Entity>Usecase,
    private readonly removeUsecase: Remove<Entity>Usecase,
  ) {
    this.dataSourceId = this.configService.get('<EXTERNAL>_<ENTITY>_DATASOURCE');
  }

  @OnEvent('<source>.event')
  async onEvent(event: <Source>EventInput): Promise<void> {
    if (event.data?.parent?.data_source_id !== this.dataSourceId) return;

    const id = Uuid.create(event.entity.id);

    try {
      await match(event.type)
        .with(EventType.CREATED, () => this.syncUsecase.execute(id))
        .with(EventType.UPDATED, () => this.syncUsecase.execute(id))
        .with(EventType.DELETED, () => this.removeUsecase.execute(id))
        .exhaustive();
    } catch (error) {
      this.logger.error(ErrorLogFormatter.format(error));
    }
  }
}

// bootstrap/setup-<module>.bootstrap.ts
@Injectable()
export class Setup<Module>Bootstrap implements OnModuleInit {
  private readonly logger = new Logger(Setup<Module>Bootstrap.name);

  constructor(private readonly setupUsecase: Setup<Module>Usecase) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.setupUsecase.execute();
    } catch (error) {
      this.logger.error(ErrorLogFormatter.format(error));
    }
  }
}
```

Every driving adapter that runs outside a request (`scheduler`, `event`, `bootstrap`) MUST catch
and log — an unhandled rejection there takes the process down.

---

## Phase 4 — Wire the module

Bind every port to its adapter in the composition root, register the driving adapters, and export
only what other modules may call. The full NestJS provider block, the `useFactory` form for domain
services, injection tokens and the module wiring test live in **`nestjs-binding.md`** — do not
duplicate them here.

Then:

- Register the module in the application root module.
- Add its path alias to the app tsconfig **and** the test tsconfig.
- Add a wiring test asserting each port resolves and each driving adapter is registered.

---

## Implementation checklist

- [ ] Module folder created with `domain/`, `application/`, `infrastructure/` and `<module>.module.ts` at the root
- [ ] Path alias added to the app tsconfig **and** the test tsconfig
- [ ] Aggregate folder with entity (private ctor + `create` + `update`), enum, barrel
- [ ] Entity carries the business rules **and their constants**; no framework imports in `domain/`
- [ ] Repository declared as `abstract class`, reads that can miss return `Nullable<T>`
- [ ] Ports placed by consumer (domain service → `domain/`, use cases only → `application/ports/`)
- [ ] Domain service, if any, is a plain class constructed in the composition root
- [ ] Typed exceptions defined (domain vs application) with `code` + `context`
- [ ] One use case per intent, single `execute()`, abstractions only in the constructor
- [ ] No config reads and no transport exceptions in the application layer
- [ ] Output DTO + application mapper for anything crossing to HTTP
- [ ] Persistence entity + mapper + repository, separate from the domain entity
- [ ] External provider: retry, mapping **before** the error handler, typed exception on write,
      degraded log on read, config read in the constructor body
- [ ] Controllers/schedulers/events/bootstrap contain no business logic and catch outside a request
- [ ] Every port bound and **every driving adapter registered** in the composition root
- [ ] Barrels (`index.ts`) in every folder with content; no deep imports across folders
- [ ] Module registered in the root module, with a wiring test covering ports and adapters
- [ ] Suite actually runs: check the test count, not just the exit code
