# sdd-hotfix — failure modes that don't stop the run

The ones that stop a run stay in `SKILL.md`, where the decision to abort is made.
These are the rest: what to do when the run can continue.

| Issue | Cause | Resolution |
|-------|-------|------------|
| The gap implies a new service/endpoint/table | Badly sized story, not a targeted defect | Recommend `/refine spec` + a full `/sdd-plan` instead of a hotfix |
| The fix requires touching the contract, the flow artifact or `data-model.md` | The gap was contractual, not just wording | Warn at close, don't correct automatically — use `/sdd-refine` for those files |
| The module's tests fail after the fix | The fix broke behavior already covered | Don't mark `[X]`, adjust the fix until the whole suite passes |
| `/sdd-sync` then rejects the close for an uncovered AC | the hotfix added an AC without its `## AC Coverage` line | Add the line in PHASE 5, step 5 — one per AC, with a real test reference |
