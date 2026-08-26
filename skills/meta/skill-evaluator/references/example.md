# skill-evaluator — worked example

What a real run looks like: a skill evaluated phase by phase, with its findings.
Read it when the shape of the output is in doubt; the rules themselves are in
`SKILL.md`.

## Example

**Input:** `/skill-evaluator ~/.claude/skills/report-builder`

**Flow:**
1. PHASE 1: resolves the symlink to `~/.agents/skills/report-builder`. Finds
   `SKILL.md` (6,200 words), `references/` (2 files), `README.md`. Step 4:
   **pipeline** — it reads `.agents/profile.yaml` and writes into `work/`.
2. PHASE 2: B10 fails → there's a `README.md` inside the folder. B1–B9 OK.
3. PHASE 3: D2 and D6 fail → `description: Generates reports.` No trigger phrases.
   Diagnosis: **under-triggering**.
4. PHASE 4: E2 fails (6,200 > 5,000 words). E3 fails → one of the `references/`
   isn't linked from `SKILL.md`.
5. PHASE 5: I4 fails → no error-handling section.
6. PHASE 6: C1 fails → no `## Contract`; preconditions scattered across three
   `CRITICAL` sections (also C5). C4 fails → Step 2 runs `git checkout develop`
   with the branch hardcoded, while the profile declares `BASE_BRANCH`.
7. PHASE 7: generates 3 positive and 3 negative queries from the Examples.
8. PHASE 8: report — 1 blocking, 5 important, 1 minor. Priority 1: rewrite the
   description with the user's phrases.

**Output:**
> "Evaluation ready: 1 blocking issue (`README.md` inside the folder), risk of
> **under-triggering** from a generic description. The highest-impact fix is
> rewriting the description. Should I apply the fixes?"
