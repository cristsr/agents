# NestJS Binding — realising the rules in Nest

Load this whenever the project uses NestJS. `SKILL.md` states the rules; this file is how they are
expressed with Nest's DI container. Nothing here changes a rule — it only shows the syntax.

---

## Why ports are abstract classes

Nest resolves providers by runtime token. A TypeScript `interface` does not exist at runtime, so a
port declared as an interface forces a string token:

```typescript
// Wrong — no type safety on the binding, and a typo fails at boot instead of at compile time
export interface UserRepository { … }
@Inject('USER_REPOSITORY') private readonly repo: UserRepository

// Correct — the class is both the contract and the token
export abstract class UserRepository {
  abstract findById(id: Uuid): Promise<Nullable<User>>;
}
constructor(private readonly repo: UserRepository) {}
```

The adapter uses `implements`, never `extends` — the binding happens in the module.

---

## The module file is the composition root

```typescript
@Module({
  imports: [MongooseModule.forFeature([MongodbOkrTaskEntityProvider])],
  controllers: [OkrController],
  providers: [
    // driving adapters — every one of these MUST be listed or it never runs
    SetupOkrBootstrap,
    OkrTaskEventHandler,
    OkrKeyResultEventHandler,
    OkrTaskScheduler,

    // use cases
    SyncOkrTaskStatusUsecase,
    RemoveOkrTaskUsecase,

    // port -> adapter bindings
    { provide: OkrTaskDataSourcePort, useClass: NotionOkrTaskProvider },
    { provide: OkrTaskRepository,     useClass: MongodbOkrTaskRepository },

    // domain services
    {
      provide: OkrTaskService,
      useFactory: (repo: OkrTaskRepository, source: OkrTaskDataSourcePort) =>
        new OkrTaskService(repo, source),
      inject: [OkrTaskRepository, OkrTaskDataSourcePort],
    },
  ],
  exports: [], // only the use cases other modules may call
})
export class OkrModule {}
```

Provider order: driving adapters → use cases → port bindings → domain services.

CRITICAL: A driving adapter missing from `providers` produces **no error and no log** — the events
simply never arrive. Guard it with a wiring test (below).

---

## Domain services without decorators

A domain service must stay framework-free, so it cannot carry `@Injectable()`. `useFactory` with
an explicit `new` is how it enters the container:

```typescript
// domain/okr-task/okr-task.service.ts — no imports from @nestjs/*
export class OkrTaskService {
  constructor(
    private readonly repository: OkrTaskRepository,
    private readonly dataSource: OkrTaskDataSourcePort,
  ) {}
}
```

Registered with the `useFactory` block shown above.

---

## Injection tokens for third-party clients

A third-party class you do not own becomes a token by subclassing it:

```typescript
// shared/infrastructure/config/notion/notion.client.ts
export class NotionClient extends Client {}

// notion.client.factory.ts
export class NotionClientFactory {
  static getClient() {
    return (config: ConfigService) => new NotionClient({ auth: config.get('NOTION_API_TOKEN') });
  }
}

// in the module
{ provide: NotionClient, useFactory: NotionClientFactory.getClient(), inject: [ConfigService] }
```

Factories live in `infrastructure/config/<service>/`, expose a `static create()` / `getClient()`
returning the factory function, and are the only place `ConfigService` is read.

### Keeping config out of the application layer

When a use case needs a configured default, do not inject `ConfigService` into it. Declare a port
for the resolved values and provide it from infrastructure:

```typescript
// application/ports/notification-defaults.port.ts
export abstract class NotificationDefaults {
  abstract readonly provider: NotifierTypes;
  abstract readonly ttl: number;
}

// infrastructure/config/notifier/notification-defaults.factory.ts
export class NotificationDefaultsFactory {
  static create() {
    return (config: ConfigService): NotificationDefaults => ({
      provider: config.get<NotifierTypes>('NOTIFICATION_PROVIDER'),
      ttl: +config.get('NOTIFICATION_TTL'),
    });
  }
}

// in the module
{ provide: NotificationDefaults, useFactory: NotificationDefaultsFactory.create(), inject: [ConfigService] }
```

