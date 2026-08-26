# sdd-clarify — worked example

What a real run looks like: a run resolving ambiguities end to end.
Read it when the shape of the output is in doubt; the rules themselves are in
`SKILL.md`.

## Example

**Input:** `/clarify spec-1933`

**Steps 1-2:**
- Gates OK; `apps/ledger` identified from `MODULE_ROOT` + spec keywords; clean `develop`.

**Step 3 (R + P):**
- R1: 3 unknowns — AC-2 with no HTTP code, "service type" undefined, multi-value
  filter with no semantics (AND/OR).
- R2: loads `rules.md`, `CLAUDE.md`, the profile and the rubric.
- R4: **three queries in a single batch** — one inventory (`apps/ledger` zones module)
  and two precedent (`"service type enum"`, `"list empty response"`). The first
  precedent query finds `ServiceType`; the second returns nothing.
- P: AC-2 → level 5 REST convention (autonomous, high: 200 with empty array);
  AC-1 "service type" → level 4 `ServiceType` (autonomous, medium); AC-1 AND/OR →
  nothing determines it, changes what the operator sees → **escalation** (business
  intent).
- Comes out of P with: 1 escalation, "OR" recommended, and no R5 question.

**Step 4:** one `AskUserQuestion` call. The user picks OR.

**Step 5 (I):** the decision log first, then the ACs, EARS on AC-1, no
`Technical Context` (the developer declared no constraints), `context.md` with the
inventoried module and 1 documentation gap.

**Step 6:** `grep -c 'NEEDS CLARIFICATION'` → `0`. The story stayed in `tdd`, so the
handoff points at `/sdd-design`. Review summary:
> Clarified spec-1933: 2 autonomous decisions, 1 consulted, 1 AC in EARS.
> Survey: 1 component, 3 graph queries, 1 precedent, 1 without precedent.
> Ready to design. Once you've reviewed it, `/design spec-1933`.

**Before (two skills):** `/sdd-clarify` with 4 looping questions and a narrow probe, then
`/sdd-scan` re-exploring the same module with its own round of unknowns.
**Now:** one pass, 3 parallel queries, 1 question, two artifacts.
