# sdd-design — failure modes that don't stop the run

The ones that stop a run stay in `SKILL.md`, where the decision to abort is made.
These are the rest: what to do when the run can continue.

| Issue | Cause | Resolution |
|-------|-------|------------|
| No constitution | `/sdd-rules` never ran | Apply the 4 built-in gates by default; suggest `/sdd-rules` to make them enforceable |
| Undefined field in a schema | Ambiguous item | Ask in PHASE 3 before designing |
| Affected <component> not identified | Incomplete context.md | Ask the user before continuing |
| Diagram with no schema names on the arrows | Missing contract information | Resolve in PHASE 3 before diagramming |
| `component.md` already exists from an earlier story of the same module | It's a living per-module document, accumulated across stories | Read it first and update it surgically — never regenerate it from scratch, that would lose earlier stories' components |
| Unclear whether the story touches global architecture | The module/integration is ambiguous with respect to what `context.md` already lists | Resolve it in PHASE 3 as one more question — never leave "Global Architecture Impact" ambiguous, `/sdd-sync` and `/sdd-docs` trust that answer as written |
| New table not confirmed | Item ambiguous about persistence | Ask it as one of the 5 questions |
| `<api-artifact>` modified after /sdd-plan | Contract change after approval | Warn: run `/plan spec-<number>` again to regenerate the DTOs |
| `CONTRACT_LINT` or `DIAGRAM_CHECK` fails in step 5 | A port is stricter than the file tools | Fix-and-retry (max 3) editing the artifact; after that, record it as a known risk in `design.md` |
