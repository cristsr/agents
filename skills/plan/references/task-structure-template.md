# Task Structure Template

Every task after Task 0 must follow this exact structure:

```markdown
### Tarea N: [Nombre del componente]

**Archivos:**
- Crear: `sm-<micro>/src/exact/path/to/file.ts`
- Modificar: `sm-<micro>/src/exact/path/to/existing.ts:123-145`
- Test: `sm-<micro>/src/exact/path/to/file.spec.ts`

**Step 1: Escribir el test que falla**

En `sm-<micro>/src/path/to/file.spec.ts`:

```typescript
describe('ClassName', () => {
  it('should [behavior]', async () => {
    // arrange
    const input = ...;
    // act
    const result = await service.method(input);
    // assert
    expect(result).toEqual(expected);
  });
});
```

**Step 2: Ejecutar y confirmar que falla**

```bash
cd sm-<micro>
npx jest src/path/to/file.spec.ts --no-coverage
cd ..
```
Esperado: FAIL — "Cannot find module" o "X is not a function"

**Step 3: Implementar el mínimo código**

En `sm-<micro>/src/path/to/file.ts`:

```typescript
// minimum necessary name
```

**Step 4: Ejecutar y confirmar que pasa**

```bash
npx jest src/path/to/file.spec.ts --no-coverage
```
Esperado: PASS
```

---

## Notes on task design

- Each task should represent a single cohesive component (service, repository, use case, port, adapter)
- Tasks should be ordered by dependency: define interfaces before implementations
- A task with more than 6 steps is likely too large — split it
- Always mock external dependencies, never use real services in unit tests

## `[P]` marker (parallel execution)

If PHASE 2 of `/plan` detected independent microservice groups, mark every task
header belonging to those groups with a trailing `[P]`:

```markdown
### Tarea 4: DTOs de request y response [P]
```

`[P]` means: this task has no dependency on tasks from a *different* `[P]`
group in the same plan. `/build` may batch the file operations (Edit/Write)
and test runs of tasks from different `[P]` groups using parallel tool calls
within the same response, instead of strictly one-at-a-time. Tasks within the
*same* group still execute in their written order.

Do not mark tasks `[P]` if there is any chance one group's code imports or
depends on the other's output.
