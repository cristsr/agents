# OpenAPI → DTO Mapping (generic — stack-agnostic)

Reference for the DTO task(s) in `/plan`. Every field in a generated DTO
class must trace back to a field in `work/active/sm-<number>/docs/<api-artifact>`
(`api.delta.yaml` si `API_CONTRACT_MODE=delta`; si no `api.yaml`)
— never invent a field, decorator, or type not implied by this mapping.

| OpenAPI | DTO (lenguaje del proyecto) |
|---|---|
| listed in `required: [...]` | field requerido (validator/marker de required del stack) |
| absent from `required: [...]` | field opcional |
| `type: string` | string nativo + validator de string |
| `type: integer` | entero + validator numérico |
| `type: number` | decimal + validator numérico |
| `type: boolean` | booleano + validator |
| `type: array`, `items: {...}` | lista tipada; si items es objeto → DTO anidado |
| `format: uuid` | validator de UUID |
| `format: date-time` | validator de fecha-hora |
| `format: email` | validator de email |
| `enum: [...]` | enum nativo con los mismos valores + validator |
| `nullable: true` | opcional / nullable del stack |
| `$ref: '#/components/schemas/X'` | DTO anidado `X` |
| schema `description` | doc/description del campo en el DTO |
| response schema | DTO de respuesta — sin validators (no se valida la salida) |

## Rules

- One DTO class per schema in `components.schemas` — same name, same file
  conventions as the rest of the codebase.
- Field order in the generated class should match the order in el contrato —
  makes diffing the two artifacts easier during review.
- Si el contrato y `context.md` difieren en un campo que ya existe en la
  entidad (nombre o tipo distinto), gana el contrato para el DTO — pero
  avisarlo al usuario, ya que probablemente `/design` introdujo un rename
  que debe llegar también a la entidad/caso de uso.
- Never add a validator not implied by the schema (e.g. don't add length
  limits unless the contract specifies `maxLength`).
- Para la sintaxis exacta del DTO (decoradores/annotations), ver el pack de
  stack (`STACK_REFS`, ej. `typescript-nestjs`) y las convenciones del
  proyecto (`DTO_STYLE` en profile sección 7).
