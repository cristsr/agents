# Troubleshooting — failure modes that don't stop a clarify run

The ones that stop a run are in `SKILL.md`. These are the rest: what to do when the
precedent, the escalation budget or the assets behave in a way the happy path does not
cover.

---

| Issue | Cause | Resolution |
|-------|-------|------------|
| `CODE_SURVEY` resolving to `inline` | Project with no survey adapter bound | Run the precedent queries with your own Read/Grep, same scope; note it in the wrap-up |
| `CODE_SURVEY` without call paths | Project without an indexed graph | Lean on the citations in `context.md`; resolve the rest with levels 5-6 and record "no precedent" |
| `context.md` looks stale | The code changed since the survey | Finish the run with what's there, and suggest `/sdd-scan spec-<number>` to refresh it |
| An unknown needs a module `context.md` doesn't list | The survey's scope was narrower than the story | Record it as a gap, decide at low confidence, and suggest `/sdd-scan spec-<number>` |
| A new doubt appears in phase I | Phase R was incomplete | Resolve it with the hierarchy and mark it low confidence; don't open questions in I |
| The precedent queries return contradictory results | The repo solved the same thing two ways | Not a precedent: drop to level 5 and record the inconsistency in the log |
| More than 3 unknowns qualify for escalation | Item with a lot of open product decisions | Escalate the 3 with the highest impact and warn that the scope may not be ready |
| `assets/` has files that can't be read | Opaque binary, scanned PDF with no text | List them in the wrap-up and carry the gap — never guess what an unreadable asset says |
| The developer asks about the tier or the build mode | Those axes are not this skill's | Point at `/sdd-route spec-<number>`, which runs right after this one |
| The user reverts several decisions in a row | Rubric miscalibrated for the domain | Apply the changes and suggest `--ask` for the next items in that area |
