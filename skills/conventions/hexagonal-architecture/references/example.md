# hexagonal-architecture — worked example

What a real run looks like: a module laid out layer by layer.
Read it when the shape of the output is in doubt; the rules themselves are in
`SKILL.md`.

## Example

**User says:** "create a reports module that reads from Postgres and exposes an endpoint"

Shown in TypeScript — the shape is identical in any language; only the file
extensions and the binding syntax differ (per the language/framework skills).

**Actions:**
1. Announce, load `rules.md` + the stack's blueprint.
2. `domain/report/` — entity (private constructor + `create`), enum, repository
   port, barrel.
3. `application/usecases/retrieve-report.usecase.ts` with a single `execute`, output
   DTO and mapper.
4. `infrastructure/adapters/persistence/postgres/report/` — schema entity, mapper,
   repository implementing the port. `infrastructure/adapters/http/report.controller`
   only delegating.
5. `report.module` binding port → adapter; register the module and add the alias
   in app + test config.

**Result:** the module compiles, the controller has no logic, and swapping Postgres
is a one-line change.
