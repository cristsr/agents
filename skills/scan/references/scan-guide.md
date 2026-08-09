# Scan Guide (generic — stack-agnostic)

Reference for `/scan` PHASE 3 (modo CodeGraph y fallback): sirve para leer los
archivos puntuales que el grafo devuelve (o que el subagente localiza), con
progressive disclosure — leer solo las secciones necesarias por tipo de archivo.

Las rutas y convenciones exactas por tipo de archivo salen del profile
(sección 7: `MODULE_ROOT`, `ORM`, `DI_TOKENS`, `DTO_STYLE`, `TEST_FRAMEWORK`)
y del pack de stack (`STACK_REFS` — este archivo es la versión genérica;
el pack por stack puede especificar patrones concretos).

---

## Persistencia / Entidad

**Path pattern:** según `MODULE_ROOT` y `ORM` del profile (p.ej. `<module>/<persistence-layer>/**/entity/model`)

**Read:**
- Class/model name and its table/schema annotation
- All persistent fields with their types and constraints
- The primary key definition
- Timestamp columns (created/updated) if present

**Do NOT read:** methods, lifecycle hooks, relations unless explicitly needed.

---

## Registro del módulo

**Path pattern:** según el framework (p.ej. `<module>/<module-name>.module.ts`, `__init__.py`, `app.py`)

**Read:**
- `providers`/registrations — list all registered tokens/services
- `imports` — list imported modules/dependencies
- `controllers`/routes — list registered controllers/routers
- `exports` if present

**Do NOT read:** full module implementation, unrelated decorators/annotations.

---

## Caso de uso canónico

**Path pattern:** capa de aplicación (p.ej. `<module>/application/use-cases/**`)

Select the most recently modified or most complete file.

**Read:**
- constructor/init signature — injected dependency names and types only
- `execute()`/main method signature — parameters and return type only

**Do NOT read:** full method implementations, private methods.

---

## DTOs existentes

**Path pattern:** barrel/índice de entrada (p.ej. `<module>/<entry-points>/dtos/index`)

**Read:**
- Exported class/type names only

**Do NOT read:** full DTO implementations, decorators, field definitions.

---

## Puerto / Servicio abstracto (dominio)

**Path pattern:** capa de dominio (p.ej. `<module>/domain/services/**`)

**Read:**
- Abstract/interface method signatures only — name, parameters, return type

**Do NOT read:** concrete implementations (these live in the infrastructure adapters).

---

## Notes

- If a file does not exist at the expected path, register as a gap — do not error.
- If the module uses a different persistence than the profile's default ORM,
  there may be no entity — register as gap.
- Layered modules follow `domain/ → application/ → infrastructure/` (hexagonal)
  or the framework's convention — check both; `MODULE_ROOT` del profile define la base.
