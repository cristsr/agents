# OpenAPI → NestJS DTO Mapping

Reference for the DTO task(s) in `/plan`. Every field in a generated DTO
class must trace back to a field in `work/active/sm-<number>/docs/api.yaml`
— never invent a field, decorator, or type not implied by this mapping.

| OpenAPI (`docs/api.yaml`) | NestJS DTO (`class-validator` + `@nestjs/swagger`) |
|---|---|
| listed in `required: [...]` | `@IsNotEmpty()` |
| absent from `required: [...]` | `@IsOptional()` |
| `type: string` | `@IsString()` |
| `type: integer` | `@IsInt()` |
| `type: number` | `@IsNumber()` |
| `type: boolean` | `@IsBoolean()` |
| `type: array`, `items: {...}` | `@IsArray()` + `@ValidateNested({ each: true })` + `@Type(() => ItemDto)` if items is an object |
| `format: uuid` | `@IsUUID()` |
| `format: date-time` | `@IsDateString()` |
| `format: email` | `@IsEmail()` |
| `enum: [...]` | `@IsEnum(EnumName)` (define the TS enum from the same values) |
| `nullable: true` | `@IsOptional()` (NestJS/class-validator has no direct "nullable" decorator — optional covers the practical case) |
| `$ref: '#/components/schemas/X'` | nested DTO class `X`, referenced with `@ValidateNested()` + `@Type(() => X)` |
| schema `description` | `@ApiProperty({ description: '...' })` (or `@ApiPropertyOptional` if optional) |
| response schema | the Response DTO class — plain fields, no validators needed (NestJS doesn't validate outgoing responses) |

## Rules

- One DTO class per schema in `components.schemas` — same name, same file
  conventions as the rest of the codebase (`<Name>RequestDto`, `<Name>ResponseDto`).
- Field order in the generated class should match the order in `api.yaml` —
  makes diffing the two artifacts easier during review.
- If `api.yaml` and `context.md` disagree on a field that already exists in
  an entity (different name or type), `api.yaml` wins for the DTO — but flag
  it to the user before proceeding, since it likely means `/design` introduced
  a rename that needs to also reach the entity/use case.
- Never add a validator not implied by the schema (e.g. don't add
  `@MaxLength()` unless `api.yaml` specifies `maxLength`).
