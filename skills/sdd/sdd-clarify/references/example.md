# sdd-clarify — worked example

What a real run looks like: a run resolving ambiguities end to end.
Read it when the shape of the output is in doubt; the rules themselves are in
`SKILL.md`.

## Example

**Input:** `/sdd-clarify spec-1933` (after `/sdd-scan` wrote `context.md`)

**Step 1:** gates OK — `spec.md` with 3 ACs, `tier` absent (`full`), `context.md`
present listing `apps/ledger`.

**Step 2 (R):**
- R1: 3 unknowns — AC-2 with no HTTP code, "service type" undefined, multi-value
  filter with no semantics (AND/OR).
- R2: loads `rules.md`, `CLAUDE.md`, the profile and the rubric.
- R4: reads `context.md` in full, then **two precedent queries in one batch**
  (`"service type enum"`, `"list empty response"`). The first finds `ServiceType`;
  the second returns nothing.
- R5: nothing that only the developer knows could change a resolution → no question.

**Step 3 (P):** AC-2 → level 5 REST convention (autonomous, high: 200 with empty
array); "service type" → level 4 `ServiceType` (autonomous, medium); AND/OR → nothing
determines it, it changes what the operator sees → **escalation** (business intent).

**Step 4:** one `AskUserQuestion` call. The user picks OR.

**Step 5 (I):** the decision log first, then the ACs, EARS on AC-1, scenarios with the
settled values, no `## Technical Context`.

**Step 6:** `grep -c 'NEEDS CLARIFICATION'` → `0`.
> Clarified spec-1933: 2 autonomous decisions, 1 consulted, 1 AC in EARS; 1 precedent,
> 1 search without precedent.
> Next: `/sdd-route spec-1933` — it confirms the tier and the build mode.
