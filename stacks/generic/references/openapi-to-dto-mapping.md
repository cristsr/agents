# OpenAPI → DTO Mapping (generic — stack-agnostic)

Reference for the DTO task(s) in `/plan`. Every field in a generated DTO
class must trace back to a field in `work/active/spec-<number>/docs/<api-artifact>`
(`api.delta.yaml` if `API_CONTRACT_MODE=delta`; otherwise `api.yaml`)
— never invent a field, decorator, or type not implied by this mapping.

| OpenAPI | DTO (the project's language) |
|---|---|
| listed in `required: [...]` | required field (the stack's required validator/marker) |
| absent from `required: [...]` | optional field |
| `type: string` | native string + string validator |
| `type: integer` | integer + numeric validator |
| `type: number` | decimal + numeric validator |
| `type: boolean` | boolean + validator |
| `type: array`, `items: {...}` | typed list; if items is an object → nested DTO |
| `format: uuid` | UUID validator |
| `format: date-time` | date-time validator |
| `format: email` | email validator |
| `enum: [...]` | native enum with the same values + validator |
| `nullable: true` | the stack's optional / nullable |
| `$ref: '#/components/schemas/X'` | nested DTO `X` |
| schema `description` | the field's doc/description in the DTO |
| response schema | response DTO — no validators (output isn't validated) |

## Rules

- One DTO class per schema in `components.schemas` — same name, same file
  conventions as the rest of the codebase.
- Field order in the generated class should match the order in the contract —
  it makes diffing the two artifacts easier during review.
- If the contract and `context.md` disagree on a field that already exists in the
  entity (different name or type), the contract wins for the DTO — but tell the
  user, since `/design` probably introduced a rename that must reach the
  entity/use case too.
- Never add a validator not implied by the schema (e.g. don't add length
  limits unless the contract specifies `maxLength`).
- For the exact DTO syntax (decorators/annotations), see the stack pack
  (`STACK_REFS`, e.g. `typescript-nestjs`) and the project's conventions
  (`DTO_STYLE` in profile section 7).
