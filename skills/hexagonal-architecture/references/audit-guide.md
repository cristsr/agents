# AUDIT Mode — Evaluating a Project's Hexagonal Architecture

Use this reference when asked to review, score, or improve the architecture of an existing
codebase. The output is a **findings report**, not a refactor. Do not change code unless the user
explicitly asks for the fixes to be applied.

---

## Procedure

### Step 1 — Map the terrain (read-only, no assumptions)

Run these before forming any opinion. They are cheap and they anchor every later claim.

```bash
# 1. Module and layer inventory
find <src> -maxdepth 2 -type d -not -path "*/node_modules/*" | sort

# 2. Every file, to detect naming and placement drift
find <src> -type f -name "*.ts" -not -path "*/node_modules/*" | sort

# 3. Path aliases and compiler setup — check BOTH the app and the test tsconfig
cat tsconfig*.json
```

Then run the boundary scan. Do not retype the greps by hand — the script is deterministic and its
detectors are already tuned against false positives:

```bash
bash scripts/audit-scan.sh <src>
```

It prints one section per detector, grouped HIGH / MEDIUM / LOW / WIRING, and maps directly onto
the smell catalog below.

Four of its sections read the **shape** of the tree rather than the contents of files — loose
files at a layer root, files at a module root, the role folders each layer declares, and
aggregates without a folder. Read those first: they are the only ones that surface a defect
every module shares, and they frame everything the grep detectors report afterwards. Two caveats
on their output:

- The script cannot know which top-level folders are bounded modules. A composition root, a
  `tooling/` CLI or a `database/` folder will show up under "files at a module root"; that is
  expected, not a finding.
- A layer root legitimately holds `index.ts`, and a module root legitimately holds
  `<module>.module.ts`. Both are already excluded.

CRITICAL: **every hit is a lead, not a finding.** Open the file and confirm before reporting it.
Three detectors deliberately need human judgement and say so in their output:

- *catchError before map* — the script only lists the providers; you must read the pipeline order.
- *repository read declared non-nullable* — you must check whether the query can actually miss.
- *adapters possibly unregistered* — compare each listed class against its module's `providers[]`.

If the script cannot run (no bash), fall back to the individual greps inside it.

### Step 2 — Score each dimension

Score 0–3 per dimension. Anything below 2 becomes a finding.

| # | Dimension | 3 — solid | 1 — weak |
|---|-----------|-----------|----------|
| 1 | **Dependency direction** | domain imports nothing outward; application never touches adapters | ORM/SDK types appear in domain or application |
| 2 | **Module boundaries** | one folder per bounded context, three layers inside | technical folders at the top, or a "common" dumping ground |
| 3 | **Domain richness** | entities own their rules; queries are methods | anemic entities; rules live in use cases or controllers |
| 4 | **Ports & bindings** | abstract classes bound in the module with `{ provide, useClass }` | interfaces + string tokens, or adapters injected directly |
| 5 | **Use case granularity** | one intent, one `execute()` | `XService` with many public methods orchestrating everything |
| 6 | **Adapter thinness** | controllers/crons/handlers only delegate | business logic in a controller or scheduler |
| 7 | **Mapping isolation** | domain ≠ persistence ≠ DTO, joined by mappers | one class reused across all three |
| 8 | **Error handling** | typed hierarchy with `code`/`context`/`cause`, formatter for logs | raw `Error`, swallowed catches, `console.log` |
| 9 | **Naming consistency** | file and class suffixes uniform across modules | mixed `Usecase`/`UseCase`, `.event.ts`/`.event-handler.ts` |
| 10 | **Shared kernel hygiene** | shared holds types, VOs, exceptions, config only | business logic or module-specific code in shared |
| 11 | **Cross-module coupling** | via exported use cases or events, wrapped in a local port | direct import of another module's repository/entity |
| 12 | **Testability** | use cases constructible with fakes; no hidden statics | dependencies created with `new` inside classes |
| 13 | **Layer topology** | every file sits in a folder that names its role; `application/` and `infrastructure/` roots hold only their barrel; `domain/` groups by aggregate once there are two | use-case folders with the repository, the registry and a shared enum loose beside them |

