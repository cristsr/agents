# context: spec-<number>

## Item summary

**As a** <role>
**I want** <action>
**So that** <benefit>

<!-- For non-`feat` items, summarize the framing block that applies
     (Defect / Technical Debt / Incident / Maintenance) instead of the user story. -->

## Affected microservices

- <microservice-1>
- <microservice-2>  ← if applicable

---

## <microservice-1>

### Affected module

`<absolute-path-to-module>/`

### TypeORM entity

**File:** `<absolute-path>.entity.ts`

**Fields:**
- `<field_name>`: `<type>` — <column constraint if relevant>
- `<field_name>`: `<type>`

### Module providers

**File:** `<absolute-path>.module.ts`

**Registered providers:**
- `<ProviderName>`
- `<ProviderName>`

### Injection pattern (reference use case)

**File:** `<absolute-path>.use-case.ts`

**Constructor:**

```typescript
constructor(
  private readonly <dependency>: <Type>,
  private readonly <dependency>: <Type>,
) {}
```

### Existing DTOs

**Barrel:** `<absolute-path>/dtos/index.ts`

**Exported:**
- `<DtoClassName>`
- `<DtoClassName>`

### Abstract service

**File:** `<absolute-path>.service.ts`

**Methods:**
- `<methodName>(<params>): <returnType>`

### Available documentation

<path to docs if it exists, or "No documentation in docs/services/<microservice>/">

---

## <microservice-2>  ← repeat the section if there is more than one

<same structure>

---

## Detected gaps

<list of things not found that the design and planning phases should account for>
<or "None" if everything was found>

## Formatting

Keep the artifact readable — the redaction is prose, not a dump:

- A blank line **after every heading** and **before and after every list and code
  fence**.
- **One idea per bullet**, and never a bullet longer than ~3 lines.
- Break walls of text: no more than ~4 consecutive bullets or bold-label lines
  without a blank line between them.

<!-- Language rules: section headings in English (structural — read by name);
     prose in ARTIFACT_LANGUAGE (profile, language block); paths, class
     names, field names and signatures verbatim from the code. -->
