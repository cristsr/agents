# Refine Guide — Mutability Rules & Coherence Checks

Reference for the `/refine` skill. Defines what can and cannot be changed per artifact,
and the coherence rules to apply after each change.

---

## spec.md — Mutability Rules

### Mutable sections

| Section | What can change | Examples |
|---------|----------------|---------|
| User Story — As / I want / So that | Correcting wording or role name | "operator" → "administrator" |
| AC body text | Correcting or clarifying the criterion | Fix ambiguous wording, add missing detail |
| AC title (heading) | Renaming the short label | "AC-1: Filter" → "AC-1: Filter by service type" |
| AC added | New criterion added | Add AC-3 for a missing edge case |
| AC removed | Criterion confirmed out of scope | Remove AC-2 at PO request |
| Technical Context | Adding/removing technical constraints | Add an external dependency note |
| Out of Scope | Adding/removing out-of-scope items | Add "Does not include push notifications" |

### Read-only sections (do NOT modify)

| Section | Why |
|---------|-----|
| `# spec-<number>:` header number | Story number never changes |
| Title after the colon | Comes from Jira — only change if user confirms the Jira title changed |

### Change classification for spec.md

**Minor change (no downstream action needed):**
- Wording correction in As / I want / So that
- AC title rename (short label only)
- Minor clarification in AC body (meaning unchanged)
- Technical Context or Out of Scope edits

**Structural change (warn: re-run /scan):**
- Adding a new AC
- Removing an existing AC
- Significantly rewriting an AC body (meaning changes)
- Changing the story title

---

## context.md — Mutability Rules

### Mutable sections

| Section | What can change | Examples |
|---------|----------------|---------|
| Affected microservices | Correcting service names if wrong | `capability-ms` → `catalog-ms` |
| TypeORM entity — fields | Adding missing fields, correcting types | Add `deletedAt: Date`, fix `string` → `UUID` |
| Module providers | Adding missing providers, correcting class names | Add `ZoneTypeRepository` |
| Existing DTOs | Adding missing exported DTOs | Add `ZoneTypeResponseDto` |
| Detected gaps | Resolving a gap (mark as resolved), adding new gaps | "Resolved: field confirmed as `serviceTypeId`" |
| Injection pattern | Correcting a wrong constructor signature | Fix a wrong param name |
| Abstract service — methods | Adding missing abstract methods | Add `findByType(type: string): Promise<Zone[]>` |

### Read-only sections (do NOT modify)

| Section | Why |
|---------|-----|
| `# context: spec-<number>` header | Identifies the artifact |
| Item summary | Derived from `spec.md` — if it's wrong, spec.md is the source to fix |
| Absolute paths of module folders | Structural — re-run /scan if the structure changed |

---

## design.md — Mutability Rules

`design.md` only holds the narrative summary — DTOs, endpoint paths/methods,
the full diagram, and the full data model moved to `docs/api.yaml`,
`docs/diagram.md`, and `docs/data-model.md` (see their own mutability
rules below).

### Mutable sections

| Section | What can change | Examples |
|---------|----------------|---------|
| Design Decisions | Correcting or adding a recorded decision | Fix the reasoning text |
| Flow summary (prose) | Clarifying the 1-2 sentence summary | Wording only |
| Endpoint table — business description | Clarifying the business description column | Minor edits — NOT the method/path, those live in `api.yaml` |
| Data Modeling — table name | Correcting the table name reference | Wording only — NOT the entity/SQL, those live in `data-model.md` |

### Read-only sections (do NOT modify)

| Section | Why |
|---------|-----|
| `# design: spec-<number>` header | Identifies the artifact |
| Microservice section headers (`### <component>`) | Structural — re-run /design if the services change |
| Endpoints — method/path | Use `/refine api` — `api.yaml` is the source of truth for these |
| Data Modeling — entity/SQL | Use `/refine data-model` — `data-model.md` is the source of truth for these |

---

## API contract (`docs/<api-artifact>`) — Mutability Rules

> `<api-artifact>` = `api.delta.yaml` if `API_CONTRACT_MODE = delta` (default),
> otherwise `api.yaml`. The rules below apply to whichever file is in play.

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
| `openapi:` version line | Structural — never change without explicit user request |
| `tags` list | Must match the microservices in `context.md` — re-run `/design` if the services change |

---

## docs/diagram.md — Mutability Rules

### Mutable sections

| Section | What can change | Examples |
|---------|----------------|---------|
| Mermaid sequence diagram | Adjusting flow if simplified/changed | Add a step, rename a participant, add a new hop |

The whole file is one section — there's nothing else to subdivide.

---

## docs/data-model.md — Mutability Rules

### Mutable sections

| Section | What can change | Examples |
|---------|----------------|---------|
| TypeORM entity — fields | Adding/removing/renaming entity fields | Add `@Column serviceTypeId` |
| SQL migration — columns | Keeping in sync with entity changes | Add a column to `CREATE TABLE` |

