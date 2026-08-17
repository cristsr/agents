# Refine Guide — Mutability Rules & Coherence Checks

Reference for the `/refine` skill. Defines what can and cannot be changed per artifact,
and the coherence rules to apply after each change.

Artifact names follow the profile, same as the skill: `<api-artifact>` =
`docs/api.delta.yaml` if `API_CONTRACT_MODE = delta` (default), otherwise
`docs/api.yaml`; `<flow-artifact>` = `docs/diagram.md` if `DESIGN_OUTPUT_MODE = full`
(default), otherwise the flow's own `docs/flows/<use-case>.md` with its inline
`sequenceDiagram`.

Section names below are the ones the templates actually write — `spec-template.md`,
`context-template.md` and `design-template.md`. If a section isn't in this guide, it
isn't refinable: regenerate with the skill that owns it.

---

## spec.md — Mutability Rules

### Mutable sections

| Section | What can change | Examples |
|---------|----------------|---------|
| The framing block (As / I want / So that, or the block for the item's type) | Correcting wording or role name | "operator" → "administrator" |
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
| `## Ambiguity Resolution` | `/clarify` owns it. A decision that turned out wrong is re-decided with `/clarify`, not edited away here |

### Change classification for spec.md

**Minor change (no downstream action needed):**
- Wording correction in the framing block
- AC title rename (short label only)
- Minor clarification in AC body (meaning unchanged)
- Technical Context or Out of Scope edits

**Structural change (warn: re-run /scan):**
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
| Absolute paths of module folders | Structural — run `/scan` if the structure changed |

> A context that is stale *as a whole* — the code moved on — is a `/scan`, not a
> refine. Use `/refine context` for a specific line the survey got wrong.

---

## design.md — Mutability Rules

`design.md` only holds the narrative summary — DTOs, endpoint paths/methods, the full
diagram and the full data model live in `<api-artifact>`, `<flow-artifact>` and
`docs/data-model.md` (see their own mutability rules below).

### Mutable sections

| Section | What can change | Examples |
|---------|----------------|---------|
| Design Decisions | Correcting or adding a recorded decision | Fix the reasoning text |
| Cross-Service Flow (prose) | Clarifying the summary | Wording only |
| Module Components | Correcting a component's role in the module | Wording only |
| Global Architecture Impact | Correcting the yes/no answer and the node/edge it names | Flipping it to "Yes" when the refinement added an integration |
| Contracts per Service — business description | Clarifying the description column | Minor edits — NOT the method/path, those live in the contract |
| Data Modeling — table name | Correcting the table name reference | Wording only — NOT the entity/SQL, those live in `data-model.md` |

**`## Global Architecture Impact` is a contract with `/sync`**, which reads it to decide
whether to invoke `/docs`. If a refinement adds or removes a module, an app, an
integration or an actor, this section has to change with it — otherwise the system-level
C4 model silently stops matching the code.

### Read-only sections (do NOT modify)

| Section | Why |
|---------|-----|
| `# design: spec-<number>` header | Identifies the artifact |
| Component section headers (`### <component>`) | Structural — run `/design` if the set of components changes |
| Endpoints — method/path | Use `/refine api` — the contract is the source of truth for these |
| Data Modeling — entity/SQL | Use `/refine data-model` — `data-model.md` is the source of truth |
| Quality Gates Validation · Constitution Exceptions | Produced by `/design` against `docs/rules.md`; a gate that now passes is re-evaluated by `/design`, not edited |

---

## API contract (`docs/<api-artifact>`) — Mutability Rules

### Mutable sections

| Section | What can change | Examples |
|---------|----------------|---------|
| `info.description` | Clarifying the contract description | Wording only |
| `paths.<path>.<method>` | Correcting the route or HTTP method | `/zones/type` → `/zones/filter` |
| `responses` (per path) | Adding missing codes, correcting descriptions | Add `404: Zone not found` |
| `components.schemas.<Schema>.properties` | Renaming/adding/removing fields | `type` → `serviceTypeId` |
| `components.schemas.<Schema>.properties.<field>.type/format/enum` | Correcting the field's type | `string` → `string[]` |
| `required` array | Adding/removing a field from required | Mark `serviceTypeId` as required |

### Read-only sections (do NOT modify)

| Section | Why |
|---------|-----|
| The contract's version line (`openapi:` or the `API_CONTRACT` equivalent) | Structural — never change without an explicit user request |
| `tags` list | Must match the components in `context.md` — run `/design` if they change |
| `operationId` of an existing operation | It is the identity key `/sync` reconciles by: changing it turns a modification into a duplicate |

---

## Flow artifact (`docs/<flow-artifact>`) — Mutability Rules

### Mutable sections

| Section | What can change | Examples |
|---------|----------------|---------|
| The sequence diagram | Adjusting the flow if it was simplified or changed | Add a step, rename a participant, add a new hop |
| Surrounding prose (`full-flow` only) | Clarifying the flow's description | Wording only |

With `DESIGN_OUTPUT_MODE = full`, the whole file is one diagram — there's nothing else
to subdivide. With `full-flow`, the frontmatter's `use_case` is **read-only**: it is the
identity key `/sync` reconciles by, exactly like `operationId`.

---

## docs/data-model.md — Mutability Rules

### Mutable sections

| Section | What can change | Examples |
|---------|----------------|---------|
| Entity (per the profile's `ORM`) — fields | Adding/removing/renaming entity fields | Add a `serviceTypeId` column mapping |
| Migration (per `MIGRATIONS`) — columns | Keeping in sync with entity changes | Add a column to the table creation |

### Read-only sections (do NOT modify)

| Section | Why |
|---------|-----|
| `# Data model: spec-<number>` header | Identifies the artifact |
| Entity/table headers (`## EntityName`) | Structural — run `/design` if the set of tables changes |

This file only exists if the item has a new or changed table — if it doesn't exist,
there is nothing to refine here; redirect to `/design`.

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
  > "⚠️ This change alters the system's architecture but `## Global Architecture Impact` still says No. `/sync` reads that section to decide whether to refresh `docs/architecture/` — update it, or the C4 model will stop matching the code."

---

## Change classification: minor vs structural

Use this classification to determine the handoff message.

### spec.md — Minor change (no downstream action)
- Wording correction in the framing block
- AC title rename (label only)
- Minor clarification in AC body (meaning unchanged)
- Technical Context or Out of Scope edits

### spec.md — Structural change (re-run /scan, then /design)
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

### Design artifacts — Structural change (re-run /plan before /build)
- Adding a new endpoint/path in the contract
- Renaming/adding/removing a schema field in the contract
- Adding or removing a <component> from the flow
- Adding/removing/renaming a field in the data model (entity + migration)
- Changing the sequence diagram flow significantly (new hop, new participant)
- Renaming the use case or controller class
- Flipping `## Global Architecture Impact` to "Yes" (Rule 9)
