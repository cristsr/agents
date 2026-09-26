# skill-evaluator — failure modes that don't stop the run

The ones that stop a run stay in `SKILL.md`, where the decision to abort is made.
These are the rest: what to do when the run can continue.

| Issue | Cause | Resolution |
|---|---|---|
| The skill looks fine but doesn't trigger | Description technically correct but with no user language | Apply PHASE 3's debug technique and compare with what the user actually types |
| Two evaluated skills overlap | Boundary drawn wrong (D9) | Report the collision naming both skills, propose the owner of each shared trigger and cross negative triggers |
| Huge but coherent skill | Progressive disclosure unused | If D8 passes, don't ask to cut content: ask to **move** it to `references/`, one level deep, and link it |
| Huge and incoherent skill | Several responsibilities (D8) | Propose the split first — moving content into references would only hide it |
| A proposed split yields a piece nobody would ask for | Granularity over discovery | Keep that piece inside the skill that uses it, as a reference or a script |
| No `evals/` folder | The skill predates eval-driven development | V1/V2: offer to persist the report's trigger battery as `evals/evals.json`; the baseline needs a run without the skill |
| Sibling descriptions can't be loaded | Skills installed in an unusual scope | Ask the user for the paths; without them, D9 is reported as not verified, never as passing |
| Group C fires on a convention skill | It was classified pipeline without a real handoff | Reclassify as standalone (PHASE 1 Step 4) and drop the C findings — a contract with nothing on either side is noise |
| The `Requires` cites an artifact no skill produces | Junction never checked in both directions | C6: report it against the skill that should produce it, naming both |
| The neighbor changed while you were evaluating | Several skills reviewed in parallel | Re-check the junction with both sides in their final version — intermediate state produces phantom findings |
| The catalog and the skill declare different keys | The hand-maintained table drifted | Report the discrepancy; the profile template settles it. Historically the table has been the wrong side, so don't fix it from here (C2) |