### Read-only sections (do NOT modify)

| Section | Why |
|---------|-----|
| `# Data model: spec-<number>` header | Identifies the artifact |
| Entity/table headers (`## EntityName`) | Structural — re-run `/design` if the set of tables changes |

This file only exists if the story has a new/changed table — if it
doesn't exist, there is nothing to refine here; redirect to `/design`.

---

## Coherence Rules (apply after every change)

### Rule 1: context.md field renamed → check api.yaml

If a field name is renamed in context.md:
- Read `docs/api.yaml`
- Search for the old field name in `components.schemas`
- If found: warn the user:
  > "⚠️ `docs/api.yaml` references the field `<old>` in a schema. Do you want to update the contract too?"

### Rule 2: api.yaml schema field renamed → check plan.md

If a schema field is renamed in `docs/api.yaml`:
- Check if `work/active/spec-<number>/plan.md` exists
- If it does: warn the user:
  > "⚠️ plan.md may reference `<old>` in the generated DTOs. Run `/plan spec-<number>` to regenerate it, or edit the plan manually."

### Rule 3: api.yaml path added → structural change

If a new path/operation is added to `docs/api.yaml`:
- Always warn:
  > "⚠️ You added a new endpoint. That's a structural change — run `/plan spec-<number>` so the new tasks are included."

### Rule 4: data-model.md field added/removed → check plan.md

If the data model (Entity + SQL in `docs/data-model.md`) changes:
- Check if `work/active/spec-<number>/plan.md` exists
- If it does: warn:
  > "⚠️ The data model changed. Check that the plan's entity/SQL-migration task is up to date, or run `/plan spec-<number>` again."

### Rule 8: diagram.md flow changed → check api.yaml

If the sequence diagram changes (new hop, new participant):
- Read `docs/api.yaml`
- If the new hop implies an endpoint not present in `api.yaml`: warn:
  > "⚠️ The diagram now shows a call to `<service>` that isn't in `docs/api.yaml`. Is that endpoint missing from the contract?"

### Rule 6: spec.md AC added or removed → check context.md and design.md

If an AC is added or removed from spec.md:
- Check if `work/active/spec-<number>/context.md` exists
- If it does: warn:
  > "⚠️ You added/removed an AC. If context.md was already generated, it may be out of date. Run `/scan spec-<number>` to regenerate it."
- Check if `work/active/spec-<number>/design.md` exists
- If it does: warn:
  > "⚠️ design.md may also be out of date. After re-scanning, run `/design spec-<number>`."

### Rule 7: spec.md AC body significantly rewritten → flag for review

If the meaning of an AC changes (not just wording):
- After applying, warn:
  > "⚠️ AC-N's content changed significantly. Check that context.md and design.md are still coherent with the new criterion."

### Rule 5: validate every change against spec.md ACs

`spec.md` is the source of truth. Apply this rule **before** every change, in both Direct Mode and Guided Mode.

**How to apply:**

1. From the ACs loaded in PHASE 1, identify which ones relate to the section being changed.
2. Display those ACs briefly above the section content so the user sees the constraint.
3. Scan the proposed change for contradictions:
   - New field not mentioned in any AC → warn: "This field doesn't appear in any AC. Is it a technical adjustment or a new requirement?"
   - Field removal when an AC requires it → warn: "AC-N requires `<field>`. Removing it may break the story."
   - Endpoint change inconsistent with the described flow → warn: "AC-N describes this flow as `<description>`. The proposed change may alter it."
4. If a contradiction is detected, show the AC and ask:
   > "This change may contradict AC-N: '<AC text>'. Do you confirm the change is correct anyway?"
5. Wait for explicit confirmation before applying.
6. If no ACs are directly relevant, note: "I found no ACs directly related to this section." and proceed normally.

---

## Change classification: minor vs structural

Use this classification to determine the handoff message.

### spec.md — Minor change (no downstream action)
- Wording correction in As / I want / So that
- AC title rename (label only)
- Minor clarification in AC body (meaning unchanged)
- Technical Context or Out of Scope edits

### spec.md — Structural change (re-run /scan, then /design)
- Adding a new AC
- Removing an existing AC
- Significantly rewriting an AC body
- Changing the story title

### context.md / design.md / api.yaml / diagram.md / data-model.md — Minor change (continue with existing plan/build)
- Correcting a business description (design.md endpoint table, api.yaml descriptions)
- Fixing an HTTP response description in api.yaml
- Adding a missing gap resolution to context.md
- Renaming a diagram participant without changing the call structure

### context.md / design.md / api.yaml / diagram.md / data-model.md — Structural change (re-run /plan before /build)
- Adding a new endpoint/path in api.yaml
- Renaming/adding/removing a schema field in api.yaml
- Adding or removing a microservice from the flow
- Adding/removing/renaming a field in the data model (`docs/data-model.md` — Entity + SQL)
- Changing the sequence diagram flow significantly (new hop, new participant)
- Renaming the use case or controller class
