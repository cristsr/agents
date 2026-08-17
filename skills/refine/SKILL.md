---
name: refine
description: >
  Refines spec.md, context.md, design.md, docs/api.yaml, docs/diagram.md, or
  docs/data-model.md for a story without re-running /spec, /clarify, or /design.
  Use when the user says "/refine spec-XXXX", "refine the spec", "refine the
  context", "adjust the design", "fix the context", "there's a wrong field in
  the design", "I want to change the schema", "update the context", "modify the
  design", "adjust an AC", "change the story", "fix the api.yaml", "adjust the
  diagram", "change the entity", "adjust the migration", or has reviewed an
  artifact and wants to make targeted or guided corrections.
  Do NOT use to regenerate from scratch (use /spec, /clarify, or /design).
  Do NOT use to modify plan.md (use /plan to regenerate it).
---

# refine

## Overview

Targeted surgery on **one** artifact of an open item, without regenerating it. The
skill that owns each artifact (`/spec`, `/clarify`, `/design`) writes it whole; `/refine`
edits a section of it in place, keeping everything else — including its language and
its structure — exactly as it was.

Two modes, chosen from the input: **Direct** when the change is described, **Guided**
when it isn't and the artifact is reviewed section by section.

Execute the phases below in order.

**Announce at start:** "Refining <artifact> of spec-<number>."

---

## Project profile (read first, always)

Read `.agents/profile.yaml` at the root of the current project before anything else.
If it doesn't exist, tell the user to run `/bootstrap` and stop — without a profile you
don't know this project's conventions. The file is a YAML map of named blocks; a key
holding `null` is not configured, so use the fallback this skill declares for it —
never a guessed value.

Any path, artifact name or command shown in this document is an example resolution; the
profile's value wins. The keys this skill reads are listed under **Profile keys** in
the `Contract` below.

---

## Contract

What this skill needs, what it leaves behind, and what it may not do. **Check every
`Requires` row before PHASE 1** — refining an artifact of a story that is already
closed, or one that doesn't exist, is a redirect, not an edit.

Two artifact names resolve from the profile (docs block) and are used throughout this
document:

- `<api-artifact>` = `docs/api.delta.yaml` if `API_CONTRACT_MODE = delta` (the
  default), otherwise `docs/api.yaml`.
- `<flow-artifact>` = `docs/diagram.md` if `DESIGN_OUTPUT_MODE = full` (the default),
  or the `docs/flows/*.md` file of the flow being refined if `full-flow` — in that mode
  each flow carries its own inline `sequenceDiagram` and there is no `diagram.md`.

**Requires**

| Condition | Check | If it fails |
|---|---|---|
| You are in the project's working directory | `pwd` == `WORKING_DIRECTORY` (absolute path, from the profile) | `cd` there before running anything |
| An item id was given | the input carries an id matching `STORY_ID_PATTERN` | Ask: "Which story? (e.g. spec-1933)" |
| The item is still open | `work/active/spec-<number>/` exists | If it's under `work/done/spec-<number>/`, `/sync` already closed and archived it: ask whether to reopen the workspace or open a new item — never edit inside `work/done/` |
| At least one artifact exists | `spec.md` (or a legacy `hu.md`), `context.md` or `design.md` is present | Stop: "I couldn't find any artifact. Run `/spec spec-<number>` first." |
| The resolved target exists | the file the PHASE 1 lookup table resolves to is present | Stop naming the skill that produces it — see PHASE 1, Step 2 |

**Produces**

- exactly **one** artifact edited in place, with its language, structure and section
  order preserved; every other artifact of the item byte for byte unchanged
- a coherence report (PHASE 4) naming what downstream artifact the change may have
  invalidated, and a handoff message naming the skill to run next
- **no** silent repair: a misalignment the change introduces is reported, never fixed
  here

**Writes** — one file per invocation, and only one of these

- `work/active/spec-<number>/spec.md` · `context.md` · `design.md`
- `work/active/spec-<number>/docs/`: `<api-artifact>`, `<flow-artifact>`,
  `data-model.md`, `research.md`

