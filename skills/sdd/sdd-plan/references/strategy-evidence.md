# Strategy — `build_mode: evidence` (either tier)

## Contents

- Order: what validates what
- Tasks: one per run of the check
- Coverage: every AC closed by a command

No design artifacts exist in this mode. The tasks follow
`<STACK_REFS>/references/task-structure-evidence-template.md`.

## Order: what validates what

There is no sequence diagram. The order comes from the dependencies between the
deliverables themselves, and the rule is: **whatever other artifacts are validated
against comes first.** A catalog before the file that declares entries against it; a
schema before the documents it validates; a template before the skill that cites it.

Derive them from `context.md`'s inventory and from the ACs, and write the ordered list
down before any task. Getting this backwards produces a plan whose middle tasks fail
their own check for a reason that has nothing to do with their content.

Independent groups work the same as below: two deliverables with no validation
relationship between them can be `[P]`.


## Tasks: one per run of the check

One task per **run of the check**, in the order fixed in the order section, following
`<STACK_REFS>/references/task-structure-evidence-template.md` (the generic pack
carries it; a specific pack may override it). Deliverables the same command validates
in one pass share a task — three entries in one catalog is one task, not three. Each
task fixes the deliverable's shape (the sections, keys and values the check reads,
verbatim) and closes with the `VERIFY.run` command and its **verbatim** expected
output.

The template's rules are binding, not stylistic: a check that cannot fail is not a
check, a modification of something already covered opens with a baseline run, and a
task verified only by "the reviewer reads it" does not belong in this mode.

Write no final "run the checks" task: `/sdd-build` closes the run with `VERIFY.full`
(or `VERIFY.run` per deliverable when `full` is unbound). Then skip the rest of this
phase.

## Coverage: every AC closed by a command

In place of the contract checks of the `tdd` strategy: **every task names a `VERIFY`
command and its verbatim expected output**, and every AC in the traceability table is
closed by at least one of those commands. An AC whose only "verification" is a human
reading the result is not covered — stop and ask, the same as an unmapped AC.

At `tier: standard` in this mode, no `[P]` groups: the tasks are one sequence.