Total /39. Report the score with the two or three dimensions that cost the most points.

CRITICAL about dimension 13: it is the one you will not see by reading files, because a broken
topology is almost always **broken the same way in every module**, which reads as a convention.
Score it against the canonical layout in `SKILL.md`, not against the other modules — comparing
modules only finds the odd one out. The scan's four `STRUCTURE`/topology sections give you the
whole tree at once; read the "role folders per layer" table as a block and ask what a loose file
would have been called if someone had given it a folder.

### Step 3 — Write findings, ranked by severity

One finding per real defect. Never pad the list.

```markdown
### [SEV] <one-line claim>
- **Where:** `path/to/file.ts:LINE` (+ other occurrences)
- **Rule broken:** <rule from SKILL.md>
- **Why it hurts:** <the concrete future cost, not a platitude>
- **Fix:** <the smallest change that resolves it>
```

Severity:
- **HIGH** — breaks the dependency direction or makes a technology unswappable.
- **MEDIUM** — logic in the wrong layer, missing abstraction, error handling that loses failures.
- **LOW** — naming drift, missing barrel, missing JSDoc, dead folder.

Close with a **prioritized plan**: the 3–5 changes with the best ratio of architectural gain to
diff size, in the order they should be done.

---

## Smell Catalog

Each entry: what to look for → why it is wrong → the fix.

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
→ Mongoose types spread through the application layer.
→ Fix: map to the domain entity inside the repository.

**Swallowed or untyped errors**
`catch (e) {}`, `catch (e) { console.log(e) }`, `throw new Error('failed')`.
→ Failures disappear; incidents cannot be diagnosed; callers cannot react selectively.
→ Fix: typed exception hierarchy with `code`/`context`/`cause`; log through the formatter;
re-throw what you cannot handle. See `errors-and-logging.md`.

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
  in `application/ports/` inside the same module. Choose by the rule in SKILL.md and align.
- Barrel-only module doc drift: `docs/ARCHITECTURE.md` describing paths that no longer exist.

---

## Report template

Write the report in the **user's language** (see the Output Language rule in `SKILL.md`). The
template below is English scaffolding — translate the headings and prose; keep file paths, rule
names, severities and code in English.

```markdown
# Architecture Audit — <project>

**Scope:** <paths reviewed> · **Date:** <date>
**Score:** <n>/39

## Summary
<3–5 lines: what is solid, what is the dominant weakness.>

## Dimension scores
| Dimension | Score | Note |
|---|---|---|
| Dependency direction | 3/3 | — |
| Domain richness | 1/3 | rules live in use cases |
...

## Findings
### [HIGH] ...
### [MEDIUM] ...
### [LOW] ...

## Prioritized plan
1. <highest gain / smallest diff>
2. ...
```

---

## Rules for the auditor

- **Cite a file and line for every finding.** A claim without a location is not a finding.
- **Verify before reporting.** Read the file; do not infer a violation from a filename.
- **No speculative findings.** "This might not scale" is not a defect. Name the concrete failure.
- **Respect deliberate exceptions — but do not let uniformity end the question.** If the project
  consistently does something differently and it holds the dependency direction, report it as a
  convention to document, not as a defect. The trap: this rule reads "consistent" as "decided",
  and a defect present in *every* module is consistent by definition. Before filing something as
  a convention, ask the two questions that separate a decision from a habit:
  - **Is it uniform because someone chose it, or because it was copied?** A convention has a
    reason someone can state. Loose files at a layer root have none — nobody decides that a
    repository has no home; it just never got one.
  - **Would a new module reproduce it?** If yes and nobody would defend it in review, it is
    drift, not convention — and the cost compounds with every module added.

  This is how a whole-codebase topology defect stays invisible through an otherwise thorough
  audit: the auditor compares modules against each other, finds them consistent, and never
  compares the shape against the canonical layout. Dimension 13 exists for exactly this.
- **Separate architecture from style.** Formatting, TS syntax and SOLID nuance belong to the
  `typescript`, `error-handling` and `design-principles` skills — mention and defer.
- **Rank honestly.** A report where everything is HIGH is a report nobody acts on.
