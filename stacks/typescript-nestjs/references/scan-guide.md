# Scan Guide — Reading Key Files

Reference for `/scan` PHASE 3 (modo CodeGraph y fallback): sirve para leer los
archivos puntuales que el grafo devuelve (o que el subagente localiza), con
progressive disclosure — leer solo las secciones necesarias por tipo de archivo.

---

## TypeORM Entity

**Path pattern:** `<module>/infrastructure/adapters/entities/**/*.entity.ts`

**Read:**
- Class name and `@Entity` decorator value
- All `@Column` fields with their types and constraints
- `@PrimaryGeneratedColumn` or `@PrimaryColumn` fields
- `@CreateDateColumn`, `@UpdateDateColumn` if present

**Do NOT read:** methods, lifecycle hooks (`@BeforeInsert`, etc.), relations unless explicitly needed.

---

## Module File

**Path pattern:** `<module>/<module-name>.module.ts`

**Read:**
- `providers` array — list all registered tokens
- `imports` array — list imported modules
- `controllers` array — list registered controllers
- `exports` array if present

**Do NOT read:** full module implementation, decorators other than `@Module`.

---

## Canonical Use Case

**Path pattern:** `<module>/application/use-cases/**/*.use-case.ts`

Select the most recently modified or most complete file.

**Read:**
- `constructor` signature — injected dependency names and types only
- `execute()` method signature — parameters and return type only

**Do NOT read:** full method implementations, private methods.

---

## Existing DTOs

**Path pattern:** `<module>/infrastructure/entry-points/dtos/index.ts`

**Read:**
- Exported class names only

**Do NOT read:** full DTO implementations, decorators, field definitions.

---

## Service Abstract Class (Domain Port)

**Path pattern:** `<module>/domain/services/**/*.service.ts`

**Read:**
- Abstract method signatures only — name, parameters, return type

**Do NOT read:** concrete implementations (these are in infrastructure adapters).

---

## Notes

- If a file does not exist at the expected path, register as a gap — do not error.
- If the module uses MongoDB instead of PostgreSQL, there may be no TypeORM entity. Register as gap.
- Hexagonal modules follow `domain/ → application/ → infrastructure/` layout.
- Legacy modules may use `src/modules/<name>/` directly — check both.
