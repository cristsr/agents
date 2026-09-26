# Story diagrams — generic floor (Mermaid)

Two files, both under `work/active/spec-<number>/docs/`. `diagram.md` belongs to this
story; `component.md` accumulates into the module's living docs.

---

## File 1 — `docs/diagram.md`

````markdown
# Flow diagram: spec-<number>

```mermaid
sequenceDiagram
  actor User
  participant BFF as gateway-ms
  participant Capabilities as catalog-ms

  User->>BFF: POST /resource/search (SearchResourceRequest)
  BFF->>Capabilities: POST /resource/search (SearchResourceRequest)
  Capabilities-->>BFF: SearchResourceResponse
  BFF-->>User: SearchResourceResponse
```
````

---

## File 2 — `docs/component.md`

Grouped by hexagonal layer, one node per component. This file is promoted to
`<DOCS_MODULE>/<module>/component.md`, where it accumulates across stories.

````markdown
# Components: <module>

```mermaid
flowchart TB
  subgraph domain
    D1("Account")
  end
  subgraph application
    A1("OpenAccountHandler")
    A2("AccountRepository")
  end
  subgraph infrastructure
    I1("TypeOrmAccountRepository")
    I2("AccountsController")
  end
  I2 --> A1
  A1 --> D1
  A1 --> A2
  A2 -.-> I1
```
````

## Rules

- **Label every arrow with the method, the path and the schema name**, spelled exactly as
  the API contract spells them. A label the contract does not carry is a design that
  drifted.
- `->>` is a request, `-->>` is a response. The initiating actor is a participant, and
  internal hops between components are shown too.
- **The visible name is what the diagram gate resolves**, not the alias: in
  `participant CB as CommandBus`, `CommandBus` is what must exist in the code.
- In a `flowchart`, the shape declares the node class: `X("Name")` must resolve;
  `X[("table")]` (cylinder) and `subgraph` don't.
- External actors (`User`, `Postgres`, `Keycloak`) are exempt from the gate.
- Diagrams are grouped by layer (`domain` / `application` / `infrastructure`). Prose and
  labels follow `ARTIFACT_LANGUAGE`; every identifier stays verbatim from the code.
