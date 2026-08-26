# sdd-refine — failure modes that don't stop the run

The ones that stop a run stay in `SKILL.md`, where the decision to abort is made.
These are the rest: what to do when the run can continue.

| Issue | Cause | Resolution |
|-------|-------|------------|
| design.md doesn't exist but context.md does | /sdd-design never ran | Offer to refine context.md or spec.md only. |
| A change in spec.md contradicts existing ACs | Scope creep or a real correction | Show the affected AC, ask for explicit confirmation before applying. |
| plan.md already exists (no `[X]` tasks) and there's a structural change in spec/design | Artifact refined after planning, but before building | Warn: "plan.md may be out of date. Run `/plan spec-<number>` to regenerate it." |
| Section not found in the artifact | Incomplete artifact or different format | Show the whole artifact and ask which section applies. |
