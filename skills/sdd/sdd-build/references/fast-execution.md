# The `fast` tier — building from `spec.md`

## Contents

- What replaces the plan
- Executing the criterion
- The two tier stops
- Resuming

Load this only when `spec.md` carries `tier: fast`.

## What replaces the plan

No `plan.md`, no Task 0, no `[X]`, no traceability table, no File Tree, no groups — the
tier omits the stage that writes them, and this skill never invents them. What stands in
their place is in `spec.md`:

- the **single acceptance criterion** — the whole scope of work;
- `## Change Surface` — `**Confined to:**` (the paths and symbols the change may touch)
  and `**Check:**` (the command that closes the criterion).

The branch is gated by the `Requires` row alone: with no Task 0 to confirm it mid-flight,
that row is the whole gate.

## Executing the criterion

The tier has no tasks,
so there is no `[X]` to append, no implicit group, no `[P]` group and no
`sdd-code-implementer` subagent to launch — a `[P]` group is a plan concept, and inventing
a task list to fill the gap is precisely the failure this paragraph exists to prevent. The
execution unit is the single criterion: apply the change `## Change Surface` confines,
run its declared check, and hand the result to Step 3, which is where the tier closes.
The cycle above still governs *how* you verify — red-first in `tdd`, or baselines and
verbatim expected output in `evidence` — because that is the `build_mode` axis and the
tier does not touch it.

## The two tier stops

The tier was inferred from the input, not measured against the repository, and the build is
the first place the real surface becomes visible. So both of these are **stops**, never
reasons to widen the scope:

| Stop | What to do |
|---|---|
| The change needs a file or symbol outside `## Change Surface` | Report the surface and the file that overflowed it. Don't widen the surface, don't touch `spec.md` |
| A second acceptance criterion turns out to be necessary | Report it. This skill may not add, split or reword an AC |

The way back, for both: `/sdd-route` raises the tier, and the passes that tier declares
then run — `/sdd-ready` for the survey and the clarification, then `/sdd-design` for `full`.

## Resuming

The tier writes no tasks, so there is no
`[X]` and no "first pending task" to compute: the unit of work is the criterion, and
resuming means re-running the build against it. Re-run the check from `## Change Surface`
— if it is green the story was already closed and the `## AC Coverage` line in `spec.md`
proves it; if it is red, the criterion is unfinished whatever the code looks like. The
line is written only once the check is green, so a run interrupted before that leaves no
trace to clean up and none to trust. This is also why the section is never written with a
`✗`: in `fast` it is a close, not a progress report.
