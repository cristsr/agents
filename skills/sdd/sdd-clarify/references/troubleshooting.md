# Troubleshooting — every failure mode of a clarify run

The five that STOP a run are inline in `SKILL.md`. These are the rest: what to do
when the survey, the escalation budget, the assets or the build mode behave in a
way the happy path does not cover.

---

| Issue | Cause | Resolution |
|-------|-------|------------|
| spec.md doesn't exist | `/sdd-spec` never ran | STOP: tell the user to run `/spec spec-<number>` first |
| spec.md exists but has no ACs | `/sdd-spec` left the section empty | STOP: the ACs are the contract with the rest of the pipeline — run `/spec spec-<number>` again to write them |
| `CODE_SURVEY` resolving to `inline` | Project with no survey adapter bound | Survey with your own Read/Grep, same scope; note it in the wrap-up |
| Component not identifiable | Item with no clear keywords | Ask in step 2 — it can't be deferred, without a component there's nothing to survey |
| Module not found in the component | New module or under a different name | Not a blocker: it's just another unknown, escalated in P with the rest |
| A new doubt appears in phase I | Phase R was incomplete | Resolve it with the hierarchy and mark it low confidence; don't open questions in I |
| The graph returns contradictory results | The repo solved the same thing two ways | Not a precedent: drop to level 5 and record the inconsistency in `context.md` |
| More than 3 unknowns qualify for escalation | Item with a lot of open product decisions | Escalate the 3 with the highest impact and warn that the scope may not be ready |
| `CODE_SURVEY` without call paths | Project without an indexed graph | The **inventory** arrives anyway; **precedents** are resolved with levels 4-5 |
| Component off `BASE_BRANCH` | Base not prepared | Warn and continue — you survey whatever is checked out; suggest `/sdd-prepare` |
| Only `context.md` needs refreshing | The code changed, the ACs didn't | Use `/scan spec-<number>` — don't re-clarify |
| `assets/` has files that can't be read | Opaque binary, scanned PDF with no extractable text | List them in the wrap-up and carry the gap to the dossier — never guess what an unreadable asset says |
| The deliverable clearly isn't code but the `type` isn't in `EVIDENCE_MODE_TYPES` | The project never widened the allowlist | Report it and leave the story in `tdd`. The way in is editing `EVIDENCE_MODE_TYPES` in `.agents/profile.yaml` — never write the field against the allowlist, both the validator and `/sdd-plan` reject it |
| `evidence` looks right but `VERIFY` is unbound | The project declared no check for this kind of deliverable | Not eligible: without a check there is nothing to close an AC with. Either bind the port first or stay in `tdd` |
| Only some ACs can be closed by the check | The item mixes a refactor with new behavior | `tdd` for the whole story — a split carril inside one plan is how coverage gets lost. Splitting the item is the other option |
| The user reverts several decisions in a row | Rubric miscalibrated for the domain | Apply the changes and suggest `--ask` for the next items in that area |
| You can't even build the unknowns list | Missing context, or a spec that contradicts itself | Stop before surveying: show the blocker, fix the input (`/sdd-refine`/`/sdd-spec`), then re-run |
| The handoff grep is non-zero | PHASE I left a resolved marker in place | Stop: the run isn't complete — re-run `/clarify spec-<number>` |
