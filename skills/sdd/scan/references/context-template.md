# context: spec-<number>

## Item summary

**As a** <role>
**I want** <action>
**So that** <benefit>

<!-- For non-`feat` items, summarize the framing block that applies
     (Defect / Technical Debt / Incident / Maintenance) instead of the user story. -->

## Affected components

- <component-1>
- <component-2>  ← if applicable

---

## <component-1>

### Affected module

`<absolute-path-to-module>/`

### Entity / persistence model

**File:** `<absolute-path>` (per the profile's `ORM`)

**Fields:**
- `<field_name>`: `<type>` — <constraint if relevant>
- `<field_name>`: `<type>`

### Module registration (providers)

**File:** `<absolute-path>` (per the framework)

**Registered:**
- `<ProviderName>`
- `<ProviderName>`

### Injection pattern (reference use case)

**File:** `<absolute-path>`

**Constructor / init:**

```<language>
<injected dependencies, name and type>
```

### Existing DTOs

**Barrel:** `<absolute-path>/dtos/index`

**Exported:**
- `<DtoClassName>`
- `<DtoClassName>`

### Port / abstract service

**File:** `<absolute-path>`

**Methods:**
- `<methodName>(<params>): <returnType>`

### Available documentation

<path to docs if it exists, or "No documentation for <component-1>">

---

## <component-2>  ← repeat the section if there is more than one

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
