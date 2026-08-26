# sdd-hotfix — worked example

What a real run looks like: a post-build gap corrected end to end.
Read it when the shape of the output is in doubt; the rules themselves are in
`SKILL.md`.

## Example

**Input:** `/hotfix spec-1933` — "AC-2 only said 'returns an empty list' without specifying the HTTP code, and it was implemented returning 404 — a real client expects 200 with an empty array"

**Flow:**
1. Verifies `plan.md` → exists, 6 tasks, 6 marked `[X]`. Confirms a post-build case.
2. Current branch: `feat/SPEC-1933-filter-zones-by-service-type` (not main). Continues.
3. Reads `spec.md` → AC-2: "If there are no results, it returns an empty list." — ambiguous, doesn't specify the HTTP code. Proposes:
   > "**Current AC-2:** 'If there are no results, it returns an empty list.' — **Proposal:** 'If there are no results, it returns an empty list with status 200.'"
   and calls `AskUserQuestion` (header "AC-2", options "Confirm" / "Adjust the text").
4. The user picks "Confirm". PHASE 2: edits AC-2, adds:
   ```markdown
   ## Hotfixes

   - **HOTFIX-1 (AC-2):** The AC didn't specify the HTTP code for an empty list and it was implemented as 404 → clarified that it must be 200 — implemented in `plan.md` Task HOTFIX-1.
   ```
5. PHASE 3: the AC→Task table says AC-2 → Task 3 (domain port) and Task 5 (controller). The file to touch is the controller.
6. PHASE 4: appends `### Task HOTFIX-1: Fix the response code for an empty list` with a regression test hitting the endpoint with no results and expecting `200` + `[]`. Updates AC-2's row in the traceability table to include `Task HOTFIX-1`.
7. PHASE 5: test fails (returns 404) → fixes the controller → test passes. Module suite (`TESTS.module`): PASS. Replaces AC-2's line in `## AC Coverage` so it points at the new regression test.
8. PHASE 6: status 200 was already documented in the contract, only the code didn't honor it — no contract impact. Closes with:
   > "Hotfix applied. `spec.md` and `plan.md` updated with HOTFIX-1. Review the changes and tell me if anything needs adjusting."
