# Plan Header Template

Every plan MUST start with this exact header structure:

```markdown
# sm-<numero>: [Feature Name] — Plan de Implementación

**Historia:** `work/active/sm-<numero>/`
**Microservicio(s):** `<nombre-del-micro>`
**Objetivo:** [Una oración describiendo qué construye esto]
**Arquitectura:** [2-3 oraciones sobre el enfoque y patrones usados]
**Stack:** NestJS · TypeScript · TypeORM · PostgreSQL · Redis · Jest
**Grupos de implementación:** [Solo incluir esta línea si PHASE 2 detectó grupos
independientes. Ej: "Grupo A: sm-capabilities-ms, sm-graphql-fb-ms (secuencial) ∥
Grupo B: sm-users-ms (paralelo, sin dependencia con Grupo A)". Omitir la línea
completa si solo hay un grupo.]

### Trazabilidad AC → Tareas

| AC | Cubierto por |
|----|-------------|
| AC-1 | Tarea N |
| AC-2 | Tarea N, Tarea M |

> Toda AC de `hu.md` debe aparecer al menos una vez en esta tabla. Si falta alguna,
> agregar la tarea correspondiente antes de guardar el plan (ver PHASE 3.5).

---
```

---

## Task 0 — Always the first task after the header

```markdown
### Tarea 0: Preparar rama de trabajo

> Al ejecutar este plan, solicitar al usuario el nombre de la rama antes de continuar.

**Preguntar:** "¿Cuál es el nombre de la rama? (ej: feat/SM-<numero>-descripcion o fix/SM-<numero>-descripcion)"

**Steps:**

**Step 1: Verificar que la base esté fresca (read-only)**

```bash
git -C <microservice> branch --show-current   # esperado: develop
git -C <microservice> status --porcelain      # esperado: vacío (working tree limpio)
```
Esperado: en `develop`, actualizada y sin cambios sin commitear. Preparar la base
(`checkout develop` + `pull`) es trabajo de `/sync`, no de este plan. Si no está en
`develop` actualizado o el working tree está sucio → detener y recomendar
`/sync <microservice>` antes de crear la rama.

**Step 2: Crear rama de trabajo**

```bash
git -C <microservice> checkout -b <nombre-de-rama-dado-por-usuario>
```
Esperado: rama nueva creada y activa, partiendo de `develop` actualizado.
```
