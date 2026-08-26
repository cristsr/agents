# Flow mode — one document per use case

Read this **only when the profile declares `DOC_UNIT = use-case`**.
It replaces File 1 and File 2 of the default `full` mode: the unit of
documentation becomes the use case, and the item is a set of `create` / `modify` /
`deprecate` operations over flows. Under `full`, none of this applies.

---

## Drafting PHASE 4 — FLOW MODE (when `DOC_UNIT = use-case`)

*Run inline, in the main agent.*

This mode **replaces** the "File 1/2/3" sections below (which are the `full` default).
The unit of documentation is the **use case (flow)**, not the item. The item is a set
of operations over flows: `create` | `modify` | `deprecate`.

**Algorithm:**

1. **Derive the affected use cases.** From `spec.md`, map each AC to a flow:
   `(module, use-case, trigger)`, where `trigger` is one of `rest`, `cron`, `queue`,
   `domain-event`, `cli`. Determine the `entrypoint` (REST route, cron/job/event name)
   and the `command`/query it fires.

2. **Reconciliation lookup — resolve identity against the living docs (avoids duplicates).**
   Before marking anything, read each affected module's living docs and inventory the
   existing **identity keys**:
   - `DOCS_UNIT_FLOWS` (`flows/*.md`) → every `use_case` (slug), its `entrypoint` and `command`.
   - `DOCS_MODULE` → the canonical `<module>/api.yaml` → every `path` + method and their `operationId`.

   For each use case derived in step 1, look for a match by **any** of these keys
   (strongest to weakest): same `entrypoint`+`command` → same `operationId` /
   `path`+method → same slug by intent. Hard rule: **if the endpoint, the command or
   the event already exists, it is NEVER a `create` — it is a `modify` of the existing
   flow.**

   - **Match → `modify`:** reuse the existing `use_case` (slug), `view` id and
     `operationId` **verbatim**. The delta overlays the current flow, it doesn't create
     a parallel one. Read the current `flows/<slug>.md` to respect its `introduced_by`
     and history.
   - **No match → `create`:** mint a new kebab slug that **doesn't collide** with any
     slug/viewId/operationId in the inventory.
   - **Removal → `deprecate`/`remove`:** mark the existing flow by its slug; don't
     invent a new one.

   If you're torn between `create` and `modify` (the endpoint is similar but not
   identical), treat it as `modify` and note the ambiguity in `design.md` so the
   reviewer confirms — over-merging is cheaper than duplicating.

3. **Emit a complete `docs/flows/<slug>.md`, with its diagram inline** — there's no
   separate model to maintain. Follow `<STACK_REFS>/references/flow-template.md`
   (if no pack in `STACK_REFS` provides it: the local `flow-template.md` — generic
   Mermaid). **This is the seam for the diagramming tool**: a project on LikeC4,
   Structurizr or anything else supplies its own template from its pack, and the
   skill never changes — what the frontmatter carries is the template's call, not
   this document's:
   - Mandatory frontmatter: `use_case`, `module`, `trigger`, `entrypoint`, `command`,
     `invariants`, `introduced_by`, `last_modified_by`, `status`. **There is no `view:` key.**
   - A ` ```mermaid ` block with a `sequenceDiagram` showing the use case's path: who
     fires it, which components it passes through and what gets persisted.
   - Prose: what the flow does, verifiable business rules, error table and response.
   - For `create`: `introduced_by` = `last_modified_by` = this item.
     For `modify`: keep `introduced_by`, set `last_modified_by` = this item.

   **Identifier convention (CI validates it — breaking it breaks the build).** The
   diagram gate (`DIAGRAM_CHECK`) verifies that every identifier names a real
   symbol in the code the flow documents:

   - **The visible name is checked, not the alias.** In `participant CB as CommandBus`,
     `CommandBus` is what resolves; `CB` stays free for the diagram's legibility.
   - **Use the exact class name**, port or exception —
     `ReverseConfirmedTransactionHandler`, not a description.
   - **External actors are exempt:** `Client`, `User`, `Postgres`, `Keycloak`.
   - In a `flowchart`, the shape declares the node class: `X("Name")` must resolve;
     `X[("table")]` (cylinder) and `subgraph` don't.

   ```mermaid
   sequenceDiagram
     actor Client
     participant C as AccountsController
     participant CB as CommandBus
     participant H as OpenAccountHandler
     participant A as Account
     participant ES as EventStore

     Client->>C: POST /accounts (OpenAccountRequestDto)
     C->>CB: dispatch(OpenAccountCommand)
     CB->>H: handle
     H->>A: Account.open(...) — validates AC-2
     H->>ES: append(AccountOpened)
   ```

4. **Update the component `flowchart` only if needed.** If the item adds or removes
   components from the unit, include in `design.md` the ` ```mermaid ` block with the
   updated `flowchart`, grouped by hexagonal layer (`domain` / `application` /
   `infrastructure`), so `/sdd-sync` carries it into `DOCS_UNIT_README`. If the item
   doesn't change the module's structure — only the path of a flow — **omit it**: don't
   rewrite the component diagram on every story.

5. **Resolve the documentation unit, not the "module".** A flow's destination is
   `<unit>/flows/<slug>.md`, where the unit is the code root the flow documents. Hard
   rule: **documentation lives next to the code it describes.** If the `command` and
   its handler live in a lib, the flow goes to `libs/<lib>/docs/flows/`, not under
   `apps/<app>/docs/`. When the destination isn't obvious, resolve it by the real
   location of the `command`'s class.

6. **Emit the API contract per `API_CONTRACT_MODE`** — see the "PHASE 4 — API contract"
   section below (it applies equally in both design modes).

7. **`design.md` references the flows by slug** — it never embeds a monster diagram
   spanning several modules. The "Affected Flows" section lists `create`/`modify`/
   `deprecate` with their trigger and entrypoint; the "Components" section describes
   the delta in one sentence and only includes the `flowchart` if step 4 applied.

8. **Validate the diagrams.** The `DIAGRAM_CHECK.run` port runs in **step 5's**
   verification, not here — but check the identifiers
   yourself while writing: every non-external name must be a real class/port/exception,
   and a class this item is about to create is a **pending symbol**, recorded as a
   known risk in `design.md`, never renamed to force a pass.

Then produce **File 3** (`docs/data-model.md`, if it applies) and **File 4**
(`design.md`) below — those two run in **both** modes, and File 4 is where
`## Global Architecture Impact` becomes mandatory — and jump to **PHASE 4.5** (quality
gates). Only "File 1" and "File 2" are `full`-mode only; the API contract
("PHASE 4 — API contract") applies in both modes.

---
