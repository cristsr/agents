# TS/NestJS — Audit Smell Catalog (stack-specific)

Concrete detectors and smells for the TypeScript + NestJS stack, for
`/hexagonal-audit`. Each entry: what to look at → why it's wrong → the fix. Combine
with the automatic `audit-scan.sh <src>` detector in the same directory (every hit is
a lead, not a finding — confirm by reading the file).

### HIGH — boundary breaks

**Framework decorator in `domain/`**
`@Injectable()`, `@Schema()`, `@Prop()`, `class-validator` decorators on a domain entity.
→ The domain now depends on Nest/Mongoose; it cannot be tested or reused without them.
→ Fix: strip decorators; register domain services with `useFactory`; create a separate
persistence entity plus a mapper.

**Adapter or SDK imported by a use case**
`import { NotionClient }`, `@InjectModel(...)`, `import { MongodbXRepository }` inside
`application/`.
→ The use case is welded to one technology; swapping it means rewriting business flows.
→ Fix: introduce a port (abstract class), depend on it, bind the adapter in the module.

**Port declared as `interface`**
`export interface UserRepository { ... }` + `@Inject('USER_REPOSITORY')`.
→ Interfaces do not exist at runtime, so DI degrades to string tokens: no type safety on the
binding, and a typo fails at boot instead of at compile time.
→ Fix: `export abstract class UserRepository` and bind on the class.

**Domain entity used as the persistence schema**
The same class carries `@Prop()` and business methods.
→ Every schema migration becomes a domain change; the DB shape dictates the model.
→ Fix: split into `<Aggregate>` and `Mongodb<Aggregate>Entity` + `Mongodb<Aggregate>Mapper`.

**Domain entity returned to HTTP**
A controller or use case returns the entity directly.
→ Internal fields leak to the API and every refactor becomes a breaking change.
→ Fix: output DTO + application mapper.

**One module importing another module's `domain/` or `infrastructure/`**
→ Bounded contexts collapse into one; the modules can never be split or deployed apart.
→ Fix: expose a use case from the owning module, consume it through a local port adapter, or
communicate with events.

**`process.env` / `ConfigService` read in domain or application**
→ Business logic depends on deployment configuration.
→ Fix: read config in infrastructure (factories, providers) and pass values inward.

### MEDIUM — logic in the wrong place

**Anemic entity**
The entity has only fields; the use case reads them and decides (`if (task.status === 'DONE')`).
→ The same rule gets re-implemented in every caller and drifts.
→ Fix: move the predicate into the entity (`task.isDone()`), Tell Don't Ask.

**Fat "service" instead of use cases**
`TaskService` with `syncAll`, `notify`, `purge`, `remove` as public methods.
→ Untestable in isolation, unclear transaction boundaries, merge conflicts.
→ Fix: one `<Action><Entity>Usecase` per intent, single `execute()`.

**Business logic in a driving adapter**
Filtering, branching or state decisions inside a controller, cron or event handler.
→ Cannot be reused by another trigger; duplicated the moment a second entry point appears.
→ Fix: push it into the use case (orchestration) or the entity (invariant).

**Repository returning ORM documents**
`findById(): Promise<UserDocument>`.
→ Mongoose/TypeORM types spread through the application layer.
→ Fix: map to the domain entity inside the repository.

**Swallowed or untyped errors**
`catch (e) {}`, `catch (e) { console.log(e) }`, `throw new Error('failed')`.
→ Failures disappear; incidents cannot be diagnosed; callers cannot react selectively.
→ Fix: typed exception hierarchy with `code`/`context`/`cause`; log through the formatter;
re-throw what you cannot handle. See the `typescript` skill's `references/errors-and-logging.md`
and the `hexagonal-architecture` skill's `references/exception-placement.md`.

**Failed writes to an external system logged and ignored**
`catchError(() => { logger.warn(...); return EMPTY; })` on an update/create call.
→ Silent data divergence between systems — the worst class of bug to debug.
→ Fix: reads may degrade; writes must throw a typed `ExternalServiceException`.

**Non-exhaustive branching over an enum**
An object map or `switch` with no default handling, or `if/else` chains on `event.type`.
→ A new enum member compiles and silently does nothing.
→ Fix: `match(...).exhaustive()` from `ts-pattern`, or an explicit exhaustiveness check.

