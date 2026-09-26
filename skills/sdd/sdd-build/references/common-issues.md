# sdd-build — failure modes that don't stop the run

The ones that stop a run stay in `SKILL.md`, where the decision to abort is made.
These are the rest: what to do when the run can continue.

| Issue | Cause | Resolution |
|-------|-------|------------|
| Test fails on first run | Implementation has a bug | Read the error carefully, fix the implementation |
| Test fails repeatedly | Test setup incorrect | Stop and ask — do not guess |
| File already exists | Plan re-executed | Check if content is correct, overwrite only if needed |
| Module not found in imports | Barrel export missing | Add export to index.ts before continuing |
| Use case not injected | Module registration missing | Check module.ts providers array |
| A `VERIFY` command exits 0 but prints something the plan didn't predict | The check is weaker than the plan assumed, or the expected output is stale | Treat it as a failed verification. Do not mark `[X]` on a check whose output you cannot match (`fast` writes no `[X]` — do not close the criterion either) |
| A `[P]` group's subagent modifies a file another group already touched | Wrong grouping in `/sdd-plan` | Stop the parallel batch, resolve the conflict, continue the remaining groups sequentially (no `[P]` group exists in `fast` — the tier writes no plan) |
| A `[P]` group's subagent fails or its verification is red | A bug in that group's code, or a test/instructions gap | Inspect the reported error, fix it, re-run that group's verification before marking `[X]`; never accept a subagent's word without re-running its tests (`fast` runs no groups — handle the single criterion directly) |
| `API_CLIENT_EXPORT` unbound, or its adapter unavailable | Tool not installed or project doesn't use it | Skip the step, suggest importing `<api-artifact>` straight into Postman, don't block the close |
| `<api-artifact>` doesn't exist | Story with no new/changed endpoints | Skip the Postman generation silently |