Not `plan.md` — ever, in any mode (see `Never`). Not the project's source or test files
(that's `/build` or `/hotfix`), and not the unit's living docs (that's `/sync`).

**Never**

- **Forbidden:** editing `plan.md`. A structural refinement invalidates the plan; the
  answer is to warn and hand off to `/plan` or `/hotfix`, never to patch it here.
- **Forbidden:** regenerating an artifact from scratch, or rewriting a section the user
  didn't name. `/refine` applies Edits; `/spec`, `/clarify` and `/design` are what
  produce artifacts whole.
- **Forbidden:** applying any edit without explicit confirmation — in both modes, the
  current content and the proposed change are shown first (PHASE 3A step 5, PHASE 3B
  per section).
- **Forbidden:** renaming a legacy `hu.md` to `spec.md`, or creating a duplicate
  alongside it.
- **Forbidden:** `git add`, `git commit`, `git push` and any other state-changing git
  command.

**Escalates**

- The target artifact, whenever the input doesn't name one (PHASE 1, Step 2).
- Every change, before it is applied — that's the confirmation gate above.
- A change that **contradicts an AC**: show the affected AC and require explicit
  confirmation before applying (Rule 5 in `references/refine-guide.md`).
- A structural change when `plan.md` already has `[X]` tasks: ask which case it is —
  a post-build defect from a clarification gap is `/hotfix`, a genuinely larger scope
  is a full `/plan` regeneration (PHASE 4).
- Guided Mode stops after **5 sections** and asks whether to continue.

**Degrades**

- `spec.md` absent (refining `context.md` or `design.md` of an item that never had one)
  → continue without AC validation anchors, and say so; the checks that quote ACs are
  skipped, not faked.
- `plan.md` absent → skip the built-code check in PHASE 4; every "regenerate the plan"
  warning becomes a plain "when you plan, it will already reflect this".
- `DESIGN_OUTPUT_MODE = full-flow` → there is no `docs/diagram.md`; the diagram target
  is the `docs/flows/*.md` of the flow concerned, and its inline `sequenceDiagram` is
  the block to review.

**Reverting** — every artifact this skill touches is tracked by git inside the story
workspace: `git checkout -- <path>` restores the committed version. Because the edits
are targeted rather than whole-file rewrites, `git diff` before the next commit shows
exactly what changed — which is the real safety net before the story's first commit,
when there is nothing to check out.

**Profile keys**

- `STORY_ID_PATTERN`, `WORKDIR_ACTIVE`, `WORKDIR_DONE` — the item's id and workspace,
  written throughout this document as `spec-<number>` and `work/active/spec-<number>/`
- `WORKING_DIRECTORY` — the first `Requires` row
- `API_CONTRACT_MODE`, `DESIGN_OUTPUT_MODE` — which contract and flow artifacts exist
  as targets (see above)
- `API_CONTRACT`, `DIAGRAM_FORMAT` — the notation of the contract and the diagram being
  refined
- `COMPONENT_TERM` and the stack block (`ORM`, `MIGRATIONS`) — the term for a
  deployable unit, and the shape of the sections reviewed in Guided Mode
- `ARTIFACT_LANGUAGE`, `OUTPUT_LANGUAGE`, `IDENTIFIER_LANGUAGE` — see "Output language"

---

## PHASE 1: Resolve target

### Step 1 — Extract story number

Extract `spec-<number>` from the input. If not present, ask:
> "Which story? (e.g. spec-1933)"

### Step 2 — Determine target artifact

Parse the input for an explicit type keyword: `spec` (alias `hu`), `context`,
`design`, `api` (or "openapi", "contract", "yaml"), `diagram`,
`data-model`/`entity`/`migration`, or `research`/`alternatives`.

| Target | File |
|--------|------|
| `spec` (alias: `hu`) | `work/active/spec-<number>/spec.md` — or `hu.md` if the item predates the rename |
| `context` | `work/active/spec-<number>/context.md` |
| `design` | `work/active/spec-<number>/design.md` |
| `api` | `work/active/spec-<number>/docs/<api-artifact>` |
| `diagram` | `work/active/spec-<number>/docs/<flow-artifact>` — with `DESIGN_OUTPUT_MODE = full-flow`, ask which flow if the input doesn't name one |
| `data-model` | `work/active/spec-<number>/docs/data-model.md` |
| `research` | `work/active/spec-<number>/docs/research.md` |

- If explicit → skip to Step 3 with that target (verify its file exists; if not, STOP:
  "I couldn't find `<file>`. Run `/design spec-<number>` first — the contract and the
  flow artifact are generated alongside `design.md`." — for `data-model`, if `design.md`
  exists but has no `## Data Modeling` section, say instead: "This story has no new
  data model.")
- If not explicit → check existence of `spec.md`, `context.md`, `design.md`:

```bash
for f in spec.md hu.md context.md design.md; do
  [ -f "work/active/spec-<number>/$f" ] && echo "$f: EXISTS" || echo "$f: -"
done
```

> **Legacy items.** `hu.md` is `spec.md`'s former name. If it shows up, it's the same
> artifact: refine it in place, without renaming it or creating a duplicate `spec.md`.

| spec.md | context.md | design.md | Candidate options | Ask via |
|-------|-----------|-----------|--------------------|---------|
| exists | — | — | spec.md, context.md (doesn't exist yet), design.md (doesn't exist yet) | `AskUserQuestion` (3 options) |
| exists | exists | not exists | spec.md, context.md | `AskUserQuestion` (2 options) |
| exists | not exists | exists | spec.md, design.md/`<api-artifact>`/`<flow-artifact>`/data-model.md (if applicable) | `AskUserQuestion` (2 options) |
| exists | exists | exists | spec.md, context.md, design.md, `<api-artifact>`, `<flow-artifact>`, data-model.md (if it exists) | Numbered plain text — that's up to 6 candidates and `AskUserQuestion` allows at most 4 options |
| not exists | exists | exists | context.md, design.md/`<api-artifact>`/`<flow-artifact>`/data-model.md (if applicable) | `AskUserQuestion` (2 options) |
| not exists | exists | not exists | target = context | (no question, direct target) |
| not exists | not exists | exists | design.md, `<api-artifact>`, `<flow-artifact>`, data-model.md (if it exists) | `AskUserQuestion` (up to 4 options — if data-model.md doesn't exist, 3 remain) |
| none | none | none | STOP → "I couldn't find any artifact. Run `/spec spec-<number>` first." | — |

For the rows marked `AskUserQuestion`: `question: "What do you want to refine?"`,
`header: "Artifact"`, one option per candidate with its file name as the `label` and a
one-line `description` of what it contains.

`<api-artifact>` and `<flow-artifact>` only ever exist alongside `design.md` (all three
are produced together by `/design`); `data-model.md` exists alongside them
only if the story has a new/changed table — never offer them as options if
`design.md` doesn't exist.

### Step 3 — Load spec.md for validation (if target ≠ spec)

If the target is `context`, `design`, `api`, `diagram`, `data-model`, or `research`, read `work/active/spec-<number>/spec.md` and keep in working memory:
- The story **title**
- The numbered **acceptance criteria (ACs)**
- The **business rules**, if any

If `spec.md` does not exist: skip this step (continue without AC validation).

These ACs are used as validation anchors in PHASE 3A and 3B.

If the target **is** `spec`: skip this step — `spec.md` is the artifact being edited, not the reference.

---

## PHASE 2: Detect mode

Read the full input after the command and story number.

- If the input contains a **description of a specific change** (field name, path correction, new endpoint, etc.) → **Direct Mode** → go to PHASE 3A
- If the input has **no change description** → **Guided Mode** → go to PHASE 3B

---

## PHASE 3A: Direct Mode (targeted change)

1. Read the full artifact from its file (per the Step 2 lookup table —
   `api` and `diagram` live under `docs/`, not at the story root)
2. Locate the section most relevant to the described change — use the section order lists from PHASE 3B as reference, or consult `references/refine-guide.md` for the full mutability rules per section
3. Show the **ACs from spec.md** that are relevant to this section (1–3 lines max), then show the **current content** of the section
4. Check if the proposed change contradicts any AC (see Rule 5 in `references/refine-guide.md`). If yes, warn before asking for confirmation.
5. Ask: "Is this what you want to change? Confirm, or tell me exactly what to adjust."
6. Wait for confirmation
7. Apply the change using Edit
8. Show a brief before/after summary
9. Apply coherence checks (see `references/refine-guide.md`)
10. Go to PHASE 4

---

## PHASE 3B: Guided Mode (section-by-section review)

Read the artifact. Review **one section at a time** in this order:

### For spec.md:
1. The framing block (User Story / Defect / Technical Debt / Incident / Maintenance)
2. Acceptance Criteria — review them one by one: show each AC's text and ask whether it's correct
3. Technical Context (if the section exists)
4. Out of Scope (if the section exists)

> Note: when refining `spec.md`, there is no external AC reference to validate against — the ACs themselves are what's being corrected. Apply judgment: flag changes that look like scope creep vs. wording fixes.

### For context.md:

The section names come from `context-template.md`, the same one `/clarify` and `/scan`
fill in — review them in the order the template lists them:
1. Affected components
2. Entity / persistence model (per the profile's `ORM`)
3. Module registration (providers)
4. Existing DTOs
5. Detected gaps

### For design.md:

Per `design-template.md`, skipping any section the story omitted:
1. Design Decisions (only if present)
2. Cross-Service Flow (the summary — the diagram itself is refined with
   `/refine diagram`)
3. Module Components
4. Global Architecture Impact — **structural**: `/sync` reads this section to decide
   whether to invoke `/docs`. If the refinement adds or removes a module, an
   integration or an actor, this is the section that has to change with it
5. Contracts per Service (business description of the endpoints)
6. Data Modeling (only the table name and the link — the full detail is refined
   with `/refine data-model`)

> Schemas (fields, types, validations) and response codes no longer live in
> `design.md` — use `/refine api` for those changes. Neither does the persistence
> entity or the migration — use `/refine data-model`.

### For the contract (target = api):
1. `info` (contract title, description)
2. Per path: request schema (fields, types, `required`)
3. Per path: response schemas and HTTP codes
4. `components.schemas` shared between paths

> If `plan.md` already exists and a field name or a path changes, warn in PHASE 4 —
> the generated DTOs will stop matching.

### For the flow artifact (target = diagram):
1. The whole diagram (a single `DIAGRAM_FORMAT` block — review it at once, not by
   sub-sections). With `DESIGN_OUTPUT_MODE = full-flow` the block is inline in the
   flow's own `.md`, and its surrounding prose is part of the same review

### For data-model.md (target = data-model):
1. Per entity: the `ORM` entity's fields (name, type, decorators)
2. Per entity: the migration's columns (they must match the fields 1:1)

> If `plan.md` already exists and a field name changes, warn in PHASE 4 —
> the generated entity/migration task will stop matching.

### For research.md (target = research):
1. Per decision: context and options evaluated
2. Per decision: chosen option and reason (tied to an AC or to the constitution)

> If refining research changes the chosen option and that affects a field or flow,
> warn in PHASE 4 that the contract and `data-model.md` must stay consistent, and that if
> `plan.md` already exists it has to be regenerated.

### Per section:
1. Show the **ACs from spec.md** that justify or constrain this section (1–3 lines max, inline), then show the current content of the section
2. Ask via `AskUserQuestion`: `question: "Is this section correct?"`,
   `header: "Section"`, options `"Yes, it's correct"` / `"I need to adjust something"`.
   If the user picks "I need to adjust something" (or uses "Other" to describe the
   change directly), continue the exchange in plain text to capture exactly
   what to change — `AskUserQuestion` only gates the yes/no decision, not the
   content of the edit itself.
3. If changes: check the proposed change against ACs (Rule 5 in `references/refine-guide.md`) before applying; apply with Edit, show diff, continue to next section
4. If correct: move to next section immediately
5. **Maximum 5 sections per session.** If more sections exist, summarize and ask
   via `AskUserQuestion` (`header: "Continue"`, options `"Yes, on to the next section"` /
   `"No, that's enough for now"`).

After all sections reviewed → go to PHASE 4.

---

## PHASE 4: Coherence checks + Handoff

### Before warning to re-run /plan: check if code is already built

Every "run `/plan spec-<number>` again" warning below assumes `plan.md`
either doesn't exist yet or has no completed tasks. Before showing any such
warning, check:

```bash
grep -c '\[X\]' work/active/spec-<number>/plan.md 2>/dev/null || echo 0
```

If `plan.md` exists AND has at least one `[X]` task → the story is already
built. Replace the "run `/plan` again" warning with:
> "⚠️ This change is structural and `plan.md` already has completed tasks —
> regenerating it would lose that progress. If the change fixes a defect in
> already-built code caused by an ambiguity in `spec.md`, use `/hotfix spec-<number>`
> instead of `/plan`. If the scope is larger (new <component>/endpoint/table), then
> regenerating the whole plan with `/plan spec-<number>` is the right call — confirm
> which case this is."

### Coherence checks (always apply after any change)

Consult `references/refine-guide.md` for the full coherence rules. Summary:

| Change made in | Check |
|----------------|-------|
| spec.md — AC added or removed | Warn: "This change is structural. If context.md already exists, run `/scan spec-<number>` to regenerate it." |
| spec.md — wording correction only | No downstream action required. |
| context.md — field renamed | Warn if `<api-artifact>` references the old name |
| design.md — endpoint description changed | Warn: "This change is structural. Run `/plan spec-<number>` to update the plan." |
| any artifact — a module, app, integration or actor added/removed | Check `design.md`'s `## Global Architecture Impact` (Rule 9): if it still says "No", warn — `/sync` reads that section to decide whether to refresh the C4 model |
| the contract — schema field renamed/added/removed, or path added | Warn if plan.md exists: "The contract changed. Run `/plan spec-<number>` to regenerate the DTOs and the traceability." |
| the flow artifact — flow changed | Warn if the contract doesn't reflect the new hop: "Check whether `<api-artifact>` needs a new endpoint for this hop." |
| data-model.md — entity field added/removed/renamed | Warn: "The data model changed. If a plan already exists, check that the SQL migration task is up to date." |

**NEVER modify plan.md from this skill.** Only warn the user.

### Handoff message

> Any message in this table saying "run `/plan` again" must be replaced by the
> `/hotfix` message defined above if `plan.md` already has `[X]` tasks.

| Artifact refined | Message |
|-----------------|---------|
| spec.md (wording only) | "Story updated at `work/active/spec-<number>/spec.md`. The changes are minor — the existing artifacts are still valid." |
| spec.md (AC added/removed/major) | "Story updated at `work/active/spec-<number>/spec.md`. The changes are structural — run `/scan spec-<number>` to regenerate the context." |
| context.md | "Context updated at `work/active/spec-<number>/context.md`. When you're ready, run `/design spec-<number>`." |
| design.md (minor change) | "Design updated at `work/active/spec-<number>/design.md`. The changes are minor — you can continue with the existing plan and run `/build spec-<number>`." |
| design.md (structural change) | "Design updated at `work/active/spec-<number>/design.md`. The changes are structural — run `/plan spec-<number>` to regenerate the plan before building." |
| the contract | "Contract updated at `work/active/spec-<number>/docs/<api-artifact>`. If `plan.md` already exists, run `/plan spec-<number>` again to regenerate the DTOs before `/build`." |
| the flow artifact | "Diagram updated at `work/active/spec-<number>/docs/<flow-artifact>`. Check that the contract still reflects the same flow." |
| data-model.md | "Data model updated at `work/active/spec-<number>/docs/data-model.md`. If `plan.md` already exists, run `/plan spec-<number>` again to regenerate the entity/migration task." |
| research.md | "Research updated at `work/active/spec-<number>/docs/research.md`. If a chosen decision changed, verify the contract and `data-model.md` are still consistent and regenerate the plan if one already existed." |

Stop — do not start planning or building.

---

## Common Issues

| Issue | Cause | Resolution |
|-------|-------|------------|
| spec.md doesn't exist and a spec refine is requested | /spec never ran | STOP: "Run `/spec spec-<number>` first to create the story." |
| context.md and design.md don't exist | /clarify never ran | Offer to refine spec.md if it exists, or STOP: "Run `/spec` and `/clarify` first." |
| design.md doesn't exist but context.md does | /design never ran | Offer to refine context.md or spec.md only. |
| A change in spec.md contradicts existing ACs | Scope creep or a real correction | Show the affected AC, ask for explicit confirmation before applying. |
| plan.md already exists (no `[X]` tasks) and there's a structural change in spec/design | Artifact refined after planning, but before building | Warn: "plan.md may be out of date. Run `/plan spec-<number>` to regenerate it." |
| plan.md already exists WITH `[X]` tasks and there's a structural change | Post-build defect from a clarification gap | Redirect to `/hotfix spec-<number>` — don't regenerate the plan, see the note in PHASE 4. |
| User asks to refine plan.md | Out of this skill's scope | Redirect: "To modify the plan, run `/plan spec-<number>` again or edit plan.md manually." |
| Section not found in the artifact | Incomplete artifact or different format | Show the whole artifact and ask which section applies. |

---

## Example

### Direct Mode — refining design.md

**Input:**
> `/refine design spec-1933` — the DTO field should be `serviceTypeId` instead of `type`

**Flow:**
1. Target = design (explicit). Reads `work/active/spec-1933/spec.md` → extracts ACs: AC-2 "the field is called serviceTypeId in the contract"
2. Mode = Direct (change described)
3. Reads design.md → locates the DTOs section → shows the relevant ACs and the current content:
   > **Relevant ACs:** AC-2 — "the field is called serviceTypeId in the contract"
   ```typescript
   export class FilterZonesRequestDto {
     @IsNotEmpty()
     type: string;
   }
   ```
4. Confirms: "Do you want to rename `type` to `serviceTypeId`?" (no AC contradiction → proceeds)
5. Applies the change
6. Coherence: plan.md exists → warns
7. Handoff: "Design updated. Minor change — you can continue with the build."

---

### Direct Mode — refining spec.md

**Input:**
> `/refine spec spec-1933` — AC-2 should say "returns an empty list with status 200" instead of just "returns an empty list"

**Flow:**
1. Target = spec (explicit). No external reference is loaded — spec.md is the artifact being edited.
2. Mode = Direct (change described)
3. Reads `work/active/spec-1933/spec.md` → locates AC-2:
   ```
   ### AC-2: No results returns an empty list
   If there are no results, it returns an empty list.
   ```
4. Confirms: "Do you want to update AC-2 to include status 200?"
5. Applies the change (wording correction, no AC added/removed)
6. Coherence: minor change → no re-scan required
7. Handoff: "Story updated. The changes are minor — the existing artifacts are still valid."

---

### Guided Mode — refining context.md

**Input:**
> `/refine context spec-1933`

**Flow:**
1. Target = context (explicit). Reads `work/active/spec-1933/spec.md` → keeps the ACs in memory
2. Mode = Guided (no change described)
3. Shows the "Affected components" section with the related ACs:
   > **Relevant ACs:** AC-1 — "the system registers zones in the capabilities service"
   ```
   - catalog-ms
   ```
   → "Is this correct?"
4. User: "yes"
5. Shows the "Entity / persistence model" section with the related ACs → user: "the `deletedAt` field is missing"
6. Applies the change, continues
7. On finishing: "Context updated. When you're ready, run `/design spec-1933`."

---

## Output language
**Conversational output** follows `~/.agents/references/chat-conventions.md` - the six blocks (announce, progress, question, summary, stop, handoff).

**Every artifact this skill edits keeps the language it was produced in** by `/spec`,
`/clarify` and `/design` — i.e. `ARTIFACT_LANGUAGE` (profile, language block; falls back to
`OUTPUT_LANGUAGE`). A refinement never switches an artifact's language: write the
correction in the language the surrounding text is already in.

Section headings are structural and stay in English, as do paths, classes and any
other identifier (`IDENTIFIER_LANGUAGE`).

**Chat interaction follows the user's language** (`OUTPUT_LANGUAGE` in the profile).
The message samples in this document are written in English; render them in the
user's language when that differs.
