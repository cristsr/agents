# api.yaml Template (OpenAPI 3.1)

Save to `work/active/sm-<number>/docs/api.yaml`. This file is the contract —
the source of truth for `/plan`'s DTOs. Never write TypeScript DTO snippets
in `design.md` — they belong only as generated code in `/plan`/`/build`.

One `api.yaml` per story, even when multiple microservices are involved.
Use `tags` to indicate which microservice owns each operation.

---

```yaml
openapi: 3.1.0
info:
  title: sm-<number> API
  version: "1.0.0"
  description: sm-<number>: <título de la historia>.
tags:
  - name: <microservice-1>
    description: Endpoints expuestos por <microservice-1>
  - name: <microservice-2>
    description: Endpoints expuestos por <microservice-2>

paths:
  /recurso/search:
    post:
      tags: [<microservice-1>]
      operationId: searchRecurso
      summary: <descripción corta — qué hace este endpoint>
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/SearchRecursoRequest'
      responses:
        '200':
          description: <caso de éxito, en términos de negocio — no "Éxito" genérico>
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SearchRecursoResponse'
        '400':
          description: <caso específico de validación fallida, ej. "tipo de servicio inexistente">
        '404':
          description: <caso específico de no encontrado>

components:
  schemas:
    SearchRecursoRequest:
      type: object
      required: [fieldName]
      properties:
        fieldName:
          type: string
          description: <descripción>
        optionalField:
          type: integer
          nullable: true
    SearchRecursoResponse:
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
- **Every new field must come from a decision recorded in `## Decisiones de Diseño`** or from a field that already exists in `context.md` — never invent a field not backed by one of the two.
- **HTTP response descriptions must be specific to the business case**, not generic ("Success", "Error"). Correct example: `"Zona sin franjas activas para el tipo de servicio solicitado"`.
- **`required` defines mandatoriness** — any field not listed in `required` is interpreted as optional (`@IsOptional()` on the NestJS DTO `/plan` will generate).
- **Use `format` whenever it applies:** `uuid`, `date-time`, `email` — these map directly to NestJS validators (see `plan/references/openapi-to-dto-mapping.md`).
- **Use `enum` for closed value sets** instead of `type: string` with a description that enumerates options in free text.
