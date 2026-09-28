# Executing `[P]` groups — one implementer subagent per group

## Contents

- When it applies
- The protocol
- Collect, then gate once
- Falling back to sequential

Load this only when the plan header names more than one independent group. A plan
construct: `fast` has no groups and launches no subagent.

## When it applies

When the next pending tasks belong to different independent `[P]` groups (the plan
header's "Implementation groups"), execute the groups concurrently, one
`sdd-code-implementer` subagent per group. Tasks within the *same* group still execute in
written order inside that group's subagent.

## The protocol

1. **Task 0 always runs alone first.** Branch preparation is sequential; no
   group subagent is launched until Task 0 is `[X]` and the branch re-check
   `SKILL.md` Step 2 runs after it has passed.

2. **One subagent per group, launched in the same response.** For each group,
   extract from plan.md the complete text of every pending task in that group
   (all `[P]` tasks, in written order) plus the group's <component>. Then issue
   the subagent invocations for all groups in one message (parallel calls, one
   per group) using the dedicated `sdd-code-implementer` subagent — the same agent
   in both opencode (`subagent_type: "sdd-code-implementer"`) and Claude Code. Give
   each subagent a self-contained prompt containing:
   - the story id and the absolute path to `work/active/spec-<number>/`
   - the group's <component> and the full text of its pending tasks, verbatim —
     each one fixes what may not be invented (paths, signatures, ports, error
     classes, field names, cases, expected outputs) and leaves the bodies open
   - the story's build mode and the resolved verification command for the group:
     the `TESTS.module` port in `tdd`, the `VERIFY.run` port in `evidence`
   - the conventions to respect: `.agents/profile.yaml`, plus the conventions and
     testing docs **resolved from `DOCS_ARCHITECTURE`** and passed as real paths
     (e.g. `docs/architecture/conventions.md`) — the subagent starts cold and cannot
     resolve a profile key you only named
   - the **resolved** `IDENTIFIER_LANGUAGE` (profile, language block), stated as a
     value and not as a key name — it governs the identifiers, comments and test
     names the subagent writes, and a subagent that has to guess it writes the
     language of its own prompt instead
   The `sdd-code-implementer` subagent's own prompt already encodes the execution
   contract (TDD red→green, stop at first failure, own-files-only, never touch
   plan.md) and its structured report format — do not repeat it, just supply the
   inputs above and read the report it returns.

## Collect, then gate once

3. **Collect, then gate once.** When a subagent returns:
   - a subagent reporting a failure, or a verification it could not turn green, is
     never accepted: inspect the reported error, fix it, and re-run that group's
     command before continuing
   - a subagent reporting green is taken at its word **here** and gated at Step 3.1,
     where `TESTS.full` re-runs everything every group wrote in a single pass.
     Re-running each group's own suite now, minutes before running its superset, buys
     no coverage
   - if `TESTS.full` is unbound — Step 3.1 degrades to `TESTS.module` per module, so
     there is no superset run — re-run each group's command yourself as it returns
   - mark the group's tasks `[X]` in plan.md (the subagent never writes plan.md, so
     concurrent `[X]` edits are impossible)

## Falling back to sequential

4. **Fall back to sequential.** If any subagent reports that it had to touch a
   file another group already modified, stop the parallel batch, resolve the
   conflict, and continue the remaining groups sequentially — the plan's
   grouping was wrong.

