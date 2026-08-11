# flow `<use-case>.md` Template (delta mode / LikeC4)

Un archivo por caso de uso tocado, en `work/active/sm-<number>/docs/flows/<slug>.md`.
`/sync` lo promueve/reconcilia a `DOCS_MODULE_FLOWS` (`apps/<app>/docs/<module>/flows/<slug>.md`).

El diagrama del flujo **no** vive aquí: vive como `dynamic view <view>` en `model.delta.c4`
(y, promovido, en `<module>.c4`). Este archivo es la semántica: reglas, errores, respuesta.

---

```markdown
---
use_case: <slug-kebab>          # p.ej. open-account
module: <module>                # p.ej. accounts
trigger: <rest|cron|queue|domain-event|cli>
entrypoint: <ruta REST | nombre de cron/job | evento de dominio>
command: <Command o Query que dispara>
view: <viewId de la dynamic view en el .c4>
invariants: [<AC/INV que aplican>]
introduced_by: <spec-XXXX que lo creó>       # no cambia en 'modify'
last_modified_by: <spec-XXXX de este cambio>
status: active                  # active | deprecated | removed
---

# <Nombre del caso de uso>

<1-2 párrafos: qué hace el flujo y cómo viaja el dato entre componentes.>

**Diagrama:** dynamic view `<view>` en [`../<module>.c4`](../<module>.c4).

## Reglas

- **<AC/INV>:** <regla de negocio verificable>.

## Errores

| Condición | Excepción | HTTP |
|---|---|---|
| <caso> | `<Exception>` | <código> |

## Respuesta

<código HTTP + DTO> — o, para triggers no-REST, el efecto observable.
```

## Filling rules

- `trigger` sale de la naturaleza del adaptador primario, no del verbo HTTP.
- `view` debe existir en el `.c4` (lo valida el lint de CI).
- Para `trigger: rest`, `entrypoint` debe coincidir con un `path` del `api.yaml` del módulo.
- No duplicar el diagrama en prosa; enlazar la `dynamic view`.
- En `modify`, conservar `introduced_by`; solo mover `last_modified_by`.
- **Identidad estable = anti-duplicado.** El `use_case` (slug), el `view` y el `operationId`
  del endpoint son la clave de un flujo. Si tu feature toca un flujo ya documentado, **reusá
  esos tres verbatim** — no acuñes un slug/viewId nuevo para el mismo `entrypoint`+`command`.
  Un mismo caso de uso vive en un único `flows/<slug>.md`; su evolución es git + `last_modified_by`.
```
