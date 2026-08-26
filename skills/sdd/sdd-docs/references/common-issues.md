# sdd-docs — failure modes that don't stop the run

The ones that stop a run stay in `SKILL.md`, where the decision to abort is made.
These are the rest: what to do when the run can continue.

| Issue | Cause | Resolution |
|---|---|---|
| Unclear whether the change is Context or Container | The design wasn't explicit about scope | Default to Container (the level that changes more often); only touch Context if there's a genuinely new actor/external system |
| `design.md` marked "No" but it actually touched global architecture | `/sdd-design` misjudged the impact at design time | Fix the "Global Architecture Impact" section in `design.md` and run `/docs spec-<number>` manually — there's no `/sdd-sync` heuristic to compensate |
| Asked for a design-decisions log | Out of this skill's scope | That's `docs/decisions.md` (repo root), maintained by `/sdd-sync` directly in its Step 4 — it doesn't live inside `docs/architecture/` |
