# Task Structure Template (generic — stack-agnostic)

Every task after Task 0 must follow this exact structure:

```markdown
### Tarea N: [Nombre del componente]

**Archivos:**
- Crear: `<component>/<exact path>/<file>.<ext>`
- Modificar: `<component>/<exact path>/<existing>.<ext>:123-145`
- Test: `<component>/<exact path>/<file>.<test-suffix>`

**Step 1: Escribir el test que falla**

En `<component>/<path>/<file>.<test-suffix>`:

```<language>
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

> Comando del profile: `MODULE_TEST_CMD` (sección 10) — correrlo sobre el spec puntual.

```bash
cd <component>
<MODULE_TEST_CMD o equivalente sobre el spec>
cd ..
```
Esperado: FAIL — "Cannot find module" o "X is not a function"

**Step 3: Implementar el mínimo código**

En `<component>/<path>/<file>.<ext>`:

```<language>
// minimum necessary name
```

**Step 4: Ejecutar y confirmar que pasa**

```bash
<MODULE_TEST_CMD o equivalente sobre el spec>
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

If PHASE 2 of `/plan` detected independent component groups, mark every task
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
