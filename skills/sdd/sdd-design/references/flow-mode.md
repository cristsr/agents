# Flow mode — one document per use case

Read this **only when the profile declares `DOC_UNIT = use-case`**. It replaces the
story-scoped diagram artifacts of the default mode: the unit of documentation becomes the
use case, and the item becomes a set of `create` / `modify` / `deprecate` operations over
flows. The artifact's rules — its front matter, its identity, the identifier convention the
gate enforces — are the `flow-md` contract's; this file is the algorithm that drives it.

---

## Drafting PHASE 4 — FLOW MODE (when `DOC_UNIT = use-case`)

*Run inline, in the main agent.*

**Algorithm:**

1. **Derive the affected use cases.** From `spec.md`, map each acceptance criterion to a
   flow: `(module, use-case, trigger)`, where `trigger` is one of `rest`, `cron`, `queue`,
   `domain-event`, `cli`. Determine the `entrypoint` (REST route, cron or job name, event)
   and the `command` or query it fires.

2. **Reconcile the identity against the living docs — before marking anything.** Read each
   affected module's living docs and inventory the existing keys:

   - `DOCS_UNIT_FLOWS` (`flows/*.md`) → every `use_case` slug, its `entrypoint` and its
     `command`.
   - `DOCS_MODULE` → the canonical `<module>/api.yaml` → every path and method with its
     `operationId`.

   For each use case from step 1, look for a match by any of those keys, strongest first:
   same `entrypoint` + `command` → same `operationId` or path and method → same slug by
   intent. The `flow-md` contract states the rule that follows from it — an existing
   endpoint, command or event is **never** a `create` — and it is the rule that decides
   between `modify`, `create` and `deprecate` here.

   If you are torn between `create` and `modify` — the endpoint is similar but not
   identical — treat it as `modify` and note the ambiguity in `design.md` so the reviewer
   confirms. Over-merging is cheaper than duplicating.

3. **Emit a complete `docs/flows/<slug>.md` per the `flow-md` contract**, with its diagram
   inline. Start from the floor that contract names (`template.md` beside it, or
   `<STACK_REFS>/references/flow-template.md` when a stack pack overrides it). There is no
   separate model to maintain and no view id to point at.

4. **Update the component `flowchart` only if the item changes the module's structure.** If
   it adds or removes components from the unit, include in `design.md` the ` ```mermaid `
   block with the updated `flowchart`, grouped by hexagonal layer (`domain` /
   `application` / `infrastructure`), so `/sdd-sync` carries it into `DOCS_UNIT_README`. If
   the item only changes the path of a flow, **omit it** — the component diagram is not
   rewritten on every story.

5. **Resolve the documentation unit, not the "module".** The `flow-md` contract states the
   hard rule — documentation lives next to the code it describes. In practice: if the
   `command` and its handler live in a lib, the flow goes to `libs/<lib>/docs/flows/`, not
   under `apps/<app>/docs/`. When the destination isn't obvious, resolve it by the real
   location of the `command`'s class.

6. **Emit the API contract per `API_CONTRACT_MODE`** — see the API contract section below;
   it applies equally in both design modes.

7. **`design.md` references the flows by slug** — it never embeds one diagram spanning
   several modules. The affected-flows part of the summary lists `create` / `modify` /
   `deprecate` with their trigger and entrypoint; the components part describes the delta in
   one sentence and carries the `flowchart` only when step 4 applied.

8. **Validate the diagrams** in step 5, not here — but check the identifiers while writing:
   every non-external name must be a real class, port or exception, and a class this item is
   about to create is a pending symbol, recorded as a known risk in `design.md` and never
   renamed to force a pass.

Then produce **File 3** (`docs/data-model.md`, if it applies) and **File 4** (`design.md`) —
those two run in **both** modes, and File 4 is where `## Global Architecture Impact` is
mandatory — and jump to the quality-gate validation.

---
