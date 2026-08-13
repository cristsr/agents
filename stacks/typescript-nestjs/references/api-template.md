# api.yaml Template (OpenAPI 3.1)

Save to `work/active/spec-<number>/docs/<api-artifact>` — `api.delta.yaml` if
`API_CONTRACT_MODE = delta` (default), `api.yaml` if `full`. This file is the contract —
the source of truth for `/plan`'s DTOs. Never write TypeScript DTO snippets
in `design.md` — they belong only as generated code in `/plan`/`/build`.

One `api.yaml` per story, even when multiple microservices are involved.
Use `tags` to indicate which microservice owns each operation.

---

```yaml
openapi: 3.1.0
info:
  title: spec-<number> API
  version: "1.0.0"
  description: spec-<number>: <story title>.
tags:
  - name: <microservice-1>
    description: Endpoints exposed by <microservice-1>
  - name: <microservice-2>
    description: Endpoints exposed by <microservice-2>

paths:
  /resource/search:
    post:
      tags: [<microservice-1>]
      operationId: searchResource
      summary: <short description — what this endpoint does>
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/SearchResourceRequest'
      responses:
        '200':
          description: <success case, in business terms — not a generic "Success">
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SearchResourceResponse'
        '400':
          description: <specific validation-failure case, e.g. "service type does not exist">
        '404':
          description: <specific not-found case>

components:
  schemas:
    SearchResourceRequest:
      type: object
      required: [fieldName]
      properties:
        fieldName:
          type: string
          description: <description>
        optionalField:
          type: integer
          nullable: true
    SearchResourceResponse:
      type: object
      properties:
        fieldName:
          type: string
        anotherField:
          type: integer
        createdAt:
          type: string
          format: date-time
```

---

## Rules

- **One new/changed endpoint from the story → one `path` + `operationId`.** Don't document endpoints the story doesn't touch.
- **Every new field must come from a decision recorded in `## Design Decisions`** or from a field that already exists in `context.md` — never invent a field not backed by one of the two.
- **HTTP response descriptions must be specific to the business case**, not generic ("Success", "Error"). Correct example: `"Zone with no active time slots for the requested service type"`.
- **`required` defines mandatoriness** — any field not listed in `required` is interpreted as optional (`@IsOptional()` on the NestJS DTO `/plan` will generate).
- **Use `format` whenever it applies:** `uuid`, `date-time`, `email` — these map directly to NestJS validators (see `plan/references/openapi-to-dto-mapping.md`).
- **Use `enum` for closed value sets** instead of `type: string` with a description that enumerates options in free text.
- **Write every `description` and `summary` in `ARTIFACT_LANGUAGE`** (profile, section 5 — falls back to `OUTPUT_LANGUAGE`); the contract's prose is part of the artifact. Paths, schema names and `operationId` stay in `IDENTIFIER_LANGUAGE`.
