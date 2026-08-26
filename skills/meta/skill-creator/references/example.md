# skill-creator — worked example

What a real run looks like: an interview turned into a finished skill.
Read it when the shape of the output is in doubt; the rules themselves are in
`SKILL.md`.

## Examples
Example 1: [common scenario]
User says: "…"
Actions: 1. … 2. …
Result: …

---

## Example

**Input:** "I want a skill that builds my weekly incident report"

**Flow:**
1. PHASE 1: interview → 2 use cases. Literal phrases: "build the weekly report",
   "this week's incident report". Tools: monitoring MCP + a validation script.
2. PHASE 2: category 3 (MCP enhancement), problem-first framing, pattern 3
   (iterative refinement — the report improves with validation and regeneration).
   Step 4: **pipeline** — it writes into the shared reports workspace and reads the
   project's config for the output path.
3. PHASE 3: `name: incident-weekly-report`; `description` with what + when +
   the literal phrases + `Do NOT use for ad-hoc incident queries`.
4. PHASE 4: `SKILL.md` + `scripts/check_report.py` + `references/severity-rules.md`.
5. PHASE 5: `## Contract` after the Overview — `Requires` (the week's incidents
   exported), `Produces` (one file per severity, zero incidents unclassified),
   `Writes` (the reports path only), `Never` (never edits the incident source),
   `Profile keys` (`REPORTS_DIR`, `OUTPUT_LANGUAGE`). Then the instructions: initial
   draft → quality check → refinement loop → finalization, plus troubleshooting for
   MCP connection errors.
6. PHASE 6: trigger battery (3 positive, 2 negative) + a token baseline.
7. PHASE 7: checklist OK → handoff.

**Output:**
> "Skill created at `incident-weekly-report/`. Run the trigger queries to verify it
> loads when it should. For a full review, use
> `/skill-evaluator incident-weekly-report/`."
