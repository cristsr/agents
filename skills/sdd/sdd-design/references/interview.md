# Interview — loading the context and finding the unknowns

The two phases that run before any artifact is written, both inline in the main agent.
PHASE 1 loads what the design has to respect; PHASE 2 turns the gaps into the questions
step 3 asks. No contract is involved yet — this is the reading that decides what the
artifacts will have to satisfy.

---

## PHASE 1: Load context

Extract the story number from the caller's input, then read:

1. `work/active/spec-<number>/spec.md` — extract:
   - The complete framing block (User Story, Defect, Technical Debt, …)
   - All Acceptance Criteria
   - Technical Context if present

2. `work/active/spec-<number>/context.md` — extract:
   - Affected <component>s (`COMPONENT_TERM`, e.g. microservice) and their modules
   - Existing entities with their fields
   - Existing DTOs available for reuse
   - The project's injection patterns
   - Gaps detected by /sdd-clarify

3. Read the conventions doc under `DOCS_ARCHITECTURE` (e.g.
   `docs/architecture/conventions.md`) — apply naming and code conventions
   throughout the design.

4. Read the project **constitution** if it exists — it is the source of
   non-negotiable principles and the quality gates validated in PHASE 4.5:

   ```bash
    [ -s docs/rules.md ] && echo "FOUND" || echo "NONE"
   ```

   If found, load its Articles and its active Quality Gates. If it does not
   exist (or is empty) → continue without it, and note in the PHASE 5 summary
   that no constitution was found (the developer may want to run `/sdd-rules`).

---

## PHASE 2: Analyze and identify unknowns

It produces the candidates; step 3 asks them.

### What is already defined (do NOT list as unknowns)

- Fields that exist in `context.md` entities
- Behaviors explicitly described in acceptance criteria
- Patterns already present in `context.md`

### What needs resolution (candidates for questions)

- New field names and types not present in any existing entity or DTO
- Ambiguous behaviors in acceptance criteria
- Inter-service communication details not specified
- Pagination or filtering behavior not described
- Error handling behavior not specified

Build the internal list of unknowns. If it has more than 5 items, prioritize by impact on
architecture and DTOs — carry only the top 5 into step 3, each with a recommended answer
that can become the first question option.

---

## PHASE 3: the question mechanics

One question per unknown, in priority order, one `AskUserQuestion` call each — never
batched, because the answer to one can change whether the next is still relevant.

| Field | What goes in it |
|---|---|
| `question` | The unknown phrased as a direct question |
| `header` | A short label, max 12 characters, naming the unknown ("Pagination", "New field") |
| `options` | 2-4 mutually exclusive choices, the recommended one first, labelled " (Recommended)" |

The tool always offers an implicit "Other" — never add one yourself. An unknown with no
natural discrete options (a specific value such as a field name) is asked as a normal text
question instead of being forced into the tool.

Two rules hold across the whole session: **maximum 5 questions**, and never reveal upcoming
questions in advance. Each resolution is recorded immediately, as one bullet for
`design.md`'s `## Design Decisions`:

```markdown
- **<unknown resolved>:** <chosen option> — <brief reason>
```

When PHASE 2 found no unknowns, step 3 is skipped and `## Design Decisions` is omitted from
`design.md` entirely — never left as an empty header.
