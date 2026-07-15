# Template: Technical Context Section

Use this template to build the `## Technical Context` section appended to `hu.md`.
Omit any subsection where the user provided no information (skip / - / ninguno).

---

```markdown
## Technical Context

### Microservicio objetivo
- <microservice-name>
[Add one bullet per microservice if multiple]

### Artefactos a reutilizar
- `ClassName` — [optional: path or reason if provided by developer]
[Add one bullet per artifact]

### Patrones obligatorios
- [Pattern or structural rule the implementation must follow]
[Add one bullet per pattern]

### Restricciones técnicas
- [What must NOT be done or known limitation]
[Add one bullet per restriction]

### Integraciones conocidas
- [Protocol + target service + endpoint/topic]
  Example: HTTP GET a sm-capabilities-ms: `/zones/{id}`
  Example: XADD a Redis Stream `zones:updates`
[Add one bullet per integration]

### Deuda técnica relevante
- [Module or area + description of known issue]
[Add one bullet per debt item]
```

---

## Subsection inclusion rules

| Developer answer | Include subsection? |
|-----------------|---------------------|
| Concrete answer | Yes |
| "skip" / "-" / "ninguno" / "no sé" | No — omit the subsection entirely |
| Empty (no response given) | No — omit the subsection entirely |

## Language rules

- Section headings: Spanish
- Microservice names, class names, file paths, TypeScript identifiers, endpoints: English
- Descriptive text within bullets: Spanish
