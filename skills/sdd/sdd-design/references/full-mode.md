# Full mode — the per-story diagram and component files

Read this **only when the profile declares `DOC_UNIT = story`** (the
default). These are Files 1 and 2 of PHASE 4: the story-scoped sequence diagram and
the C4 Level 3 component document. Under `use-case` they do not exist — the flow
files carry their own inline diagram instead.

---

### File 1 — docs/diagram.md (`DOC_UNIT = story` only — always, in that mode)

*Run inline, in the main agent.*

Shows how data flows between <component>s. Use `DIAGRAM_FORMAT` (e.g. Mermaid):

```markdown
# Flow diagram: spec-<number>

\`\`\`mermaid
sequenceDiagram
  actor User
  participant BFF as gateway-ms
  participant Capabilities as catalog-ms

  User->>BFF: POST /resource/search (RequestDto)
  BFF->>Capabilities: POST /resource/search (RequestDto)
  Capabilities-->>BFF: ResponseDto
  BFF-->>User: ResponseDto
\`\`\`
```

Rules for the diagram:
- Show every <component> in the flow, in order
- Label each arrow with: HTTP method + path + schema name (matching the
  operation/schema names used in `<api-artifact>`, the produced contract)
- Use `-->>` for responses, `->>` for requests
- Include the actor (User/System) as the initiator
- If a <component> calls another internally, show that hop too

### File 2 — docs/component.md (C4 Level 3 — `DOC_UNIT = story` only, almost always)

*Run inline, in the main agent.*

Shows the affected module's internal building blocks: use case(s)/handler(s), domain
aggregate(s)/entity(ies), port(s)/repository(ies) and the infrastructure adapters that
implement them. This is the C4 Level 3 view — it lives inside the module, not under
`DOCS_ARCHITECTURE` (that's Level 1-2, managed by `/sdd-docs`, invoked by `/sdd-sync`).

Rules:
- Resolve the module's promoted destination with `DOCS_MODULE` (folder pattern):
  `<DOCS_MODULE>/<module>/component.md`. If it already exists (an earlier story
  left it), **read it first** and update it surgically: add this story's new
  components without deleting the ones still in force — it's a living per-module
  document, just as `containers.md` is at the system level.
- If it doesn't exist yet, generate it from scratch out of the module's existing
  components in `context.md` + what this story adds.
- `DIAGRAM_FORMAT`, grouped by layer (`domain` / `application` / `infrastructure`),
  one node per component.
- It is omitted only if the story adds and modifies zero of the module's internal
  components (for example, a purely configuration change) — that shouldn't be the
  typical case.
