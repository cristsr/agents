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
  description: Contrato generado por /design para sm-<number>: <título de la historia>.
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

- **Un endpoint nuevo o modificado por la historia → una `path` + `operationId`.** No documentar endpoints que la historia no toca.
- **Cada campo nuevo debe venir de una decisión registrada en `## Decisiones de Diseño`** o de un campo ya existente en `context.md` — nunca inventar un campo sin que esté en alguno de los dos.
- **Las descripciones de respuestas HTTP deben ser específicas del caso de negocio**, no genéricas ("Éxito", "Error"). Ejemplo correcto: `"Zona sin franjas activas para el tipo de servicio solicitado"`.
- **`required` define obligatoriedad** — todo campo no listado en `required` se interpreta como opcional (`@IsOptional()` en la DTO de NestJS que generará `/plan`).
- **Usar `format` siempre que aplique:** `uuid`, `date-time`, `email` — estos mapean directo a validadores de NestJS (ver `plan/references/openapi-to-dto-mapping.md`).
- **Usar `enum` para valores cerrados** en vez de `type: string` con una descripción que enumera opciones en texto libre.
