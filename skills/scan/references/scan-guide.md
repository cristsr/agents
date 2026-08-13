# Scan Guide (generic — stack-agnostic)

Reference for `/scan` PHASE 3 (CodeGraph mode and fallback): use it to read the
specific files the graph returns (or the subagent locates), with progressive
disclosure — read only the sections needed per file type.

The exact paths and conventions per file type come from the profile
(section 7: `MODULE_ROOT`, `ORM`, `DI_TOKENS`, `DTO_STYLE`, `TEST_FRAMEWORK`)
and from the stack pack (`STACK_REFS` — this file is the generic version;
a per-stack pack may specify concrete patterns).

---

## Persistence / Entity

**Path pattern:** per the profile's `MODULE_ROOT` and `ORM` (e.g. `<module>/<persistence-layer>/**/entity/model`)

**Read:**
- Class/model name and its table/schema annotation
- All persistent fields with their types and constraints
- The primary key definition
- Timestamp columns (created/updated) if present

**Do NOT read:** methods, lifecycle hooks, relations unless explicitly needed.

---

## Module registration

**Path pattern:** per the framework (e.g. `<module>/<module-name>.module.ts`, `__init__.py`, `app.py`)

**Read:**
- `providers`/registrations — list all registered tokens/services
- `imports` — list imported modules/dependencies
- `controllers`/routes — list registered controllers/routers
- `exports` if present

**Do NOT read:** full module implementation, unrelated decorators/annotations.

---

## Canonical use case

**Path pattern:** application layer (e.g. `<module>/application/use-cases/**`)

Select the most recently modified or most complete file.

**Read:**
- constructor/init signature — injected dependency names and types only
- `execute()`/main method signature — parameters and return type only

**Do NOT read:** full method implementations, private methods.

---

## Existing DTOs

**Path pattern:** entry-point barrel/index (e.g. `<module>/<entry-points>/dtos/index`)

**Read:**
- Exported class/type names only

**Do NOT read:** full DTO implementations, decorators, field definitions.

---

## Port / Abstract service (domain)

**Path pattern:** domain layer (e.g. `<module>/domain/services/**`)

**Read:**
- Abstract/interface method signatures only — name, parameters, return type

**Do NOT read:** concrete implementations (these live in the infrastructure adapters).

---

## Notes

- If a file does not exist at the expected path, register as a gap — do not error.
- If the module uses a different persistence than the profile's default ORM,
  there may be no entity — register as gap.
- Layered modules follow `domain/ → application/ → infrastructure/` (hexagonal)
  or the framework's convention — check both; the profile's `MODULE_ROOT` defines the base.
