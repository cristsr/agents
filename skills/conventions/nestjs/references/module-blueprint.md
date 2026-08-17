# BUILD Mode — NestJS Project & Module Blueprint

Use this reference when creating a NestJS project from scratch or adding a module to one.

This is the **Nest dialect**: it shows how the hexagonal rules are *expressed* in
NestJS + Mongoose. It never restates the rules — the domain and application layers
(entities, value objects, repository/data-source ports, use cases, application
ports, DTOs) follow the `hexagonal-architecture` skill's `references/rules.md` and
the `hexagonal-architecture` skill's `references/exception-placement.md`, and the
TypeScript class shapes follow the `typescript` skill. This file only covers what
Nest adds: the bootstrap, the persistence syntax, the driving adapters and the
wiring.

For the DI mechanics (tokens, `useFactory`, global modules, wiring tests) read
`nestjs-binding.md` in this same references folder.

---

## Phase 0 — Bootstrap a new NestJS project (skip if the project exists)

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

   The baseline types and the exception base form are the `typescript`
   skill's `references/errors-and-logging.md`; the two families and their placement
   are the `hexagonal-architecture` skill's `references/exception-placement.md`.
   Create them before writing any adapter.

3. **Path aliases** in `tsconfig.app.json` — `@shared/*` plus one per module — and
   in the test tsconfig too (see the `typescript` skill's `references/path-alias-setup.md`).
4. **`main.ts`**: `setGlobalPrefix('api')`, global `ValidationPipe({ transform: true, always: true })`
   via `APP_PIPE`, timezone from config (`Settings.defaultZone = config.get('TIME_ZONE')`).
5. **`app.module.ts`**: `ConfigModule.forRoot({ isGlobal: true })`, `SharedModule`, then feature
   modules. Keep it a wiring file — no providers with logic.
6. **Formatting**: prettier `printWidth: 120`, `singleQuote: true`, `trailingComma: "all"`.

---

## Phase 1 — Nest infrastructure

The domain and application layers follow the `hexagonal-architecture` skill's
`references/rules.md`. What follows is what Nest adds below them.

### Step 1.1 — Persistence (entity + mapper + repository)

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

### Step 1.2 — External provider

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

### Step 1.3 — Driving adapters

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
and log — see the `hexagonal-architecture` skill's `references/exception-placement.md` for the policy.

---

## Phase 2 — Wire the module

Bind every port to its adapter in the composition root, register the driving adapters, and export
only what other modules may call. The full NestJS provider block, the `useFactory` form for domain
services, injection tokens and the module wiring test live in **`nestjs-binding.md`** — do not
duplicate them here.

Then:

- Register the module in the application root module.
- Add its path alias to the app tsconfig **and** the test tsconfig.
- Add a wiring test asserting each port resolves and each driving adapter is registered.

---

## Implementation checklist (Nest-relevant)

- [ ] Shared kernel created before any feature module (`@Global()` `SharedModule`)
- [ ] Path alias added to the app tsconfig **and** the test tsconfig
- [ ] Persistence entity + mapper + repository, separate from the domain entity
- [ ] External provider: retry, mapping **before** the error handler, typed exception on write,
      degraded log on read, config read in the constructor body
- [ ] Controllers/schedulers/events/bootstrap contain no business logic and catch outside a request
- [ ] Every port bound and **every driving adapter registered** in the composition root
- [ ] Module registered in the root module, with a wiring test covering ports and adapters
- [ ] Suite actually runs: check the test count, not just the exit code
