# skill-evaluator — failure modes that don't stop the run

The ones that stop a run stay in `SKILL.md`, where the decision to abort is made.
These are the rest: what to do when the run can continue.

| Issue | Cause | Resolution |
|---|---|---|
| The skill looks fine but doesn't trigger | Description technically correct but with no user language | Apply PHASE 3's debug technique and compare with what the user actually types |
| Two evaluated skills overlap | Overlapping scopes | Report the collision and propose cross negative triggers in both |
| Huge but coherent skill | Progressive disclosure unused | Don't ask to cut content: ask to **move** it to `references/` and link it |
| Group C fires on a convention skill | It was classified pipeline without a real handoff | Reclassify as standalone (PHASE 1 Step 4) and drop the C findings — a contract with nothing on either side is noise |
| The `Requires` cites an artifact no skill produces | Junction never checked in both directions | C6: report it against the skill that should produce it, naming both |
| The neighbor changed while you were evaluating | Several skills reviewed in parallel | Re-check the junction with both sides in their final version — intermediate state produces phantom findings |
| The catalog and the skill declare different keys | The hand-maintained table drifted | Report the discrepancy; the profile template settles it. Historically the table has been the wrong side, so don't fix it from here (C2) |
