# sdd-route — failure modes that don't stop the run

The ones that stop a run are in `SKILL.md`. These are the rest.

| Issue | Cause | Resolution |
|---|---|---|
| The deliverable clearly isn't code but the `type` isn't in `EVIDENCE_MODE_TYPES` | The project never widened the allowlist | Report it and leave the story in `tdd`. The way in is editing `EVIDENCE_MODE_TYPES` in `.agents/profile.yaml` |
| `evidence` looks right but `VERIFY` is unbound | No check declared for this kind of deliverable | Not eligible — bind the port first or stay in `tdd` |
| Only some ACs can be closed by the check | The item mixes a refactor with new behavior | `tdd` for the whole story; splitting the item is the other option |
| The input names nothing, yet reads like a one-liner | A symptom with no file, symbol or module | `standard`, not `fast` — `## Change Surface` can't be written honestly |
| The developer disagrees with the inferred tier | The initial run sees the input, never the code | Take theirs, write it (even `tier: full`), and let `## Tier Rationale` say what the reading missed |
| A `fast` story turned out bigger during the build | `/sdd-build` stopped on the surface or a second AC | Change run: raise it; the table in `tier-changes.md` names what runs next |
| `/sdd-plan` found a contract or a second component in a `standard` story | The review missed a signal the plan analysis surfaced | Change run: raise to `full`, then `/sdd-design` |
| The review run is repeated | The developer re-ran it after a `/sdd-refine` | Replace the two route entries; never append a second pair |