### String tokens — only for collections

```typescript
export const NOTIFIERS = 'NOTIFIERS';

{
  provide: NOTIFIERS,
  useFactory: NotifierFactory.createNotifiers(),
  inject: [DiscordNotifierService, PushoverNotifierService],
}

constructor(@Inject(NOTIFIERS) private readonly notifiers: Notifiers) {}
```

Everything else binds on the abstract class.

---

## The global shared module

```typescript
@Global()
@Module({
  imports: [
    EventEmitterModule.forRoot({ global: true }),
    MongooseModule.forRootAsync({ useFactory: MongodbConnectionFactory.create(), inject: [ConfigService] }),
  ],
  controllers: [HealthcheckController],
  providers: [
    { provide: EventEmitter, useExisting: EventEmitter2 },
    { provide: NotionClient, useFactory: NotionClientFactory.getClient(), inject: [ConfigService] },
    { provide: APP_GUARD, useClass: BasicAuthGuard },
  ],
  exports: [NotionClient],
})
export class SharedModule {}
```

Feature modules never re-provide what `SharedModule` exports. A feature module that depends on a
globally-registered module it does not import (e.g. `HttpModule.register({ global: true })` in
`AppModule`) is an implicit coupling — prefer importing it explicitly in the module that uses it.

`AppModule` stays a wiring file: `ConfigModule.forRoot({ isGlobal: true })`, the global
`ValidationPipe` via `APP_PIPE`, `SharedModule`, then the feature modules. No logic.

---

## Driving adapters

```typescript
// http — delegation only
@Controller('tasks')
export class DailyTaskController {
  constructor(private readonly retrieveTaskUsecase: RetrieveDailyTaskUsecase) {}

  @Get()
  getTasks() {
    return this.retrieveTaskUsecase.execute();
  }
}

// scheduler
@Injectable()
export class DailyTaskScheduler {
  constructor(private readonly notifyUsecase: NotifyDailyTaskUsecase) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async notifyTasks(): Promise<void> {
    await this.notifyUsecase.execute();
  }
}

// event handler — filter by source, exhaustive match, always catch
@Injectable()
export class OkrTaskEventHandler {
  private readonly logger = new Logger(OkrTaskEventHandler.name);
  private readonly dataSourceId: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly syncUsecase: SyncOkrTaskUsecase,
    private readonly removeUsecase: RemoveOkrTaskUsecase,
  ) {
    // constructor body, NOT a field initializer — see SKILL.md
    this.dataSourceId = this.configService.get('NOTION_OKR_TASK_DATASOURCE');
  }

  @OnEvent('notion.event')
  async onNotionEvent(event: NotionEventInput): Promise<void> {
    if (event.data?.parent?.data_source_id !== this.dataSourceId) return;

    const id = Uuid.create(event.entity.id);

    try {
      await match(event.type)
        .with(NotionEventType.PAGE_CREATED, () => this.syncUsecase.execute(id))
        .with(NotionEventType.PAGE_DELETED, () => this.removeUsecase.execute(id))
        .exhaustive();
    } catch (error) {
      this.logger.error(ErrorLogFormatter.format(error));
    }
  }
}

// bootstrap
@Injectable()
export class SetupOkrBootstrap implements OnModuleInit {
  private readonly logger = new Logger(SetupOkrBootstrap.name);

  constructor(private readonly setupUsecase: SetupOkrUsecase) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.setupUsecase.execute();
    } catch (error) {
      this.logger.error(ErrorLogFormatter.format(error));
    }
  }
}
```

CRITICAL: `await` the `match(...)` when its handlers are async, or rejections escape the
surrounding `try/catch`.

---

## Mongoose persistence

```typescript
@Schema({ collection: 'okr_tasks' })
export class MongodbOkrTaskEntity {
  @Prop({ required: true }) id: string;
  @Prop({ type: String, default: null }) keyResultId: Nullable<string>;
  @Prop({ type: Date, default: Date.now }) updatedAt: Date;

  constructor(payload: MongodbOkrTaskEntity) {
    Object.assign(this, payload);
  }
}

export const OkrTaskSchema = SchemaFactory.createForClass(MongodbOkrTaskEntity);

export const MongodbOkrTaskEntityProvider: ModelDefinition = {
  name: MongodbOkrTaskEntity.name,
  schema: OkrTaskSchema,
};
```

