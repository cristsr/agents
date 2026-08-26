# sdd-sync — failure modes that don't stop the run

The ones that stop a run stay in `SKILL.md`, where the decision to abort is made.
These are the rest: what to do when the run can continue.

| Issue | Cause | Resolution |
|---|---|---|
| `plan.md` has no `## AC Coverage` section at all | Plan built before this convention existed | Don't infer coverage from the `[X]` markers — ask the user to confirm the ACs are met before closing |
| No `docs/` folder in the story | Story with no API/diagram changes | Skip Step 3, note it in the final summary |
| `design.md` has no "Design Decisions" section | Story with no significant decisions | Skip Step 4 silently — not every story has a decision worth recording |
| `docs/decisions.md` doesn't exist yet | No story with decisions has ever closed in this repo | Create it in Step 4 with the standard header — no need to wait for a separate bootstrap skill |
| Destination doc already exists | Module docs accumulate across stories | Overwrite (the new version supersedes) and note it in the final summary so `/sdd-commit` reflects it in the PR |
| Module can't be identified | `design.md` doesn't name it | Ask the user — don't guess |
| User asks to group/execute commits or draft the PR right here | Scope confusion after the skill split | Explain that's `/commit spec-<number>`, meant to run right after |
| `design.md` has no "Global Architecture Impact" section | Story designed before this convention existed | Don't guess from the diff — ask the user directly whether the story touched global architecture |
| The section says "Yes" but the node/edge isn't clear | `/sdd-design` didn't specify it in enough detail | Invoke `/docs spec-<number>` anyway and let it ask for precision, or ask the user before invoking |
| User asks to bootstrap `docs/architecture/` from here | Out of this skill's scope | Explain that's `/sdd-docs` (with no arguments), not `/sdd-sync` |
