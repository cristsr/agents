# sdd-rules — worked example

What a real run looks like: an interview and the constitution it writes.
Read it when the shape of the output is in doubt; the rules themselves are in
`SKILL.md`.

## Example

**Input:** `/sdd-rules`

**Flow (Create mode, this workspace):**
1. PHASE 1: resolves `docs/rules.md` in the project (doesn't exist → Create mode,
   v1.0.0). Under `DOCS_ARCHITECTURE` it detects `conventions.md` and `testing.md`
   → offers to seed. The user accepts.
2. PHASE 2: interview. C1 → "hexagonal mandatory, abstract class as the DI token";
   C2 → "TDD test-first, contract tests for endpoints"; C5 → "manual SQL migrations,
   never synchronize:true"; C6 → "don't break the current API contract";
   C7 → "conventional commits, never build on main". C3/C4/C8 → defaults.
3. PHASE 3: drafts each as a testable principle with a reason + how it's verified.
4. PHASE 4: enables the 4 gates by default.
5. PHASE 5: writes `docs/rules.md` v1.0.0.
6. PHASE 6: summary — 6 articles, 4 gates, v1.0.0.

**Output:**
> "Constitution saved to `docs/rules.md` (v1.0.0). The `/sdd-design` and `/sdd-plan` skills
> validate against it as the source of non-negotiable principles."
