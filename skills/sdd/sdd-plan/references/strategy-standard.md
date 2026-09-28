# Strategy — `tier: standard`, `build_mode: tdd`

## Contents

- Order: the dependency edges
- Tasks: atomic and flat

No design stage ran: there is no `design.md`, no contract, no sequence diagram and no
data model. `context.md` is what the plan reads instead. (In `evidence` at this tier,
use `strategy-evidence.md`, without `[P]` groups.)

## Order: the dependency edges

There is no sequence diagram. The order comes from the edges between the tasks themselves:
a task that produces what another consumes goes first, and the plan is the topological
order of those edges. Write each edge down when you fix the order — "B reads what A
writes" — because that edge is the only reason a `standard` task exists at all (the tasks
section). Getting this backwards produces a plan whose second task cannot run yet, for a
reason that has nothing to do with its content.


## Tasks: atomic and flat

The breakdown is **atomic and flat**: one task per dependency edge, in the order those
edges impose (Order, above), never one task per layer and never a task that exists only
to hold a file. Each task carries the three things every task carries — its **Files**, its
**contract** and its **verification** with the expected output.

**This replaces the slicing of the two sections below; it keeps their task shape.** There is
no sequence diagram to derive per-<component> behavior slices from, so a `standard` task is
whatever the dependency edge needs, written in the format the mode dictates: signatures
and invariants with a `TEST_FRAMEWORK` cycle of failing cases in `tdd`, the deliverable's
shape with a `VERIFY.run` command and its verbatim expected output in `evidence`.

**No `[P]` groups.** A `standard` change is circumscribed to one component, so its tasks are
a sequence: two tasks that share nothing are still ordered by the dependency edge that put
them in the plan, and a `[P]` marker would claim a parallelism the tier's own scope does not
have. The independence scan is skipped (Order, above), and `/sdd-build` runs the tasks
in the order written.

Task 0, the `### AC → Task traceability` table, the `### File Tree`, `docs/file-tree.md` and
the refusal to save a plan with an uncovered AC are unchanged: the tier moves the plan's
granularity, never its contract.

The contract checks of the `tdd` strategy do not apply: there is no contract and no
data model to check against. The traceability check carries the whole verification.
