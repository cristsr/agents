# design.md Template

Save to `work/active/sm-<number>/design.md` using exactly this structure.
Remove sections marked as conditional if they do not apply.

`design.md` is the narrative summary — full machine-readable contracts live
in `work/active/sm-<number>/docs/` (see `api-template.md` for `docs/api.yaml`
and `data-model-template.md` for `docs/data-model.md`).
Never embed the full Mermaid diagram, DTO/schema definitions, or the
TypeORM entity/migration SQL inline here — reference the files in `docs/`
instead.

---

```markdown
# design: sm-<number>

## Decisiones de Diseño

<!-- OPTIONAL: Include only if PHASE 3 resolved at least one unknown via
     questions. Omit this section entirely if design.md was produced with
     zero ambiguities (everything was already defined in hu.md/context.md). -->

- **<unknown resuelto>:** <opción elegida> — <razón breve>

## Flujo entre microservicios

<resumen de 1-2 oraciones de qué hace el flujo — el diagrama completo está en `docs/diagram.md`>

## Componentes del módulo

<1 oración: qué componente(s) nuevo(s)/modificado(s) introduce esta historia
(caso de uso, agregado, puerto, adapter) — el diagrama completo (C4 Nivel 3,
todo el módulo, no solo el delta) está en `docs/component.md`>.

## Impacto en Arquitectura Global

<!-- SIEMPRE presente, nunca condicional — es lo que permite que /sync
     promueva sin tener que re-detectar nada desde un git diff. -->

**¿Toca arquitectura global?** Sí / No.

<!-- Si Sí: nombrar exactamente qué cambia y en qué nivel C4, con el
     nodo/arista concreto a agregar o quitar — /sync y /architecture lo
     aplican tal cual, no lo vuelven a inferir.
     Si No: una oración confirmando que el alcance es interno al módulo. -->

- **Nivel:** Context (Nivel 1) / Container (Nivel 2) / N/A
- **Cambio:** <nuevo app/microservicio | nuevo módulo | nueva integración
  externa | integración eliminada | actor nuevo | ninguno>
- **Nodo/arista concreto:** <lo que /architecture debe agregar/quitar, o
  "N/A" si la respuesta fue No>

## Contratos por microservicio

### sm-<microservice-1>

| Método | Ruta | Descripción de negocio |
|--------|------|-------------------------|
| POST | /recurso/search | <qué resuelve, no solo el verbo HTTP> |

> Schemas de request/response, validaciones y códigos de respuesta completos: `docs/api.yaml` (tag `<microservice-1>`).

---

### sm-<microservice-2>  ← repetir si hay más de uno

[misma estructura]

---

## Modelado de datos  ← omitir si no hay tabla nueva

Entidad(es) nueva(s): `nombre_tabla`.

> Entidad TypeORM y migración SQL completas: `docs/data-model.md`.

## Validación de Quality Gates

<!-- Siempre presente. Si hay constitución cargada, valida sus gates; si no,
     aplica los cuatro gates built-in por default. -->

| Gate | Resultado | Justificación |
|------|-----------|---------------|
| Simplicity | ✅/⚠️ | <justificación en una línea> |
| Anti-Abstraction | ✅/⚠️ | <justificación en una línea> |
| Integration-First | ✅/⚠️ | <justificación en una línea> |
| Test-First | ✅/⚠️ | <justificación en una línea> |

## Excepciones a la constitución  ← omitir si todos los gates pasaron (✅)

<!-- OPTIONAL: solo si un gate falla (⚠️) y se decide seguir igual con
     justificación aprobada por el usuario en PHASE 5. -->

- **<Gate/Artículo violado>:** <por qué se hace la excepción> — aprobado por el usuario.
```
