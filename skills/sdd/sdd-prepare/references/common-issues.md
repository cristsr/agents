# sdd-prepare — failure modes that don't stop the run

The ones that stop a run stay in `SKILL.md`, where the decision to abort is made.
These are the rest: what to do when the run can continue.

| Issue | Cause | Resolution |
|-------|-------|------------|
| `PREP_SKILL` in the profile points to another skill | The project defines its own prep | Run the one the profile names; this skill is the default |
| The working branch already exists | The user created it by hand, or a previous run | Not an error: verify it's checked out and skip creation — the `.branch` file is re-written with the same name |
| A bare `/sdd-prepare` (no story id) | No id in the input | Refresh the base only, report that `.branch` needs the story id, and point to `/prepare spec-<number>` |
| The pipeline is on the base branch | `/sdd-prepare` never ran, or a working branch was left behind | Run `/prepare spec-<number>` first — `/sdd-plan` and `/sdd-build` require `.branch` |
