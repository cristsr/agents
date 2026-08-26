# sdd-scan — failure modes that don't stop the run

The ones that stop a run stay in `SKILL.md`, where the decision to abort is made.
These are the rest: what to do when the run can continue.

| Issue | Cause | Resolution |
|-------|-------|------------|
| The item's scope changed | ACs were added since the last survey | Re-derive components from `spec.md` and report the change |
| Module not found | New or renamed module | Record it as a gap in `context.md`; don't block |
| The refresh contradicts a decision already made | The code changed under the item's feet | Flag it and suggest `/sdd-clarify`; `/sdd-scan` never edits `spec.md` |
| Component off `BASE_BRANCH` | Base not prepared | Warn and continue; suggest `/sdd-prepare` |
