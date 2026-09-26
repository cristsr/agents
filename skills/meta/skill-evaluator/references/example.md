# skill-evaluator — worked example

What a real run looks like: a skill evaluated phase by phase, with its findings.
Read it when the shape of the output is in doubt; the rules themselves are in
`SKILL.md`.

## Example

**Input:** `/skill-evaluator ~/.claude/skills/report-builder`

**Flow:**
1. PHASE 1: resolves the symlink to `~/.agents/skills/report-builder`. Finds
   `SKILL.md` (640 lines), `references/` (2 files), `README.md`, no `evals/`.
   Step 4: **pipeline** — it reads `.agents/profile.yaml` and writes into `work/`.
   Step 5: loads 12 sibling descriptions.
2. PHASE 2: B10 fails → there's a `README.md` inside the folder. B1–B9 OK.
3. PHASE 3: D2 and D6 fail → `description: Generates reports and also exports
   them to the dashboard.` No trigger phrases. D8 fails → "and also": building a
   report and publishing it change for different reasons. D9 → `dashboard-sync`
   already claims "export to the dashboard". Diagnosis: **under-triggering**, and a
   split where the export half is folded into `dashboard-sync`, not made a new skill.
4. PHASE 4: E2 fails (640 > 500 lines). E3 fails → one of the `references/` isn't
   linked from `SKILL.md`.
5. PHASE 5: I4 fails → no error-handling section. I7 → two paragraphs explain what
   a CSV is.
6. PHASE 6: C1 fails → no `## Contract`; preconditions scattered across three
   `CRITICAL` sections (also C5). C4 fails → Step 2 runs `git checkout develop`
   with the branch hardcoded, while the profile declares `BASE_BRANCH`.
7. PHASE 7: V1 and V2 fail → no evals, no baseline. Generates 3 positive and 3
   negative queries (one owned by `dashboard-sync`) and offers to persist them.
8. PHASE 8: report — 1 blocking, 11 important, 2 minor. Single responsibility: No.
   Priority 1: split off the export; priority 2: rewrite the description.

**Output:**
> "Evaluation ready: 1 blocking issue (`README.md` inside the folder). The skill
> holds two responsibilities — the export belongs to `dashboard-sync`. After the
> split, the highest-impact fix is rewriting the description. Should I apply the
> fixes?"
