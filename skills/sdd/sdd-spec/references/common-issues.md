# sdd-spec — failure modes that don't stop the run

The ones that stop a run stay in `SKILL.md`, where the decision to abort is made.
These are the rest: what to do when the run can continue.

| Issue | Cause | Resolution |
|-------|-------|------------|
| Very long tracker title | Item with a descriptive name in the backlog | Keep it verbatim — the 5-8 word rule only applies to new titles |
| Type ambiguous between `bug` and `debt` | The defect is structural, not behavioral | If there's an observable symptom today → `bug`; if it's a latent risk → `debt` |
| `incident` with no root cause | Still under investigation | Mandatory marker; the item may exist but won't advance to `/sdd-design` without a root cause |
| Unnumbered ACs in the input | Badly formatted item | Number them in order of appearance |
| The item already exists | Re-run | Confirm overwrite before continuing |
| The folder has `hu.md`, not `spec.md` | Item predating the rename | Treat it as the same artifact; mention it uses the legacy name |
| Number not identifiable | Input with no ID | Resolve per `STORY_ID_MODE`: next free (sequential), title slug (name) or tracker key (tracker-code) |
