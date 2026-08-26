# sdd-forge — failure modes that don't stop the run

The ones that stop a run stay in `SKILL.md`, where the decision to abort is made.
These are the rest: what to do when the run can continue.

| Issue | Cause | Resolution |
|---|---|---|
| A test fails at the end | implementation defect | `/sdd-build` stops; forge **aborts before `/sdd-sync`**. Fix the code, or `/sdd-hotfix` if it's a spec gap |
| `/sdd-sync` reports a duplicate flow | the design gave a different name to an existing flow | forge stops after the build; fix the design with `/sdd-refine` and retry `/sdd-sync` |
