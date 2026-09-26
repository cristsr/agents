# Refine Guide — Mutability Rules & Coherence Checks

Reference for the `/sdd-refine` skill. Defines what can and cannot be changed per artifact,
and the coherence rules to apply after each change.

Artifact names follow the profile, same as the skill: `<api-artifact>` =
`docs/api.delta.yaml` if `API_CONTRACT_MODE = delta` (default), otherwise
`docs/api.yaml`; `<flow-artifact>` = `docs/diagram.md` if `DOC_UNIT = story`
(default), otherwise the flow's own `docs/flows/<use-case>.md` with its inline
`sequenceDiagram`.

Section names below are the ones the artifacts actually carry. Each artifact's own contract
— under `~/.agents/contracts/artifacts/` — is the authority on what may change inside it;
what follows is the routing and the coherence checks that no single artifact owns. If a
section isn't in this guide, it isn't refinable: regenerate with the skill that owns it.

---

## spec.md — Mutability Rules

### Mutable sections

| Section | What can change | Examples |
|---------|----------------|---------|
| The framing block (As / I want / So that, or the block for the item's type) | Correcting wording or role name | "operator" → "administrator" |
| `tier` (front-matter field) | Raising the tier, applied on request, or lowering it — which requires deleting the artifacts the lower tier does not produce | `standard` → `full` adds the design stage; `full` → `fast` deletes `plan.md`, `context.md` and `docs/` |
| `## Tier Rationale` | The reason recorded beside the field — the decision, never the stage that made it | Add the survey signal that raised a `standard` story to `full` |
| `## Change Surface` | In `fast`, the scope contract `/sdd-build` enforces: the `**Confined to:**` paths and symbols, and the `**Check:**` command | Add the second symbol the change is confined to |
| AC body text | Correcting or clarifying the criterion | Fix ambiguous wording, add missing detail |
| AC title (heading) | Renaming the short label | "AC-1: Filter" → "AC-1: Filter by service type" |
| AC added | New criterion added | Add AC-3 for a missing edge case |
| AC removed | Criterion confirmed out of scope | Remove AC-2 at the product owner's request |
| Technical Context | Adding/removing technical constraints | Add an external dependency note |
| Out of Scope | Adding/removing out-of-scope items | Add "Does not include push notifications" |

### Read-only sections (do NOT modify)

| Section | Why |
|---------|-----|
| `# spec-<number>:` header number | The item number never changes |
| Title after the colon | Comes from `TRACKER` — only change it if the user confirms the tracker's title changed |
| `## Ambiguity Resolution` | `/sdd-clarify` owns it. A decision that turned out wrong is re-decided with `/sdd-clarify`, not edited away here |

### Change classification for spec.md

**Minor change (no downstream action needed):**
- Wording correction in the framing block
- AC title rename (short label only)
- Minor clarification in AC body (meaning unchanged)
- Technical Context or Out of Scope edits

**Structural change (warn: re-run /sdd-scan):**
- Adding a new AC
- Removing an existing AC
- Significantly rewriting an AC body (meaning changes)
- Changing the item title

---

## context.md — Mutability Rules

### Mutable sections

| Section | What can change | Examples |
|---------|----------------|---------|
| Affected components | Correcting component names if wrong | `capability-ms` → `catalog-ms` |
| Entity / persistence model — fields | Adding missing fields, correcting types | Add `deletedAt: Date`, fix `string` → `UUID` |
| Module registration (providers) | Adding missing providers, correcting class names | Add `ZoneTypeRepository` |
| Existing DTOs | Adding missing exported DTOs | Add `ZoneTypeResponseDto` |
| Injection pattern | Correcting a wrong constructor signature | Fix a wrong param name |
| Port / abstract service — methods | Adding missing abstract methods | Add `findByType(type: string): Promise<Zone[]>` |
| Detected gaps | Resolving a gap (mark as resolved), adding new gaps | "Resolved: field confirmed as `serviceTypeId`" |

### Read-only sections (do NOT modify)

| Section | Why |
|---------|-----|
| `# context: spec-<number>` header | Identifies the artifact |
| Item summary | Derived from `spec.md` — if it's wrong, `spec.md` is the source to fix |
| Absolute paths of module folders | Structural — run `/sdd-scan` if the structure changed |

> A context that is stale *as a whole* — the code moved on — is a `/sdd-scan`, not a
> refine. Use `/refine context` for a specific line the survey got wrong.

---

## design.md — Mutability Rules

The rules live with the artifact, in `~/.agents/contracts/artifacts/design-md/CONTRACT.md`
under `## Mutability`: what may change in the narrative summary — the decisions, the flow
prose, a component's role, the architecture verdict, a business description, a table
name — and what is read-only because another artifact owns it. The endpoint table's method
and path belong to the API contract, the entity and SQL to `data-model.md`, and the
quality-gate table is re-evaluated by a design run rather than edited into passing.

Read it there rather than here. A second copy of that list is a second answer to the same
question, and the copy is the one that goes stale.

---

## API contract (`docs/<api-artifact>`) — Mutability Rules

The rules live with the artifact, in
`~/.agents/contracts/artifacts/api-contract/CONTRACT.md` under `## Mutability`. It states
what `/sdd-refine` may change — `info.description`, a path or method, a path's
`responses`, a schema's `properties` and their `type`/`format`/`enum`, the `required`
array — and what is read-only because something downstream keys on it: the version line,
`tags`, and the `operationId` of an existing operation, which is the identity the sync
stage reconciles by.

Read it there rather than here. A second copy of that list is a second answer to the same
question, and the copy is the one that goes stale.

---

## Flow artifact (`docs/<flow-artifact>`) — Mutability Rules

With `DOC_UNIT = use-case`, the rules live with the artifact, in
`~/.agents/contracts/artifacts/flow-md/CONTRACT.md` under `## Mutability`: the sequence
diagram and the surrounding prose may change, and the front matter's `use_case` is
**read-only** — it is the identity the sync stage reconciles by, exactly like
`operationId`.

With `DOC_UNIT = story` the artifact is `docs/diagram.md`: the whole file is one diagram,
there is nothing to subdivide, and the same identity rule applies to every participant it
names.

---

## docs/data-model.md — Mutability Rules

The rules live with the artifact, in
`~/.agents/contracts/artifacts/data-model-md/CONTRACT.md` under `## Mutability`: the
entity's fields and the migration's columns move together, and the `## EntityName` headers
are structural — a change in the set of tables is a design run.

This file only exists if the story has a new or changed table. If it doesn't exist, there
is nothing to refine here; redirect to `/sdd-design`.

---

## Coherence Rules (apply after every change)

### Rule 1: context.md field renamed → check the contract

If a field name is renamed in `context.md`:
- Read `docs/<api-artifact>`
- Search for the old field name in `components.schemas`
- If found, warn:
  > "⚠️ `docs/<api-artifact>` references the field `<old>` in a schema. Do you want to update the contract too?"

### Rule 2: contract schema field renamed → check plan.md

If a schema field is renamed in `docs/<api-artifact>`:
- Check whether `work/active/spec-<number>/plan.md` exists
- If it does, warn:
  > "⚠️ plan.md may reference `<old>` in the generated DTOs. Run `/plan spec-<number>` to regenerate it, or edit the plan manually."

### Rule 3: contract path added → structural change

If a new path/operation is added to `docs/<api-artifact>`:
- Always warn:
  > "⚠️ You added a new endpoint. That's a structural change — run `/plan spec-<number>` so the new tasks are included."

### Rule 4: data-model.md field added/removed → check plan.md

If the data model (entity + migration in `docs/data-model.md`) changes:
- Check whether `work/active/spec-<number>/plan.md` exists
- If it does, warn:
  > "⚠️ The data model changed. Check that the plan's entity/migration task is up to date, or run `/plan spec-<number>` again."

### Rule 5: validate every change against spec.md ACs

`spec.md` is the source of truth. Apply this rule **before** every change, in both
Direct Mode and Guided Mode.

**How to apply:**

1. From the ACs loaded in PHASE 1, identify which ones relate to the section being changed.
2. Display those ACs briefly above the section content so the user sees the constraint.
3. Scan the proposed change for contradictions:
   - New field not mentioned in any AC → warn: "This field doesn't appear in any AC. Is it a technical adjustment or a new requirement?"
   - Field removal when an AC requires it → warn: "AC-N requires `<field>`. Removing it may break the item."
   - Endpoint change inconsistent with the described flow → warn: "AC-N describes this flow as `<description>`. The proposed change may alter it."
4. If a contradiction is detected, show the AC and ask:
   > "This change may contradict AC-N: '<AC text>'. Do you confirm the change is correct anyway?"
5. Wait for explicit confirmation before applying.
6. If no ACs are directly relevant, note: "I found no ACs directly related to this section." and proceed normally.

### Rule 6: spec.md AC added or removed → check context.md and design.md

If an AC is added or removed from `spec.md`:
- Check whether `work/active/spec-<number>/context.md` exists
- If it does, warn:
  > "⚠️ You added/removed an AC. If context.md was already generated, it may be out of date. Run `/scan spec-<number>` to regenerate it."
- Check whether `work/active/spec-<number>/design.md` exists
- If it does, warn:
  > "⚠️ design.md may also be out of date. After re-scanning, run `/design spec-<number>`."

### Rule 7: spec.md AC body significantly rewritten → flag for review

If the meaning of an AC changes (not just wording):
- After applying, warn:
  > "⚠️ AC-N's content changed significantly. Check that context.md and design.md are still coherent with the new criterion."

### Rule 8: flow artifact changed → check the contract

If the sequence diagram changes (new hop, new participant):
- Read `docs/<api-artifact>`
- If the new hop implies an endpoint that isn't in the contract, warn:
  > "⚠️ The diagram now shows a call to `<component>` that isn't in `docs/<api-artifact>`. Is that endpoint missing from the contract?"

### Rule 9: design.md architecture impact → check the flag

If the change adds or removes a module, an app, an integration or an actor:
- Read `design.md`'s `## Global Architecture Impact`
- If it still says "No", warn:
  > "⚠️ This change alters the system's architecture but `## Global Architecture Impact` still says No. `/sdd-sync` reads that section to decide whether to refresh the C4 model under `DOCS_ARCHITECTURE` — update it, or the C4 model will stop matching the code."

---

## Change classification: minor vs structural

Use this classification to determine the handoff message. Each artifact's own contract is
authoritative about what may change *inside* it and what that costs; this section is the
cross-artifact view the message is built from — it answers "which stages to re-run", not
"what is writable".

### spec.md — Minor change (no downstream action)
- Wording correction in the framing block
- AC title rename (label only)
- Minor clarification in AC body (meaning unchanged)
- Technical Context or Out of Scope edits

### spec.md — Structural change (re-run /sdd-scan, then /sdd-design)
- Adding a new AC
- Removing an existing AC
- Significantly rewriting an AC body
- Changing the item title

### Design artifacts — Minor change (continue with the existing plan/build)

Applies to `context.md`, `design.md`, the contract, the flow artifact and
`data-model.md`:
- Correcting a business description (design.md's endpoint table, the contract's descriptions)
- Fixing an HTTP response description in the contract
- Adding a missing gap resolution to `context.md`
- Renaming a diagram participant without changing the call structure

### Design artifacts — Structural change (re-run /sdd-plan before /sdd-build)
- Adding a new endpoint/path in the contract
- Renaming/adding/removing a schema field in the contract
- Adding or removing a <component> from the flow
- Adding/removing/renaming a field in the data model (entity + migration)
- Changing the sequence diagram flow significantly (new hop, new participant)
- Renaming the use case or controller class
- Flipping `## Global Architecture Impact` to "Yes" (Rule 9)
