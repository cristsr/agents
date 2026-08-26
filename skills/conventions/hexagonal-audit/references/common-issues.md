# hexagonal-audit — failure modes that don't stop the run

The ones that stop a run stay in `SKILL.md`, where the decision to abort is made.
These are the rest: what to do when the run can continue.

| Issue | Cause | Resolution |
|-------|-------|------------|
| The framework skill's detector won't run (no bash / another language) | Skill with no script for the stack | Map manually with the language's find/grep; per-stack detailers live in the framework skill's `audit-smells.md` |
| A generated `spec.md` has no ACs | Every finding for that module was LOW | Don't leave the draft: fold the checklist into an existing story, or drop it — `/sdd-clarify` rejects an item with no ACs |
| Too many findings | Unprioritized report | Only HIGH/MEDIUM generate ACs; LOW stay as a checklist |
| The generated `spec.md` doesn't follow the template | Inconsistent format | Consult `../../sdd/spec/references/spec-template.md` and the profile's `STORY_ID_MODE` |
