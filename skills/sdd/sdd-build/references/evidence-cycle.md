# The `evidence` cycle — baselines and verbatim output

Load this only in `build_mode: evidence`. It replaces the red-first step of the `tdd`
cycle; everything else about groups, markers and the close is unchanged.

The group's cycle runs forward instead of red-first: run the
group's **baselines** once before touching anything, then apply each task's change and
run its `VERIFY` command against the **verbatim** expected output the plan wrote down.
Two rules carry the weight TDD's red step normally carries, and neither is optional:

- Tasks that modify something already covered must show their check green *before* the
  change. A baseline that starts red is a stop, not a task to push through — you cannot
  attribute a later red to your work. A task creating a new file has nothing to
  baseline; skip it there.
- Matching the expected output means matching it. A command that "ran fine" but
  printed something the plan didn't predict is a failed verification, and it goes to
  the same table below as a failing test.

In `fast` there are no tasks: the "task" is the single criterion, its baseline is the
`**Check:**` command of `## Change Surface` run before the change, and the expected output
is what that check must print once the criterion holds.

The close runs `VERIFY.full` (or `VERIFY.run` per deliverable when `full` is unbound), and
every `## AC Coverage` line names the command that proves it.