```typescript
@Injectable()
export class MongodbOkrTaskRepository implements OkrTaskRepository {
  constructor(
    @InjectModel(MongodbOkrTaskEntity.name)
    private readonly model: Model<MongodbOkrTaskEntity>,
  ) {}

  async findById(id: Uuid): Promise<Nullable<OkrTask>> {
    const doc = await this.model.findOne({ id: id.value }).exec();
    if (!doc) return null;
    return MongodbOkrTaskMapper.toDomain(doc);
  }
}
```

The repository returns domain entities. Mongoose documents never leave infrastructure.

---

## RxJS pipeline for external providers

```typescript
async fetchById(id: Uuid): Promise<Nullable<OkrTask>> {
  const source = defer(() => from(this.client.pages.retrieve({ page_id: id.value }))).pipe(
    retry({ count: 3, delay: 1000, resetOnSuccess: true }),
    map((page) => NotionOkrTaskMapper.toDomain(page, this.options)),   // map BEFORE catchError
    catchError((err) => {
      this.logger.warn(
        ErrorLogFormatter.format({
          code: 'FIND_OKR_TASK_FAILED',
          message: 'Failed to fetch OKR Task from Notion',
          context: { id: id.value },
          cause: err,
        }),
      );
      return EMPTY;
    }),
  );

  return await lastValueFrom(source, { defaultValue: null });
}
```

Writes throw instead of degrading:

```typescript
catchError((err) => {
  throw new OkrTaskSyncException({ taskId: taskId.value }, err);
}),
```

Paginated reads compose a local `query(cursor?)` with
`defer → expand → takeWhile(s => s.hasMore, true) → map → reduce`, and put the final `map` to
domain **before** the outermost `catchError`.

---

## Testing the wiring

A module smoke test is the cheapest guard against an unregistered adapter or a missing binding.
Stub the global module and override the persistence tokens:

```typescript
@Global()
@Module({
  providers: [{ provide: NotionClient, useValue: {} }],
  exports: [NotionClient],
})
class StubSharedModule {}

describe('OkrModule wiring', () => {
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), StubSharedModule, OkrModule],
    })
      .overrideProvider(getModelToken(MongodbOkrTaskEntity.name))
      .useValue({})
      .compile();
  });

  afterAll(async () => {
    await module?.close();
  });

  it('binds every port to a concrete adapter', () => {
    expect(module.get(OkrTaskRepository)).toBeDefined();
    expect(module.get(OkrTaskDataSourcePort)).toBeDefined();
  });

  it('registers every event handler', () => {
    expect(module.get(OkrTaskEventHandler)).toBeInstanceOf(OkrTaskEventHandler);
    expect(module.get(OkrKeyResultEventHandler)).toBeInstanceOf(OkrKeyResultEventHandler);
  });
});
```

Note: `overrideProvider` only works on tokens the module already declares. A provider that comes
from a `@Global()` module must be supplied by a stub module, as above.

### Jest configuration

The test tsconfig needs the same `paths` as the app tsconfig, and Jest needs a matching
`moduleNameMapper`. Without both, every spec touching an aliased file fails to compile:

```typescript
moduleNameMapper: {
  '^@okr/(.*)$': '<rootDir>/src/okr/$1',
  '^@shared/(.*)$': '<rootDir>/src/shared/$1',
},
```

ESM-only dependencies (for example `uuid` v13) need
`transformIgnorePatterns: ['node_modules/(?!uuid/)']` plus `allowJs: true` in the test tsconfig.

---

## Bootstrap

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();
  app.setGlobalPrefix('api');

  const config = app.get(ConfigService);   // typed, never app.get<any>(...)

  Settings.defaultZone = config.get('TIME_ZONE');

  await app.listen(config.get('PORT'));
}
```