**Missing anti-corruption layer between modules**
A use case injects another module's use case directly.
→ Acceptable only at the adapter level; in a use case it hard-codes the collaboration.
→ Fix: local port + adapter that wraps the foreign use case.

**Error handler placed before the mapping in a reactive pipeline**
`catchError` (or `.catch`) sits above the `map` that builds the domain entity.
→ Whatever the mapper throws escapes the operator meant to absorb it, so a single malformed record
takes down a whole sync run — and the log says nothing, because the handler never fired.
→ Fix: map to domain first, handle errors last. Verify the outermost handler wraps every transform.

**Configuration read in a class field initializer**
`private readonly id: string = this.config.get('X')` next to a `constructor(private readonly config)`.
→ Field initializers run before the constructor assigns its parameters, so `this.config` is
`undefined`. It only works while the compile target is below ES2022; raising `target` — or compiling
the same file with a different tsconfig, such as the test one — breaks it at instantiation.
TypeScript already flags it as TS2729.
→ Fix: read config in the constructor body.

**Test config missing the path aliases**
`tsconfig.spec.json` (or the jest `moduleNameMapper`) does not mirror the app's `paths`.
→ Every spec that touches an aliased file fails to compile. The suite looks healthy because the
failures are suite-level, and the project quietly has no test coverage at all.
→ Fix: mirror `paths` in the test tsconfig and add the matching `moduleNameMapper`. Confirm by
running the suite and reading the test count, not the exit banner.

**Driving adapter never registered**
A class with `@OnEvent`, `@Cron` or `OnModuleInit` that is absent from its module's `providers[]`,
or missing from the barrel.
→ No error, no log — the trigger simply never fires. Often paired with a duplicated class name,
which hides it during review.
→ Fix: register it and add a module wiring test asserting `module.get(Handler)` resolves.

**Files loose at a layer root**
`application/` holds `usecases/`, `ports/`, `dto/` — and also `task.repository.ts`,
`task-name.registry.ts`, `posting-origin.ts` sitting beside them.
→ The use cases got a home and their collaborators did not. The root of a layer is where a
module leaks: a loose `X.repository.ts` beside seven use-case folders is the thing other modules
import, because it is the only file with an obvious path. Once two modules import it, the layer
root has become an undeclared public API.
→ Fix: give every file a role folder — `repositories/`, `services/`, `types/`, `read-models/`.
The rule that survives review: *in a layer, everything is a folder; if it is not a use case, it
is its role*. Whether use cases group by role (`usecases/`) or one folder per use case is the
project's call; both are correct, and neither excuses an orphan.

**A multi-aggregate `domain/` with files at its root**
`domain/okr-task.entity.ts` beside `domain/key-result/`, or three aggregates' files interleaved
flat at the root.
→ With several aggregates, nothing says which file belongs to which, and the mixed shape means a
reader has to check both places for every lookup.
→ Fix: one folder per aggregate root, and move the flat one in too.
→ **Not a finding when the module owns exactly one aggregate.** A lone `task/` folder inside
`domain/` separates nothing, so flat is correct there — this is the one legitimate exception to
"a layer root holds folders, not files", and the scan already applies it. Grouping by technical
type (`entities/`, `repositories/`) is never the fix: that is rule 2 broken one level down.

**Primitive obsession at the boundary**
`execute(taskId: string)` when a `Uuid` value object exists.
→ Validation is skipped and ids get mixed up.
→ Fix: construct the VO in the driving adapter, pass it inward.

### LOW — consistency and hygiene

- Mixed suffixes across modules (`Usecase` vs `UseCase`, `.event.ts` vs `.event-handler.ts`,
  `-usecase.ts` vs `.usecase.ts`). Pick one, apply everywhere.
- Duplicate or missing exports in a barrel (`export * from './x'` twice).
- Empty folders or empty `index.ts` left behind — delete them until they have content.
- Deep imports bypassing a barrel from another folder.
- Missing JSDoc on ports and `execute` methods where the rest of the codebase has it.
- Placeholder specs that only assert `toBeDefined()` — no coverage value, remove or write real ones.
- Aggregate ports split inconsistently: aggregate A's data-source port in `domain/`, aggregate B's
  in `application/ports/` inside the same module. Choose by the placement rule and align.
- Barrel-only module doc drift: `docs/ARCHITECTURE.md` describing paths that no longer exist.
