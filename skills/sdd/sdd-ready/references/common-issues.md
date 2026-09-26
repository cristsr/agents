# sdd-ready — failure modes that don't stop the chain

The ones that stop it are in `SKILL.md`. These are the rest.

| Issue | Cause | Resolution |
|---|---|---|
| The developer wants to stop between stages to review | They prefer the manual pace for this story | Run the stages one by one; `/sdd-ready` resumes from wherever they leave off |
| `PREP_SKILL` names another skill | The project prepares branches its own way | Invoke the skill the profile names in place of `/sdd-prepare`; the post-condition is the same `.branch` marker |
| The review lowered nothing but the developer expected `standard` | The survey found a signal that raises it | Report the raise and its reason; lowering is a `/sdd-route` change run, never part of the chain |
| `status.mjs` can't run (no `node`) | The script is unavailable | Derive the stage from disk: `context.md` → `/sdd-scan` done; `## Ambiguity Resolution` with zero markers → `/sdd-clarify` done; `**Tier ·` and `**Build mode ·` entries → review done |
| A stage's handoff names a different next step than the chain | Every stage names its own next step | Within the chain, the next stage wins; only Step 3's handoff reaches the developer |
