# sdd-status — failure modes that don't stop the run

The ones that stop a run stay in `SKILL.md`, where the decision to abort is made.
These are the rest: what to do when the run can continue.

| Issue | Cause | Resolution |
|-------|-------|------------|
| The report suggests `/sdd-design` on an `evidence` story | The carril was read but not applied | `design` is `skipped` there, not missing: report "not required in this carril" and point at `/sdd-plan` |
| Everything looks done but the folder is still under `WORKDIR_ACTIVE` | `/sdd-sync` never ran | The next step is `/sdd-sync`, not `/sdd-commit` — `/sdd-commit` works on the archived story |
| `next.regression` came back | A finished stage sits on top of an unfinished one | Say why before relaying the command: re-running that stage would discard built work, which is why the script points at `/sdd-hotfix` |
| A stage is `ready` but `branch` is `null` | `/sdd-prepare` never ran | Name `/sdd-prepare` alongside the stage command — `/sdd-plan` stops without `.branch` |
