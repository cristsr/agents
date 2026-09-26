# skill-creator — worked example

What a real run looks like: an interview turned into a finished skill.
Read it when the shape of the output is in doubt; the rules themselves are in
`SKILL.md`.

## Example

**Input:** "I want a skill that builds my weekly incident report"

**Flow:**
1. PHASE 1: interview → 2 use cases. Literal phrases: "build the weekly report",
   "this week's incident report". Tools: monitoring MCP + a validation script.
   Single-responsibility test: "Builds the weekly incident report from the
   monitoring data." — one sentence, passes. Collision check: `incident-triage`
   claims "incident report" → agreed that it owns single-incident reports, this
   skill owns the weekly one; cross negative triggers noted.
2. PHASE 2: `evals/evals.json` — 3 behavior evals (normal week, empty week, an
   incident with no severity), 4 `should`, 2 `should_not` (one owned by
   `incident-triage`), models `haiku` + `sonnet`. Baseline without the skill on
   `sonnet`: severities invented for unclassified incidents; report sections in a
   different order every run.
3. PHASE 3: category 3 (MCP enhancement), problem-first framing, pattern 3
   (iterative refinement). Step 4: **pipeline** — it writes into the shared reports
   workspace and reads the project's config for the output path.
4. PHASE 4: `name: building-weekly-incident-reports`; third-person `description`
   with what + when + the literal phrases + `Do NOT use for a single incident (use
   /incident-triage)`.
5. PHASE 5: `SKILL.md` + `evals/` + `scripts/check_report.py` +
   `references/severity-rules.md`.
6. PHASE 6: only what the baseline showed missing — the severity rules (low
   freedom: `scripts/check_report.py` rejects an unclassified incident, run →
   fix → re-run) and the fixed section order (medium freedom: a template).
   `## Contract` per `references/contract-guide.md`: `Requires` (the week's
   incidents exported), `Produces` (one file per severity, zero incidents
   unclassified), `Writes` (the reports path only), `Never` (never edits the
   incident source), `Profile keys` (`REPORTS_DIR`, `OUTPUT_LANGUAGE`).
7. PHASE 7: evals re-run on `haiku` and `sonnet` — both baseline failures gone;
   `haiku` never opened `references/severity-rules.md`, so the link was made
   explicit in the step that needs it. Checklist OK → handoff.

**Output:**
> "Skill created at `building-weekly-incident-reports/`. Its evals live in
> `evals/evals.json` — re-run them whenever the skill changes. For a full review,
> use `/skill-evaluator building-weekly-incident-reports/`."
